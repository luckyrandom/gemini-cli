/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { AgentChatHistory } from '../core/agentChatHistory.js';
import type { ContextGraphMapper } from './graph/mapper.js';
import type { ContextTokenCalculator } from './utils/contextTokenCalculator.js';
import type { ContextEventBus } from './eventBus.js';
import type { ContextTracer } from './tracer.js';
/**
 * Connects the raw AgentChatHistory to the ContextManager.
 * It maps raw messages into Episodic Intermediate Representation (Context Graph)
 * and evaluates background triggers whenever history changes.
 */
export declare class HistoryObserver {
    private readonly chatHistory;
    private readonly eventBus;
    private readonly tracer;
    private readonly tokenCalculator;
    private readonly graphMapper;
    private unsubscribeHistory?;
    private readonly seenNodeIds;
    constructor(chatHistory: AgentChatHistory, eventBus: ContextEventBus, tracer: ContextTracer, tokenCalculator: ContextTokenCalculator, graphMapper: ContextGraphMapper);
    start(): void;
    stop(): void;
}
