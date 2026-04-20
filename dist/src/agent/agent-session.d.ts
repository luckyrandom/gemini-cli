/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { AgentProtocol, AgentSend, AgentEvent, Unsubscribe } from './types.js';
/**
 * AgentSession is a wrapper around AgentProtocol that provides a more
 * convenient API for consuming agent activity as an AsyncIterable.
 */
export declare class AgentSession implements AgentProtocol {
    private _protocol;
    constructor(protocol: AgentProtocol);
    send(payload: AgentSend): Promise<{
        streamId: string | null;
    }>;
    subscribe(callback: (event: AgentEvent) => void): Unsubscribe;
    abort(): Promise<void>;
    get events(): readonly AgentEvent[];
    /**
     * Sends a payload to the agent and returns an AsyncIterable that yields
     * events for the resulting stream.
     *
     * @param payload The payload to send to the agent.
     */
    sendStream(payload: AgentSend): AsyncIterable<AgentEvent>;
    /**
     * Returns an AsyncIterable that yields events from the agent session,
     * optionally replaying events from history or reattaching to an existing stream.
     *
     * @param options Options for replaying or reattaching to the event stream.
     */
    stream(options?: {
        eventId?: string;
        streamId?: string;
    }): AsyncIterable<AgentEvent>;
}
