/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { ContextTokenCalculator } from '../utils/contextTokenCalculator.js';
import { LiveInbox } from './inbox.js';
import { NodeBehaviorRegistry } from '../graph/behaviorRegistry.js';
import { registerBuiltInBehaviors } from '../graph/builtinBehaviors.js';
import { ContextGraphMapper } from '../graph/mapper.js';
export class ContextEnvironmentImpl {
    llmClient;
    sessionId;
    promptId;
    traceDir;
    projectTempDir;
    tracer;
    charsPerToken;
    eventBus;
    tokenCalculator;
    inbox;
    behaviorRegistry;
    graphMapper;
    constructor(llmClient, sessionId, promptId, traceDir, projectTempDir, tracer, charsPerToken, eventBus) {
        this.llmClient = llmClient;
        this.sessionId = sessionId;
        this.promptId = promptId;
        this.traceDir = traceDir;
        this.projectTempDir = projectTempDir;
        this.tracer = tracer;
        this.charsPerToken = charsPerToken;
        this.eventBus = eventBus;
        this.behaviorRegistry = new NodeBehaviorRegistry();
        registerBuiltInBehaviors(this.behaviorRegistry);
        this.tokenCalculator = new ContextTokenCalculator(this.charsPerToken, this.behaviorRegistry);
        this.inbox = new LiveInbox();
        this.graphMapper = new ContextGraphMapper(this.behaviorRegistry);
    }
}
//# sourceMappingURL=environmentImpl.js.map