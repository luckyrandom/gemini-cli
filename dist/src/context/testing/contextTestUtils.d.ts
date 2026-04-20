/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { AgentChatHistory } from '../../core/agentChatHistory.js';
import { ContextManager } from '../contextManager.js';
import type { ConcreteNode, ToolExecution } from '../graph/types.js';
import type { ContextEnvironment } from '../pipeline/environment.js';
import type { Config } from '../../config/config.js';
import type { BaseLlmClient } from '../../core/baseLlmClient.js';
import type { Content, GenerateContentResponse } from '@google/genai';
import type { InboxMessage, ProcessArgs } from '../pipeline.js';
import type { ContextProfile } from '../config/profiles.js';
import type { Mock } from 'vitest';
/**
 * Creates a valid mock GenerateContentResponse with the provided text.
 * Used to avoid having to manually construct the deeply nested candidate/content/part structure.
 */
export declare const createMockGenerateContentResponse: (text: string) => GenerateContentResponse;
export declare function createDummyNode(logicalParentId: string, type: ConcreteNode['type'], tokens?: number, overrides?: Partial<ConcreteNode>, id?: string): ConcreteNode;
export declare function createDummyToolNode(logicalParentId: string, intentTokens?: number, obsTokens?: number, overrides?: Partial<ToolExecution>, id?: string): ToolExecution;
export interface MockLlmClient extends BaseLlmClient {
    generateContent: Mock;
}
export declare function createMockLlmClient(responses?: Array<string | GenerateContentResponse>): MockLlmClient;
export declare function createMockEnvironment(overrides?: Partial<ContextEnvironment>): ContextEnvironment;
/**
 * Creates a block of synthetic conversation history designed to consume a specific number of tokens.
 * Assumes roughly 4 characters per token for standard English text.
 */
export declare function createMockProcessArgs(targets: ConcreteNode[], bufferNodes?: ConcreteNode[], inboxMessages?: InboxMessage[]): ProcessArgs;
export declare function createSyntheticHistory(numTurns: number, tokensPerTurn: number): Content[];
/**
 * Creates a fully mocked Config object tailored for Context Component testing.
 */
export declare function createMockContextConfig(overrides?: Record<string, unknown>, llmClientOverride?: unknown): Config;
/**
 * Wires up a full ContextManager component with an AgentChatHistory and active background async pipelines.
 */
export declare function setupContextComponentTest(config: Config, sidecarOverride?: ContextProfile): {
    chatHistory: AgentChatHistory;
    contextManager: ContextManager;
};
