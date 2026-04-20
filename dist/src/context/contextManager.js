/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { HistoryObserver } from './historyObserver.js';
import { render } from './graph/render.js';
import { ContextWorkingBufferImpl } from './pipeline/contextWorkingBuffer.js';
export class ContextManager {
    sidecar;
    env;
    tracer;
    // The master state containing the pristine graph and current active graph.
    buffer = ContextWorkingBufferImpl.initialize([]);
    eventBus;
    // Internal sub-components
    orchestrator;
    historyObserver;
    constructor(sidecar, env, tracer, orchestrator, chatHistory) {
        this.sidecar = sidecar;
        this.env = env;
        this.tracer = tracer;
        this.eventBus = env.eventBus;
        this.orchestrator = orchestrator;
        this.historyObserver = new HistoryObserver(chatHistory, this.env.eventBus, this.tracer, this.env.tokenCalculator, this.env.graphMapper);
        this.historyObserver.start();
        this.eventBus.onPristineHistoryUpdated((event) => {
            const existingIds = new Set(this.buffer.nodes.map((n) => n.id));
            const newIds = new Set(event.nodes.map((n) => n.id));
            const addedNodes = event.nodes.filter((n) => !existingIds.has(n.id));
            // Prune any pristine nodes that were dropped from the upstream history
            this.buffer = this.buffer.prunePristineNodes(newIds);
            if (addedNodes.length > 0) {
                this.buffer = this.buffer.appendPristineNodes(addedNodes);
            }
            this.evaluateTriggers(event.newNodes);
        });
    }
    /**
     * Safely stops background async pipelines and clears event listeners.
     */
    shutdown() {
        this.orchestrator.shutdown();
        this.historyObserver.stop();
    }
    /**
     * Evaluates if the current working buffer exceeds configured budget thresholds,
     * firing consolidation events if necessary.
     */
    evaluateTriggers(newNodes) {
        if (!this.sidecar.config.budget)
            return;
        if (newNodes.size > 0) {
            this.eventBus.emitChunkReceived({
                nodes: this.buffer.nodes,
                targetNodeIds: newNodes,
            });
        }
        const currentTokens = this.env.tokenCalculator.calculateConcreteListTokens(this.buffer.nodes);
        if (currentTokens > this.sidecar.config.budget.retainedTokens) {
            const agedOutNodes = new Set();
            let rollingTokens = 0;
            // Walk backwards finding nodes that fall out of the retained budget
            for (let i = this.buffer.nodes.length - 1; i >= 0; i--) {
                const node = this.buffer.nodes[i];
                rollingTokens += this.env.tokenCalculator.calculateConcreteListTokens([
                    node,
                ]);
                if (rollingTokens > this.sidecar.config.budget.retainedTokens) {
                    agedOutNodes.add(node.id);
                }
            }
            if (agedOutNodes.size > 0) {
                this.env.tokenCalculator.garbageCollectCache(new Set(this.buffer.nodes.map((n) => n.id)));
                this.eventBus.emitConsolidationNeeded({
                    nodes: this.buffer.nodes,
                    targetDeficit: currentTokens - this.sidecar.config.budget.retainedTokens,
                    targetNodeIds: agedOutNodes,
                });
            }
        }
    }
    /**
     * Retrieves the raw, uncompressed Episodic Context Graph graph.
     * Useful for internal tool rendering (like the trace viewer).
     * Note: This is an expensive, deep clone operation.
     */
    getPristineGraph() {
        const pristineSet = new Map();
        for (const node of this.buffer.nodes) {
            const roots = this.buffer.getPristineNodes(node.id);
            for (const root of roots) {
                pristineSet.set(root.id, root);
            }
        }
        // We sort them by timestamp to ensure they are returned in chronological order
        return Array.from(pristineSet.values()).sort((a, b) => a.timestamp - b.timestamp);
    }
    /**
     * Generates a virtual view of the pristine graph, substituting in variants
     * up to the configured token budget.
     * This is the view that will eventually be projected back to the LLM.
     */
    getNodes() {
        return [...this.buffer.nodes];
    }
    /**
     * Executes the final 'gc_backstop' pipeline if necessary, enforcing the token budget,
     * and maps the Episodic Context Graph back into a raw Gemini Content[] array for transmission.
     * This is the primary method called by the agent framework before sending a request.
     */
    async renderHistory(activeTaskIds = new Set()) {
        this.tracer.logEvent('ContextManager', 'Starting rendering of LLM context');
        // Apply final GC Backstop pressure barrier synchronously before mapping
        const finalHistory = await render(this.buffer.nodes, this.orchestrator, this.sidecar, this.tracer, this.env, activeTaskIds);
        this.tracer.logEvent('ContextManager', 'Finished rendering');
        return finalHistory;
    }
}
//# sourceMappingURL=contextManager.js.map