/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Content } from '@google/genai';
import type { AgentChatHistory } from '../core/agentChatHistory.js';
import type { ConcreteNode } from './graph/types.js';
import type { ContextTracer } from './tracer.js';
import type { ContextEnvironment } from './pipeline/environment.js';
import type { ContextProfile } from './config/profiles.js';
import type { PipelineOrchestrator } from './pipeline/orchestrator.js';
export declare class ContextManager {
    private readonly sidecar;
    private readonly env;
    private readonly tracer;
    private buffer;
    private readonly eventBus;
    private readonly orchestrator;
    private readonly historyObserver;
    constructor(sidecar: ContextProfile, env: ContextEnvironment, tracer: ContextTracer, orchestrator: PipelineOrchestrator, chatHistory: AgentChatHistory);
    /**
     * Safely stops background async pipelines and clears event listeners.
     */
    shutdown(): void;
    /**
     * Evaluates if the current working buffer exceeds configured budget thresholds,
     * firing consolidation events if necessary.
     */
    private evaluateTriggers;
    /**
     * Retrieves the raw, uncompressed Episodic Context Graph graph.
     * Useful for internal tool rendering (like the trace viewer).
     * Note: This is an expensive, deep clone operation.
     */
    getPristineGraph(): readonly ConcreteNode[];
    /**
     * Generates a virtual view of the pristine graph, substituting in variants
     * up to the configured token budget.
     * This is the view that will eventually be projected back to the LLM.
     */
    getNodes(): readonly ConcreteNode[];
    /**
     * Executes the final 'gc_backstop' pipeline if necessary, enforcing the token budget,
     * and maps the Episodic Context Graph back into a raw Gemini Content[] array for transmission.
     * This is the primary method called by the agent framework before sending a request.
     */
    renderHistory(activeTaskIds?: Set<string>): Promise<Content[]>;
}
