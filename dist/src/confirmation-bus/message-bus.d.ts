/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { EventEmitter } from 'node:events';
import type { PolicyEngine } from '../policy/policy-engine.js';
import { type Message } from './types.js';
export declare class MessageBus extends EventEmitter {
    private readonly policyEngine;
    private readonly debug;
    private listenerToAbortCleanup;
    constructor(policyEngine: PolicyEngine, debug?: boolean);
    private isValidMessage;
    private emitMessage;
    /**
     * Derives a child message bus scoped to a specific subagent.
     */
    derive(subagentName: string): MessageBus;
    publish(message: Message): Promise<void>;
    subscribe<T extends Message>(type: T['type'], listener: (message: T) => void, options?: {
        signal?: AbortSignal;
    }): void;
    unsubscribe<T extends Message>(type: T['type'], listener: (message: T) => void): void;
    /**
     * Request-response pattern: Publish a message and wait for a correlated response
     * This enables synchronous-style communication over the async MessageBus
     * The correlation ID is generated internally and added to the request
     */
    request<TRequest extends Message, TResponse extends Message>(request: Omit<TRequest, 'correlationId'>, responseType: TResponse['type'], timeoutMs?: number): Promise<TResponse>;
}
