/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { BaseLlmClient } from '../../core/baseLlmClient.js';
import type { ContextTracer } from '../tracer.js';
import type { ContextEnvironment } from './environment.js';
import type { ContextEventBus } from '../eventBus.js';
import { ContextTokenCalculator } from '../utils/contextTokenCalculator.js';
import { LiveInbox } from './inbox.js';
import { NodeBehaviorRegistry } from '../graph/behaviorRegistry.js';
import { ContextGraphMapper } from '../graph/mapper.js';
export declare class ContextEnvironmentImpl implements ContextEnvironment {
    readonly llmClient: BaseLlmClient;
    readonly sessionId: string;
    readonly promptId: string;
    readonly traceDir: string;
    readonly projectTempDir: string;
    readonly tracer: ContextTracer;
    readonly charsPerToken: number;
    readonly eventBus: ContextEventBus;
    readonly tokenCalculator: ContextTokenCalculator;
    readonly inbox: LiveInbox;
    readonly behaviorRegistry: NodeBehaviorRegistry;
    readonly graphMapper: ContextGraphMapper;
    constructor(llmClient: BaseLlmClient, sessionId: string, promptId: string, traceDir: string, projectTempDir: string, tracer: ContextTracer, charsPerToken: number, eventBus: ContextEventBus);
}
