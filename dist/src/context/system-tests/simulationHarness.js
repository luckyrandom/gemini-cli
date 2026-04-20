/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { ContextManager } from '../contextManager.js';
import { AgentChatHistory } from '../../core/agentChatHistory.js';
import { ContextEnvironmentImpl } from '../pipeline/environmentImpl.js';
import { ContextTracer } from '../tracer.js';
import { ContextEventBus } from '../eventBus.js';
import { PipelineOrchestrator } from '../pipeline/orchestrator.js';
import { debugLogger } from '../../utils/debugLogger.js';
export class SimulationHarness {
    chatHistory;
    contextManager;
    env;
    orchestrator;
    eventBus;
    config;
    tracer;
    currentTurnIndex = 0;
    tokenTrajectory = [];
    static async create(config, mockLlmClient, mockTempDir = '/tmp/sim') {
        const harness = new SimulationHarness();
        await harness.init(config, mockLlmClient, mockTempDir);
        return harness;
    }
    constructor() {
        this.chatHistory = new AgentChatHistory();
        this.eventBus = new ContextEventBus();
    }
    async init(config, mockLlmClient, mockTempDir) {
        this.config = config;
        this.tracer = new ContextTracer({
            targetDir: mockTempDir,
            sessionId: 'sim-session',
        });
        this.env = new ContextEnvironmentImpl(mockLlmClient, 'sim-prompt', 'sim-session', mockTempDir, mockTempDir, this.tracer, 1, // 1 char per token average
        this.eventBus);
        this.orchestrator = new PipelineOrchestrator(config.buildPipelines(this.env), config.buildAsyncPipelines(this.env), this.env, this.eventBus, this.tracer);
        this.contextManager = new ContextManager(config, this.env, this.tracer, this.orchestrator, this.chatHistory);
    }
    /**
     * Simulates a single "Turn" (User input + Model/Tool outputs)
     * A turn might consist of multiple Content messages (e.g. user prompt -> model call -> user response -> model answer)
     */
    async simulateTurn(messages) {
        // 1. Append the new messages
        const currentHistory = this.chatHistory.get();
        this.chatHistory.set([...currentHistory, ...messages]);
        // 2. Measure tokens immediately after append (Before background processing)
        const tokensBefore = this.env.tokenCalculator.calculateConcreteListTokens(this.contextManager.getNodes());
        debugLogger.log(`[Turn ${this.currentTurnIndex}] Tokens BEFORE: ${tokensBefore}`);
        // 3. Yield to event loop to allow internal async subscribers and orchestrator to finish
        await new Promise((resolve) => setTimeout(resolve, 50));
        // 3.1 Simulate what projectCompressedHistory does with the sync handlers
        let currentView = this.contextManager.getNodes();
        const currentTokens = this.env.tokenCalculator.calculateConcreteListTokens(currentView);
        if (this.config.config.budget &&
            currentTokens > this.config.config.budget.maxTokens) {
            debugLogger.log(`[Turn ${this.currentTurnIndex}] Sync panic triggered! ${currentTokens} > ${this.config.config.budget.maxTokens}`);
            const orchestrator = this.orchestrator;
            // In the V2 simulation, we trigger the 'gc_backstop' to simulate emergency pressure.
            // Since contextManager owns its buffer natively, the simulation now properly matches reality
            // where the manager runs the orchestrator and keeps the resulting modified view.
            const modifiedView = await orchestrator.executeTriggerSync('gc_backstop', currentView, new Set(currentView.map((e) => e.id)), new Set());
            // In the real system, ContextManager triggers this and retains it.
            // We will emulate that behavior internally in the test loop for token counting.
            currentView = modifiedView;
        }
        // 4. Measure tokens after background processors have processed inboxes
        const tokensAfter = this.env.tokenCalculator.calculateConcreteListTokens(this.contextManager.getNodes());
        debugLogger.log(`[Turn ${this.currentTurnIndex}] Tokens AFTER: ${tokensAfter}`);
        this.tokenTrajectory.push({
            turnIndex: this.currentTurnIndex++,
            tokensBeforeBackground: tokensBefore,
            tokensAfterBackground: tokensAfter,
        });
    }
    async getGoldenState() {
        const finalProjection = await this.contextManager.renderHistory();
        return {
            tokenTrajectory: this.tokenTrajectory,
            finalProjection,
        };
    }
}
//# sourceMappingURL=simulationHarness.js.map