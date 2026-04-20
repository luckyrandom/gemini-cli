/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { ContextManager } from '../contextManager.js';
import { AgentChatHistory } from '../../core/agentChatHistory.js';
import type { Content } from '@google/genai';
import type { ContextProfile } from '../config/profiles.js';
import { ContextEnvironmentImpl } from '../pipeline/environmentImpl.js';
import { ContextEventBus } from '../eventBus.js';
import { PipelineOrchestrator } from '../pipeline/orchestrator.js';
import type { BaseLlmClient } from '../../core/baseLlmClient.js';
export interface TurnSummary {
    turnIndex: number;
    tokensBeforeBackground: number;
    tokensAfterBackground: number;
}
export declare class SimulationHarness {
    readonly chatHistory: AgentChatHistory;
    contextManager: ContextManager;
    env: ContextEnvironmentImpl;
    orchestrator: PipelineOrchestrator;
    readonly eventBus: ContextEventBus;
    config: ContextProfile;
    private tracer;
    private currentTurnIndex;
    private tokenTrajectory;
    static create(config: ContextProfile, mockLlmClient: BaseLlmClient, mockTempDir?: string): Promise<SimulationHarness>;
    private constructor();
    private init;
    /**
     * Simulates a single "Turn" (User input + Model/Tool outputs)
     * A turn might consist of multiple Content messages (e.g. user prompt -> model call -> user response -> model answer)
     */
    simulateTurn(messages: Content[]): Promise<void>;
    getGoldenState(): Promise<{
        tokenTrajectory: TurnSummary[];
        finalProjection: Content[];
    }>;
}
