/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ConcreteNode } from '../graph/types.js';
import type { AsyncPipelineDef, PipelineDef, PipelineTrigger } from '../config/types.js';
import type { ContextEnvironment, ContextEventBus, ContextTracer } from './environment.js';
export declare class PipelineOrchestrator {
    private readonly pipelines;
    private readonly asyncPipelines;
    private readonly env;
    private readonly eventBus;
    private readonly tracer;
    private activeTimers;
    constructor(pipelines: PipelineDef[], asyncPipelines: AsyncPipelineDef[], env: ContextEnvironment, eventBus: ContextEventBus, tracer: ContextTracer);
    private isNodeAllowed;
    private setupTriggers;
    shutdown(): void;
    executeTriggerSync(trigger: PipelineTrigger, nodes: readonly ConcreteNode[], triggerTargets: ReadonlySet<string>, protectedLogicalIds?: ReadonlySet<string>): Promise<readonly ConcreteNode[]>;
    private executePipelineAsync;
}
