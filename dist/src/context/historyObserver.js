/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Connects the raw AgentChatHistory to the ContextManager.
 * It maps raw messages into Episodic Intermediate Representation (Context Graph)
 * and evaluates background triggers whenever history changes.
 */
export class HistoryObserver {
    chatHistory;
    eventBus;
    tracer;
    tokenCalculator;
    graphMapper;
    unsubscribeHistory;
    seenNodeIds = new Set();
    constructor(chatHistory, eventBus, tracer, tokenCalculator, graphMapper) {
        this.chatHistory = chatHistory;
        this.eventBus = eventBus;
        this.tracer = tracer;
        this.tokenCalculator = tokenCalculator;
        this.graphMapper = graphMapper;
    }
    start() {
        if (this.unsubscribeHistory) {
            this.unsubscribeHistory();
        }
        this.unsubscribeHistory = this.chatHistory.subscribe((_event) => {
            // Rebuild the pristine Context Graph graph from the full source history on every change.
            // Wait, toGraph still returns an Episode[].
            // We actually need to map the Episode[] to a flat ConcreteNode[] here to form the 'nodes'.
            const pristineEpisodes = this.graphMapper.toGraph(this.chatHistory.get(), this.tokenCalculator);
            const nodes = [];
            for (const ep of pristineEpisodes) {
                if (ep.concreteNodes) {
                    for (const child of ep.concreteNodes) {
                        nodes.push(child);
                    }
                }
            }
            const newNodes = new Set();
            for (const node of nodes) {
                if (!this.seenNodeIds.has(node.id)) {
                    newNodes.add(node.id);
                    this.seenNodeIds.add(node.id);
                }
            }
            this.tracer.logEvent('HistoryObserver', 'Rebuilt pristine graph from chat history update', { nodesSize: nodes.length, newNodesCount: newNodes.size });
            this.eventBus.emitPristineHistoryUpdated({
                nodes,
                newNodes,
            });
        });
    }
    stop() {
        if (this.unsubscribeHistory) {
            this.unsubscribeHistory();
            this.unsubscribeHistory = undefined;
        }
    }
}
//# sourceMappingURL=historyObserver.js.map