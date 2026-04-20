/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { AgentEvent, AgentEventCommon, AgentEventData, AgentProtocol, AgentSend, Unsubscribe } from './types.js';
export type MockAgentEvent = Partial<AgentEventCommon> & AgentEventData;
export interface PushResponseOptions {
    /** If true, does not automatically add an agent_end event. */
    keepOpen?: boolean;
}
/**
 * A mock implementation of AgentProtocol for testing.
 * Allows queuing responses that will be yielded when send() is called.
 */
export declare class MockAgentProtocol implements AgentProtocol {
    private _events;
    private _responses;
    private _subscribers;
    private _activeStreamIds;
    private _lastStreamId?;
    private _nextEventId;
    private _nextStreamId;
    title?: string;
    model?: string;
    config?: Record<string, unknown>;
    constructor(initialEvents?: AgentEvent[]);
    /**
     * All events that have occurred in this session so far.
     */
    get events(): AgentEvent[];
    subscribe(callback: (event: AgentEvent) => void): Unsubscribe;
    private _emit;
    /**
     * Queues a sequence of events to be "emitted" by the agent in response to the
     * next send() call.
     */
    pushResponse(events: MockAgentEvent[], options?: PushResponseOptions): void;
    /**
     * Appends events to an existing stream and notifies any waiting listeners.
     */
    pushToStream(streamId: string, events: MockAgentEvent[], options?: {
        close?: boolean;
    }): void;
    send(payload: AgentSend): Promise<{
        streamId: string | null;
    }>;
    private _normalizeEvent;
    abort(): Promise<void>;
}
