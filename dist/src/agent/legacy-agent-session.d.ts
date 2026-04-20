/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { GeminiClient } from '../core/client.js';
import type { Config } from '../config/config.js';
import { Scheduler } from '../scheduler/scheduler.js';
import type { EditorType } from '../utils/editor.js';
import { AgentSession } from './agent-session.js';
import type { AgentEvent, AgentProtocol, AgentSend, Unsubscribe } from './types.js';
export interface LegacyAgentSessionDeps {
    config: Config;
    client?: GeminiClient;
    scheduler?: Scheduler;
    promptId?: string;
    streamId?: string;
    getPreferredEditor?: () => EditorType | undefined;
}
export declare class LegacyAgentProtocol implements AgentProtocol {
    private _events;
    private _subscribers;
    private _translationState;
    private _agentEndEmitted;
    private _activeStreamId?;
    private _abortController;
    private _nextStreamIdOverride?;
    private readonly _client;
    private readonly _scheduler;
    private readonly _config;
    private readonly _promptId;
    constructor(deps: LegacyAgentSessionDeps);
    get events(): readonly AgentEvent[];
    subscribe(callback: (event: AgentEvent) => void): Unsubscribe;
    send(payload: AgentSend): Promise<{
        streamId: string;
    }>;
    abort(): Promise<void>;
    private _scheduleRunLoop;
    private _runLoopInBackground;
    private _runLoop;
    private _emit;
    private _clearActiveStream;
    private _beginNewStream;
    private _ensureAgentStart;
    private _ensureAgentEnd;
    private _finishStream;
    /**
     * Preserve error identity fields in _meta so downstream consumers can
     * reconstruct fatal CLI errors.
     */
    private _emitErrorAndAgentEnd;
    private _nextEventFields;
    private _makeUserMessageEvent;
    private _makeToolResponseEvent;
    private _makeAgentStartEvent;
    private _makeAgentEndEvent;
    private _makeErrorEvent;
}
export declare class LegacyAgentSession extends AgentSession {
    constructor(deps: LegacyAgentSessionDeps);
}
