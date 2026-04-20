/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview LegacyAgentSession backed by the existing Gemini client +
 * scheduler loop, adapted to the merged AgentProtocol / AgentSession surface.
 */
import { GeminiEventType } from '../core/turn.js';
import { Scheduler } from '../scheduler/scheduler.js';
import { recordToolCallInteractions } from '../code_assist/telemetry.js';
import { ToolErrorType, isFatalToolError } from '../tools/tool-error.js';
import { debugLogger } from '../utils/debugLogger.js';
import { buildToolResponseData, contentPartsToGeminiParts, geminiPartsToContentParts, } from './content-utils.js';
import { populateToolDisplay } from './tool-display-utils.js';
import { AgentSession } from './agent-session.js';
import { createTranslationState, mapFinishReason, translateEvent, } from './event-translator.js';
function isAbortLikeError(err) {
    return err instanceof Error && err.name === 'AbortError';
}
const schedulerMap = new WeakMap();
export class LegacyAgentProtocol {
    _events = [];
    _subscribers = new Set();
    _translationState;
    _agentEndEmitted = false;
    _activeStreamId;
    _abortController = new AbortController();
    _nextStreamIdOverride;
    _client;
    _scheduler;
    _config;
    _promptId;
    constructor(deps) {
        this._translationState = createTranslationState(deps.streamId);
        this._nextStreamIdOverride = deps.streamId;
        this._config = deps.config;
        this._client = deps.client ?? deps.config.getGeminiClient();
        this._promptId = deps.promptId ?? deps.config.promptId ?? '';
        if (deps.scheduler) {
            this._scheduler = deps.scheduler;
        }
        else {
            let scheduler = schedulerMap.get(deps.config);
            if (!scheduler) {
                const sessionId = deps.config.getSessionId();
                const schedulerId = `legacy-agent-scheduler-${sessionId}`;
                scheduler = new Scheduler({
                    context: deps.config,
                    schedulerId,
                    getPreferredEditor: deps.getPreferredEditor ?? (() => undefined),
                });
                schedulerMap.set(deps.config, scheduler);
            }
            this._scheduler = scheduler;
        }
    }
    get events() {
        return this._events;
    }
    subscribe(callback) {
        this._subscribers.add(callback);
        return () => {
            this._subscribers.delete(callback);
        };
    }
    async send(payload) {
        const message = 'message' in payload ? payload.message : undefined;
        if (!message) {
            throw new Error('LegacyAgentSession.send() only supports message sends for the moment.');
        }
        if (this._activeStreamId) {
            // TODO: Interactive may eventually allow selected in-stream sends such as
            // updates or elicitation responses. Keep rejecting all concurrent sends
            // here until we define those correlation semantics.
            throw new Error('LegacyAgentSession.send() cannot be called while a stream is active.');
        }
        this._beginNewStream();
        const streamId = this._translationState.streamId;
        const parts = contentPartsToGeminiParts(message.content);
        const userMessage = this._makeUserMessageEvent(message.content, message.displayContent, payload._meta);
        this._emit([userMessage]);
        this._scheduleRunLoop(parts, message.displayContent);
        return { streamId };
    }
    async abort() {
        this._abortController.abort();
    }
    _scheduleRunLoop(initialParts, displayContent) {
        // Use a macrotask so send() resolves with the streamId before agent_start
        // is emitted and consumers can attach to the stream without racing startup.
        setTimeout(() => {
            void this._runLoopInBackground(initialParts, displayContent);
        }, 0);
    }
    async _runLoopInBackground(initialParts, displayContent) {
        this._ensureAgentStart();
        try {
            await this._runLoop(initialParts, displayContent);
        }
        catch (err) {
            if (this._abortController.signal.aborted || isAbortLikeError(err)) {
                this._ensureAgentEnd('aborted');
            }
            else {
                this._emitErrorAndAgentEnd(err);
            }
            this._clearActiveStream();
        }
    }
    async _runLoop(initialParts, initialDisplayContent) {
        let currentParts = initialParts;
        let currentDisplayContent = initialDisplayContent;
        let turnCount = 0;
        const maxTurns = this._config.getMaxSessionTurns();
        while (true) {
            turnCount++;
            if (maxTurns >= 0 && turnCount > maxTurns) {
                this._finishStream('max_turns', {
                    code: 'MAX_TURNS_EXCEEDED',
                    maxTurns,
                    turnCount: turnCount - 1,
                });
                return;
            }
            const toolCallRequests = [];
            const responseStream = this._client.sendMessageStream(currentParts, this._abortController.signal, this._promptId, undefined, false, currentDisplayContent);
            currentDisplayContent = undefined;
            for await (const event of responseStream) {
                if (this._abortController.signal.aborted) {
                    this._finishStream('aborted');
                    return;
                }
                if (event.type === GeminiEventType.ToolCallRequest) {
                    toolCallRequests.push(event.value);
                }
                this._emit(translateEvent(event, this._translationState));
                switch (event.type) {
                    case GeminiEventType.Error:
                    case GeminiEventType.InvalidStream:
                    case GeminiEventType.ContextWindowWillOverflow:
                        this._finishStream('failed');
                        return;
                    case GeminiEventType.Finished:
                        if (toolCallRequests.length === 0) {
                            this._finishStream(mapFinishReason(event.value.reason));
                            return;
                        }
                        break;
                    case GeminiEventType.AgentExecutionStopped:
                    case GeminiEventType.UserCancelled:
                    case GeminiEventType.MaxSessionTurns:
                        this._clearActiveStream();
                        return;
                    default:
                        break;
                }
            }
            if (this._abortController.signal.aborted) {
                this._finishStream('aborted');
                return;
            }
            if (toolCallRequests.length === 0) {
                this._finishStream('completed');
                return;
            }
            const completedToolCalls = await this._scheduler.schedule(toolCallRequests, this._abortController.signal);
            if (this._abortController.signal.aborted) {
                this._finishStream('aborted');
                return;
            }
            const toolResponseParts = [];
            for (const tc of completedToolCalls) {
                const response = tc.response;
                const request = tc.request;
                const content = response.error
                    ? [{ type: 'text', text: response.error.message }]
                    : geminiPartsToContentParts(response.responseParts);
                const display = populateToolDisplay({
                    name: request.name,
                    invocation: 'invocation' in tc ? tc.invocation : undefined,
                    resultDisplay: response.resultDisplay,
                    displayName: 'tool' in tc ? tc.tool?.displayName : undefined,
                });
                const data = buildToolResponseData(response);
                this._emit([
                    this._makeToolResponseEvent({
                        requestId: request.callId,
                        name: request.name,
                        content,
                        isError: response.error !== undefined,
                        ...(display ? { display } : {}),
                        ...(data ? { data } : {}),
                    }),
                ]);
                if (response.responseParts) {
                    toolResponseParts.push(...response.responseParts);
                }
            }
            try {
                const currentModel = this._client.getCurrentSequenceModel() ?? this._config.getModel();
                this._client
                    .getChat()
                    .recordCompletedToolCalls(currentModel, completedToolCalls);
                await recordToolCallInteractions(this._config, completedToolCalls);
            }
            catch (error) {
                debugLogger.error(`Error recording completed tool call information: ${error}`);
            }
            const stopTool = completedToolCalls.find((tc) => tc.response.errorType === ToolErrorType.STOP_EXECUTION &&
                tc.response.error !== undefined);
            if (stopTool) {
                this._finishStream('completed');
                return;
            }
            const fatalTool = completedToolCalls.find((tc) => isFatalToolError(tc.response.errorType));
            if (fatalTool) {
                this._finishStream('failed');
                return;
            }
            currentParts = toolResponseParts;
        }
    }
    _emit(events) {
        if (events.length === 0) {
            return;
        }
        const subscribers = [...this._subscribers];
        for (const event of events) {
            if (!this._events.some((existing) => existing.id === event.id)) {
                this._events.push(event);
            }
            if (event.type === 'agent_end') {
                this._agentEndEmitted = true;
            }
            for (const subscriber of subscribers) {
                subscriber(event);
            }
        }
    }
    _clearActiveStream() {
        this._activeStreamId = undefined;
    }
    _beginNewStream() {
        this._translationState = createTranslationState(this._nextStreamIdOverride);
        this._nextStreamIdOverride = undefined;
        this._abortController = new AbortController();
        this._agentEndEmitted = false;
        this._activeStreamId = this._translationState.streamId;
    }
    _ensureAgentStart() {
        if (!this._translationState.streamStartEmitted) {
            this._translationState.streamStartEmitted = true;
            this._emit([this._makeAgentStartEvent()]);
        }
    }
    _ensureAgentEnd(reason = 'completed') {
        if (!this._agentEndEmitted && this._translationState.streamStartEmitted) {
            this._agentEndEmitted = true;
            this._emit([this._makeAgentEndEvent(reason)]);
        }
    }
    _finishStream(reason, data) {
        if (data && !this._agentEndEmitted) {
            this._emit([this._makeAgentEndEvent(reason, data)]);
        }
        else {
            this._ensureAgentEnd(reason);
        }
        this._clearActiveStream();
    }
    /**
     * Preserve error identity fields in _meta so downstream consumers can
     * reconstruct fatal CLI errors.
     */
    _emitErrorAndAgentEnd(err) {
        const message = err instanceof Error ? err.message : String(err);
        this._ensureAgentStart();
        const meta = {};
        if (err instanceof Error) {
            meta['errorName'] = err.constructor.name;
            if ('exitCode' in err && typeof err.exitCode === 'number') {
                meta['exitCode'] = err.exitCode;
            }
            if ('code' in err) {
                meta['code'] = err.code;
            }
            if ('status' in err) {
                meta['status'] = err.status;
            }
        }
        this._emit([
            this._makeErrorEvent({
                status: 'INTERNAL',
                message,
                fatal: true,
                ...(Object.keys(meta).length > 0 ? { _meta: meta } : {}),
            }),
        ]);
        this._ensureAgentEnd('failed');
    }
    _nextEventFields() {
        return {
            id: `${this._translationState.streamId}-${this._translationState.eventCounter++}`,
            timestamp: new Date().toISOString(),
            streamId: this._translationState.streamId,
        };
    }
    _makeUserMessageEvent(content, displayContent, meta) {
        const eventContent = displayContent
            ? [{ type: 'text', text: displayContent }]
            : content;
        const event = {
            ...this._nextEventFields(),
            type: 'message',
            role: 'user',
            content: eventContent,
            ...(meta ? { _meta: meta } : {}),
        };
        return event;
    }
    _makeToolResponseEvent(payload) {
        const event = {
            ...this._nextEventFields(),
            type: 'tool_response',
            ...payload,
        };
        return event;
    }
    _makeAgentStartEvent() {
        const event = {
            ...this._nextEventFields(),
            type: 'agent_start',
        };
        return event;
    }
    _makeAgentEndEvent(reason, data) {
        const event = {
            ...this._nextEventFields(),
            type: 'agent_end',
            reason,
            ...(data ? { data } : {}),
        };
        return event;
    }
    _makeErrorEvent(payload) {
        const event = {
            ...this._nextEventFields(),
            type: 'error',
            ...payload,
        };
        return event;
    }
}
export class LegacyAgentSession extends AgentSession {
    constructor(deps) {
        super(new LegacyAgentProtocol(deps));
    }
}
//# sourceMappingURL=legacy-agent-session.js.map