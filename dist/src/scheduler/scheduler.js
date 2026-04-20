/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { SchedulerStateManager } from './state-manager.js';
import { resolveConfirmation } from './confirmation.js';
import { checkPolicy, updatePolicy, getPolicyDenialError } from './policy.js';
import { evaluateBeforeToolHook } from './hook-utils.js';
import { ToolExecutor } from './tool-executor.js';
import { ToolModificationHandler } from './tool-modifier.js';
import { CoreToolCallStatus, } from './types.js';
import { ToolErrorType } from '../tools/tool-error.js';
import { UPDATE_TOPIC_TOOL_NAME } from '../tools/tool-names.js';
import { PolicyDecision } from '../policy/types.js';
import { ToolConfirmationOutcome, } from '../tools/tools.js';
import { getToolSuggestion } from '../utils/tool-utils.js';
import { runInDevTraceSpan } from '../telemetry/trace.js';
import { logToolCall } from '../telemetry/loggers.js';
import { ToolCallEvent } from '../telemetry/types.js';
import { MessageBusType, } from '../confirmation-bus/types.js';
import { runWithToolCallContext } from '../utils/toolCallContext.js';
import { coreEvents, CoreEvent, } from '../utils/events.js';
import { GeminiCliOperation } from '../telemetry/constants.js';
const createErrorResponse = (request, error, errorType) => ({
    callId: request.callId,
    error,
    responseParts: [
        {
            functionResponse: {
                id: request.callId,
                name: request.originalRequestName ?? request.name,
                response: { error: error.message },
            },
        },
    ],
    resultDisplay: error.message,
    errorType,
    contentLength: error.message.length,
});
/**
 * Event-Driven Orchestrator for Tool Execution.
 * Coordinates execution via state updates and event listening.
 */
export class Scheduler {
    disposeController = new AbortController();
    state;
    executor;
    modifier;
    config;
    context;
    messageBus;
    getPreferredEditor;
    schedulerId;
    subagent;
    parentCallId;
    onWaitingForConfirmation;
    isProcessing = false;
    isCancelling = false;
    requestQueue = [];
    constructor(options) {
        this.context = options.context;
        this.config = this.context.config;
        this.messageBus = options.messageBus ?? this.context.messageBus;
        this.getPreferredEditor = options.getPreferredEditor;
        this.schedulerId = options.schedulerId;
        this.subagent = options.subagent;
        this.parentCallId = options.parentCallId;
        this.onWaitingForConfirmation = options.onWaitingForConfirmation;
        this.state = new SchedulerStateManager(this.messageBus, this.schedulerId, (call) => logToolCall(this.config, new ToolCallEvent(call)));
        this.executor = new ToolExecutor(this.context);
        this.modifier = new ToolModificationHandler();
        this.setupMessageBusListener(this.messageBus);
        coreEvents.on(CoreEvent.McpProgress, this.handleMcpProgress);
    }
    dispose() {
        coreEvents.off(CoreEvent.McpProgress, this.handleMcpProgress);
        this.disposeController.abort();
    }
    handleMcpProgress = (payload) => {
        const { callId } = payload;
        const call = this.state.getToolCall(callId);
        if (!call || call.status !== CoreToolCallStatus.Executing) {
            return;
        }
        const validTotal = payload.total !== undefined &&
            Number.isFinite(payload.total) &&
            payload.total > 0
            ? payload.total
            : undefined;
        this.state.updateStatus(callId, CoreToolCallStatus.Executing, {
            progressMessage: payload.message,
            progressPercent: validTotal
                ? Math.min(100, (payload.progress / validTotal) * 100)
                : undefined,
            progress: payload.progress,
            progressTotal: validTotal,
        });
    };
    handleToolConfirmationRequest = async (request) => {
        await this.messageBus.publish({
            type: MessageBusType.TOOL_CONFIRMATION_RESPONSE,
            correlationId: request.correlationId,
            confirmed: false,
            requiresUserConfirmation: true,
        });
    };
    setupMessageBusListener(messageBus) {
        // TODO: Optimize policy checks. Currently, tools check policy via
        // MessageBus even though the Scheduler already checked it.
        messageBus.subscribe(MessageBusType.TOOL_CONFIRMATION_REQUEST, this.handleToolConfirmationRequest, { signal: this.disposeController.signal });
    }
    /**
     * Schedules a batch of tool calls.
     * @returns A promise that resolves with the results of the completed batch.
     */
    async schedule(request, signal) {
        return runInDevTraceSpan({
            operation: GeminiCliOperation.ScheduleToolCalls,
            logPrompts: this.context.config.getTelemetryLogPromptsEnabled(),
            sessionId: this.context.config.getSessionId(),
        }, async ({ metadata: spanMetadata }) => {
            const requests = Array.isArray(request) ? request : [request];
            spanMetadata.input = requests;
            let toolCallResponse = [];
            if (this.isProcessing || this.state.isActive) {
                toolCallResponse = await this._enqueueRequest(requests, signal);
            }
            else {
                toolCallResponse = await this._startBatch(requests, signal);
            }
            spanMetadata.output = toolCallResponse;
            return toolCallResponse;
        });
    }
    _enqueueRequest(requests, signal) {
        return new Promise((resolve, reject) => {
            const abortHandler = () => {
                const index = this.requestQueue.findIndex((item) => item.requests === requests);
                if (index > -1) {
                    this.requestQueue.splice(index, 1);
                    reject(new Error('Tool call cancelled while in queue.'));
                }
            };
            if (signal.aborted) {
                reject(new Error('Operation cancelled'));
                return;
            }
            signal.addEventListener('abort', abortHandler, { once: true });
            this.requestQueue.push({
                requests,
                signal,
                resolve: (results) => {
                    signal.removeEventListener('abort', abortHandler);
                    resolve(results);
                },
                reject: (err) => {
                    signal.removeEventListener('abort', abortHandler);
                    reject(err);
                },
            });
        });
    }
    cancelAll() {
        if (this.isCancelling)
            return;
        this.isCancelling = true;
        // Clear scheduler request queue
        while (this.requestQueue.length > 0) {
            const next = this.requestQueue.shift();
            next?.reject(new Error('Operation cancelled by user'));
        }
        // Cancel active calls
        const activeCalls = this.state.allActiveCalls;
        for (const activeCall of activeCalls) {
            if (!this.isTerminal(activeCall.status)) {
                this.state.updateStatus(activeCall.request.callId, CoreToolCallStatus.Cancelled, 'Operation cancelled by user');
            }
        }
        // Clear queue
        this.state.cancelAllQueued('Operation cancelled by user');
    }
    get completedCalls() {
        return this.state.completedBatch;
    }
    isTerminal(status) {
        return (status === CoreToolCallStatus.Success ||
            status === CoreToolCallStatus.Error ||
            status === CoreToolCallStatus.Cancelled);
    }
    // --- Phase 1: Ingestion & Resolution ---
    async _startBatch(requests, signal) {
        this.isProcessing = true;
        this.isCancelling = false;
        this.state.clearBatch();
        const currentApprovalMode = this.config.getApprovalMode();
        // Sort requests to ensure Topic changes happen before actions in the same batch.
        const sortedRequests = [...requests].sort((a, b) => {
            if (a.name === UPDATE_TOPIC_TOOL_NAME)
                return -1;
            if (b.name === UPDATE_TOPIC_TOOL_NAME)
                return 1;
            return 0;
        });
        try {
            const toolRegistry = this.context.toolRegistry;
            const newCalls = sortedRequests.map((request) => {
                const enrichedRequest = {
                    ...request,
                    schedulerId: this.schedulerId,
                    parentCallId: this.parentCallId,
                };
                const tool = toolRegistry.getTool(request.name);
                if (!tool) {
                    return {
                        ...this._createToolNotFoundErroredToolCall(enrichedRequest, toolRegistry.getAllToolNames()),
                        approvalMode: currentApprovalMode,
                    };
                }
                return this._validateAndCreateToolCall(enrichedRequest, tool, currentApprovalMode);
            });
            this.state.enqueue(newCalls);
            await this._processQueue(signal);
            return this.state.completedBatch;
        }
        finally {
            this.isProcessing = false;
            this.state.clearBatch();
            this._processNextInRequestQueue();
        }
    }
    _createToolNotFoundErroredToolCall(request, toolNames) {
        const suggestion = getToolSuggestion(request.name, toolNames);
        return {
            status: CoreToolCallStatus.Error,
            request,
            response: createErrorResponse(request, new Error(`Tool "${request.name}" not found.${suggestion}`), ToolErrorType.TOOL_NOT_REGISTERED),
            durationMs: 0,
            schedulerId: this.schedulerId,
        };
    }
    _validateAndCreateToolCall(request, tool, approvalMode) {
        return runWithToolCallContext({
            callId: request.callId,
            schedulerId: this.schedulerId,
            parentCallId: this.parentCallId,
            subagent: this.subagent,
        }, () => {
            try {
                const invocation = tool.build(request.args);
                return {
                    status: CoreToolCallStatus.Validating,
                    request,
                    tool,
                    invocation,
                    startTime: Date.now(),
                    schedulerId: this.schedulerId,
                    approvalMode,
                };
            }
            catch (e) {
                return {
                    status: CoreToolCallStatus.Error,
                    request,
                    tool,
                    response: createErrorResponse(request, e instanceof Error ? e : new Error(String(e)), ToolErrorType.INVALID_TOOL_PARAMS),
                    durationMs: 0,
                    schedulerId: this.schedulerId,
                    approvalMode,
                };
            }
        });
    }
    // --- Phase 2: Processing Loop ---
    async _processQueue(signal) {
        while (this.state.queueLength > 0 || this.state.isActive) {
            const shouldContinue = await this._processNextItem(signal);
            if (!shouldContinue)
                break;
        }
    }
    /**
     * Processes the next item in the queue.
     * @returns true if the loop should continue, false if it should terminate.
     */
    async _processNextItem(signal) {
        if (signal.aborted || this.isCancelling) {
            this.state.cancelAllQueued('Operation cancelled');
            return false;
        }
        const initialStatuses = new Map(this.state.allActiveCalls.map((c) => [c.request.callId, c.status]));
        if (!this.state.isActive) {
            const next = this.state.dequeue();
            if (!next)
                return false;
            if (next.status === CoreToolCallStatus.Error) {
                this.state.updateStatus(next.request.callId, CoreToolCallStatus.Error, next.response);
                this.state.finalizeCall(next.request.callId);
                return true;
            }
            // If the first tool is parallelizable, batch all contiguous parallelizable tools.
            if (this._isParallelizable(next.request)) {
                while (this.state.queueLength > 0) {
                    const peeked = this.state.peekQueue();
                    if (peeked && this._isParallelizable(peeked.request)) {
                        this.state.dequeue();
                    }
                    else {
                        break;
                    }
                }
            }
        }
        // Now we have one or more active calls. Move them through the lifecycle
        // as much as possible in this iteration.
        // 1. Process all 'validating' calls (Policy & Confirmation)
        let activeCalls = this.state.allActiveCalls;
        const validatingCalls = activeCalls.filter((c) => c.status === CoreToolCallStatus.Validating);
        if (validatingCalls.length > 0) {
            await Promise.all(validatingCalls.map((c) => this._processValidatingCall(c, signal)));
        }
        // 2. Execute scheduled calls
        // Refresh activeCalls as status might have changed to 'scheduled'
        activeCalls = this.state.allActiveCalls;
        const scheduledCalls = activeCalls.filter((c) => c.status === CoreToolCallStatus.Scheduled);
        // We only execute if ALL active calls are in a ready state (scheduled or terminal)
        const allReady = activeCalls.every((c) => c.status === CoreToolCallStatus.Scheduled || this.isTerminal(c.status));
        let madeProgress = false;
        if (allReady && scheduledCalls.length > 0) {
            const execResults = await Promise.all(scheduledCalls.map((c) => this._execute(c, signal)));
            madeProgress = execResults.some((res) => res);
        }
        // 3. Finalize terminal calls
        activeCalls = this.state.allActiveCalls;
        for (const call of activeCalls) {
            if (this.isTerminal(call.status)) {
                this.state.finalizeCall(call.request.callId);
                madeProgress = true;
            }
        }
        // Check if any calls changed status during this iteration (excluding terminal finalization)
        const currentStatuses = new Map(activeCalls.map((c) => [c.request.callId, c.status]));
        const anyStatusChanged = Array.from(initialStatuses.entries()).some(([id, status]) => currentStatuses.get(id) !== status);
        if (madeProgress || anyStatusChanged) {
            return true;
        }
        // If we have active calls but NONE of them progressed, check if we are waiting for external events.
        // States that are 'waiting' from the loop's perspective: awaiting_approval, executing.
        const isWaitingForExternal = activeCalls.some((c) => c.status === CoreToolCallStatus.AwaitingApproval ||
            c.status === CoreToolCallStatus.Executing);
        if (isWaitingForExternal && this.state.isActive) {
            // Yield to the event loop to allow external events (tool completion, user input) to progress.
            await new Promise((resolve) => queueMicrotask(() => resolve(true)));
            return true;
        }
        // If we are here, we have active calls (likely Validating or Scheduled) but none progressed.
        // This is a stuck state.
        return false;
    }
    _isParallelizable(request) {
        if (request.args) {
            const wait = request.args['wait_for_previous'];
            if (typeof wait === 'boolean') {
                return !wait;
            }
        }
        // Default to parallel if the flag is omitted.
        return true;
    }
    async _processValidatingCall(active, signal) {
        try {
            await this._processToolCall(active, signal);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            // If the signal aborted while we were waiting on something, treat as
            // cancelled. Otherwise, it's a genuine unhandled system exception.
            if (signal.aborted || err.name === 'AbortError') {
                this.state.updateStatus(active.request.callId, CoreToolCallStatus.Cancelled, 'Operation cancelled');
            }
            else {
                this.state.updateStatus(active.request.callId, CoreToolCallStatus.Error, createErrorResponse(active.request, err, ToolErrorType.UNHANDLED_EXCEPTION));
            }
        }
    }
    // --- Phase 3: Single Call Orchestration ---
    async _processToolCall(toolCall, signal) {
        const callId = toolCall.request.callId;
        // 1. Hook Check (BeforeTool)
        const hookResult = await evaluateBeforeToolHook(this.config, toolCall.tool, toolCall.request, toolCall.invocation);
        if (hookResult.status === 'error') {
            this.state.updateStatus(callId, CoreToolCallStatus.Error, createErrorResponse(toolCall.request, hookResult.error, hookResult.errorType));
            return;
        }
        const { hookDecision, hookSystemMessage, modifiedArgs, newInvocation } = hookResult;
        if (modifiedArgs && newInvocation) {
            toolCall.request.args = modifiedArgs;
            toolCall.request.inputModifiedByHook = true;
            toolCall.invocation = newInvocation;
        }
        // 2. Policy & Security
        const { decision: policyDecision, rule } = await checkPolicy(toolCall, this.config, this.subagent);
        let decision = policyDecision;
        if (hookDecision === 'ask') {
            decision = PolicyDecision.ASK_USER;
        }
        if (decision === PolicyDecision.DENY) {
            const { errorMessage, errorType } = getPolicyDenialError(this.config, rule);
            this.state.updateStatus(callId, CoreToolCallStatus.Error, createErrorResponse(toolCall.request, new Error(errorMessage), errorType));
            return;
        }
        // User Confirmation Loop
        let outcome = ToolConfirmationOutcome.ProceedOnce;
        let lastDetails;
        let cancelFeedback;
        if (decision === PolicyDecision.ASK_USER) {
            const result = await resolveConfirmation(toolCall, signal, {
                config: this.config,
                messageBus: this.messageBus,
                state: this.state,
                modifier: this.modifier,
                getPreferredEditor: this.getPreferredEditor,
                schedulerId: this.schedulerId,
                onWaitingForConfirmation: this.onWaitingForConfirmation,
                systemMessage: hookSystemMessage,
                forcedDecision: hookDecision === 'ask' ? 'ask_user' : undefined,
            });
            outcome = result.outcome;
            lastDetails = result.lastDetails;
            if (outcome === ToolConfirmationOutcome.Cancel &&
                result.payload &&
                'feedback' in result.payload &&
                typeof result.payload.feedback === 'string' &&
                result.payload.feedback.length > 0) {
                cancelFeedback = result.payload.feedback;
            }
        }
        this.state.setOutcome(callId, outcome);
        // Handle Policy Updates
        if (decision === PolicyDecision.ASK_USER && outcome) {
            await updatePolicy(toolCall.tool, outcome, lastDetails, this.context, this.messageBus, toolCall.invocation);
        }
        // Handle cancellation (cascades to entire batch)
        if (outcome === ToolConfirmationOutcome.Cancel) {
            const reason = cancelFeedback
                ? `User denied execution. Feedback: ${cancelFeedback}`
                : 'User denied execution.';
            this.state.updateStatus(callId, CoreToolCallStatus.Cancelled, reason);
            this.state.cancelAllQueued('User cancelled operation');
            return; // Skip execution
        }
        this.state.updateStatus(callId, CoreToolCallStatus.Scheduled);
    }
    // --- Sub-phase Handlers ---
    /**
     * Executes the tool and records the result. Returns true if a new tool call was added.
     */
    async _execute(toolCall, signal) {
        const callId = toolCall.request.callId;
        if (signal.aborted) {
            this.state.updateStatus(callId, CoreToolCallStatus.Cancelled, 'Operation cancelled');
            return false;
        }
        this.state.updateStatus(callId, CoreToolCallStatus.Executing);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        const activeCall = this.state.getToolCall(callId);
        const result = await runWithToolCallContext({
            callId: activeCall.request.callId,
            schedulerId: this.schedulerId,
            parentCallId: this.parentCallId,
            subagent: this.subagent,
        }, () => this.executor.execute({
            call: activeCall,
            signal,
            outputUpdateHandler: (id, out) => this.state.updateStatus(id, CoreToolCallStatus.Executing, {
                liveOutput: out,
            }),
            onUpdateToolCall: (updated) => {
                if (updated.status === CoreToolCallStatus.Executing &&
                    updated.pid) {
                    this.state.updateStatus(callId, CoreToolCallStatus.Executing, {
                        pid: updated.pid,
                    });
                }
            },
        }));
        if ((result.status === CoreToolCallStatus.Success ||
            result.status === CoreToolCallStatus.Error) &&
            result.tailToolCallRequest) {
            // Log the intermediate tool call before it gets replaced.
            const intermediateCall = {
                request: activeCall.request,
                tool: activeCall.tool,
                invocation: activeCall.invocation,
                status: result.status,
                response: result.response,
                durationMs: activeCall.startTime
                    ? Date.now() - activeCall.startTime
                    : undefined,
                outcome: activeCall.outcome,
                schedulerId: this.schedulerId,
            };
            logToolCall(this.config, new ToolCallEvent(intermediateCall));
            const tailRequest = result.tailToolCallRequest;
            const originalCallId = result.request.callId;
            const originalRequestName = result.request.originalRequestName || result.request.name;
            const newTool = this.context.toolRegistry.getTool(tailRequest.name);
            const newRequest = {
                callId: originalCallId,
                name: tailRequest.name,
                args: tailRequest.args,
                originalRequestName,
                originalRequestArgs: result.request.originalRequestArgs ?? result.request.args,
                isClientInitiated: result.request.isClientInitiated,
                prompt_id: result.request.prompt_id,
                schedulerId: this.schedulerId,
            };
            if (!newTool) {
                // Enqueue an errored tool call
                const errorCall = this._createToolNotFoundErroredToolCall(newRequest, this.context.toolRegistry.getAllToolNames());
                this.state.replaceActiveCallWithTailCall(callId, errorCall);
            }
            else {
                // Enqueue a validating tool call for the new tail tool
                const validatingCall = this._validateAndCreateToolCall(newRequest, newTool, activeCall.approvalMode ?? this.config.getApprovalMode());
                this.state.replaceActiveCallWithTailCall(callId, validatingCall);
            }
            // Loop continues, picking up the new tail call at the front of the queue.
            return true;
        }
        let isSandboxError = false;
        let sandboxDetailsStr = '';
        if (result.status === CoreToolCallStatus.Error &&
            result.response.errorType === 'sandbox_expansion_required') {
            isSandboxError = true;
            sandboxDetailsStr = result.response.error?.message || '';
        }
        if (isSandboxError) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
                const parsedError = JSON.parse(sandboxDetailsStr);
                const confirmationDetails = {
                    type: 'sandbox_expansion',
                    title: 'Sandbox Expansion Request',
                    command: String(activeCall.request.args['command'] ?? parsedError.rootCommand),
                    rootCommand: parsedError.rootCommand,
                    additionalPermissions: parsedError.additionalPermissions,
                };
                const correlationId = crypto.randomUUID();
                // Mutate the active call so resolveConfirmation generates the correct Sandbox Expansion details
                activeCall.request.args['additional_permissions'] =
                    parsedError.additionalPermissions;
                activeCall.invocation = activeCall.tool.build(activeCall.request.args);
                // CRITICAL: We must push the new args and invocation into the state manager
                // before calling resolveConfirmation, because resolveConfirmation fetches
                // the tool call directly from the state manager!
                this.state.updateArgs(callId, activeCall.request.args, activeCall.invocation);
                this.state.updateStatus(callId, CoreToolCallStatus.AwaitingApproval, {
                    confirmationDetails,
                    correlationId,
                });
                const validatingCall = {
                    ...activeCall,
                    status: CoreToolCallStatus.Validating,
                };
                const confResult = await resolveConfirmation(validatingCall, signal, {
                    config: this.config,
                    messageBus: this.messageBus,
                    state: this.state,
                    modifier: this.modifier,
                    getPreferredEditor: this.getPreferredEditor,
                    schedulerId: this.schedulerId,
                    onWaitingForConfirmation: this.onWaitingForConfirmation,
                });
                if (confResult.outcome === ToolConfirmationOutcome.Cancel) {
                    const errorResponse = { ...result.response };
                    errorResponse.llmContent =
                        'User cancelled sandbox expansion. The command failed with a sandbox denial. Shell output:\n' +
                            String(errorResponse.returnDisplay);
                    this.state.updateStatus(callId, CoreToolCallStatus.Error, errorResponse);
                    return false;
                }
                activeCall.request.args['additional_permissions'] =
                    parsedError.additionalPermissions;
                // Reset the output stream visual so it replaces the error text
                this.state.updateStatus(callId, CoreToolCallStatus.Executing, {
                    liveOutput: undefined,
                });
                // Call _execute synchronously and properly return its promise to loop internally!
                return await this._execute({
                    ...activeCall,
                    status: CoreToolCallStatus.Scheduled,
                }, signal);
            }
            catch {
                // Fallback to normal error handling if parsing/looping fails
            }
        }
        if (result.status === CoreToolCallStatus.Success) {
            this.state.updateStatus(callId, CoreToolCallStatus.Success, result.response);
        }
        else if (result.status === CoreToolCallStatus.Cancelled) {
            this.state.updateStatus(callId, CoreToolCallStatus.Cancelled, result.response);
        }
        else {
            this.state.updateStatus(callId, CoreToolCallStatus.Error, result.response);
        }
        return false;
    }
    _processNextInRequestQueue() {
        if (this.requestQueue.length > 0) {
            const next = this.requestQueue.shift();
            this.schedule(next.requests, next.signal)
                .then(next.resolve)
                .catch(next.reject);
        }
    }
}
//# sourceMappingURL=scheduler.js.map