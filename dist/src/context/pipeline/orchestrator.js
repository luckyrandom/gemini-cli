/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { debugLogger } from '../../utils/debugLogger.js';
import { InboxSnapshotImpl } from './inbox.js';
import { ContextWorkingBufferImpl } from './contextWorkingBuffer.js';
export class PipelineOrchestrator {
    pipelines;
    asyncPipelines;
    env;
    eventBus;
    tracer;
    activeTimers = [];
    constructor(pipelines, asyncPipelines, env, eventBus, tracer) {
        this.pipelines = pipelines;
        this.asyncPipelines = asyncPipelines;
        this.env = env;
        this.eventBus = eventBus;
        this.tracer = tracer;
        this.setupTriggers();
    }
    isNodeAllowed(node, triggerTargets, protectedLogicalIds = new Set()) {
        return (triggerTargets.has(node.id) &&
            !protectedLogicalIds.has(node.id) &&
            (!node.logicalParentId || !protectedLogicalIds.has(node.logicalParentId)));
    }
    setupTriggers() {
        const bindTriggers = (pipelines, executeFn) => {
            for (const pipeline of pipelines) {
                for (const trigger of pipeline.triggers) {
                    if (typeof trigger === 'object' && trigger.type === 'timer') {
                        const timer = setInterval(() => {
                            // Background timers not fully implemented in V1 yet
                        }, trigger.intervalMs);
                        this.activeTimers.push(timer);
                    }
                    else if (trigger === 'retained_exceeded' ||
                        trigger === 'nodes_aged_out') {
                        this.eventBus.onConsolidationNeeded((event) => {
                            executeFn(pipeline, event.nodes, event.targetNodeIds, new Set());
                        });
                    }
                    else if (trigger === 'new_message' || trigger === 'nodes_added') {
                        this.eventBus.onChunkReceived((event) => {
                            executeFn(pipeline, event.nodes, event.targetNodeIds, new Set());
                        });
                    }
                }
            }
        };
        bindTriggers(this.pipelines, (pipeline, nodes, targets, protectedIds) => {
            void this.executePipelineAsync(pipeline, nodes, new Set(targets), new Set(protectedIds));
        });
        bindTriggers(this.asyncPipelines, (pipeline, nodes, targetIds) => {
            const inboxSnapshot = new InboxSnapshotImpl(this.env.inbox.getMessages() || []);
            const targets = nodes.filter((n) => targetIds.has(n.id));
            for (const processor of pipeline.processors) {
                processor
                    .process({
                    targets,
                    inbox: inboxSnapshot,
                    buffer: ContextWorkingBufferImpl.initialize(nodes),
                })
                    .catch((e) => debugLogger.error(`AsyncProcessor ${processor.name} failed:`, e));
            }
        });
    }
    shutdown() {
        for (const timer of this.activeTimers) {
            clearInterval(timer);
        }
    }
    async executeTriggerSync(trigger, nodes, triggerTargets, protectedLogicalIds = new Set()) {
        let currentBuffer = ContextWorkingBufferImpl.initialize(nodes);
        const triggerPipelines = this.pipelines.filter((p) => p.triggers.includes(trigger));
        // Freeze the inbox for this pipeline run
        const inboxSnapshot = new InboxSnapshotImpl(this.env.inbox.getMessages() || []);
        for (const pipeline of triggerPipelines) {
            for (const processor of pipeline.processors) {
                try {
                    this.tracer.logEvent('Orchestrator', `Executing processor synchronously: ${processor.id}`);
                    const allowedTargets = currentBuffer.nodes.filter((n) => this.isNodeAllowed(n, triggerTargets, protectedLogicalIds));
                    const returnedNodes = await processor.process({
                        buffer: currentBuffer,
                        targets: allowedTargets,
                        inbox: inboxSnapshot,
                    });
                    currentBuffer = currentBuffer.applyProcessorResult(processor.id, allowedTargets, returnedNodes);
                }
                catch (error) {
                    debugLogger.error(`Synchronous processor ${processor.id} failed:`, error);
                }
            }
        }
        // Success! Drain consumed messages
        this.env.inbox.drainConsumed(inboxSnapshot.getConsumedIds());
        return currentBuffer.nodes;
    }
    async executePipelineAsync(pipeline, nodes, triggerTargets, protectedLogicalIds = new Set()) {
        this.tracer.logEvent('Orchestrator', `Triggering async pipeline: ${pipeline.name}`);
        if (!nodes || nodes.length === 0)
            return;
        let currentBuffer = ContextWorkingBufferImpl.initialize(nodes);
        const inboxSnapshot = new InboxSnapshotImpl(this.env.inbox.getMessages() || []);
        for (const processor of pipeline.processors) {
            try {
                this.tracer.logEvent('Orchestrator', `Executing processor: ${processor.id} (async)`);
                const allowedTargets = currentBuffer.nodes.filter((n) => this.isNodeAllowed(n, triggerTargets, protectedLogicalIds));
                const returnedNodes = await processor.process({
                    buffer: currentBuffer,
                    targets: allowedTargets,
                    inbox: inboxSnapshot,
                });
                currentBuffer = currentBuffer.applyProcessorResult(processor.id, allowedTargets, returnedNodes);
            }
            catch (error) {
                debugLogger.error(`Pipeline ${pipeline.name} failed async at ${processor.id}:`, error);
                return;
            }
        }
        this.env.inbox.drainConsumed(inboxSnapshot.getConsumedIds());
    }
}
//# sourceMappingURL=orchestrator.js.map