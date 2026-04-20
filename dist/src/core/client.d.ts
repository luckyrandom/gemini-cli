/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type PartListUnion, type Content, type GenerateContentResponse } from '@google/genai';
import { Turn, type ServerGeminiStreamEvent, type ChatCompressionInfo } from './turn.js';
import { type AgentLoopContext } from '../config/agent-loop-context.js';
import { GeminiChat } from './geminiChat.js';
import type { ChatRecordingService, ResumedSessionData } from '../services/chatRecordingService.js';
import { LoopDetectionService } from '../services/loopDetectionService.js';
import { type LlmRole } from '../telemetry/types.js';
import type { ModelConfigKey } from '../services/modelConfigService.js';
export declare class GeminiClient {
    private readonly context;
    private chat?;
    private sessionTurnCount;
    private readonly loopDetector;
    private readonly compressionService;
    private readonly agentHistoryProvider;
    private readonly toolOutputMaskingService;
    private lastPromptId;
    private currentSequenceModel;
    private lastSentIdeContext;
    private forceFullIdeContext;
    /**
     * At any point in this conversation, was compression triggered without
     * being forced and did it fail?
     */
    private hasFailedCompressionAttempt;
    constructor(context: AgentLoopContext);
    private get config();
    private handleModelChanged;
    private handleMemoryChanged;
    clearCurrentSequenceModel(): void;
    private hookStateMap;
    private fireBeforeAgentHookSafe;
    private fireAfterAgentHookSafe;
    private updateTelemetryTokenCount;
    initialize(): Promise<void>;
    private getContentGeneratorOrFail;
    addHistory(content: Content): Promise<void>;
    getChat(): GeminiChat;
    isInitialized(): boolean;
    getHistory(): readonly Content[];
    stripThoughtsFromHistory(): void;
    setHistory(history: readonly Content[]): void;
    private lastUsedModelId?;
    setTools(modelId?: string): Promise<void>;
    resetChat(): Promise<void>;
    dispose(): void;
    resumeChat(history: Content[], resumedSessionData?: ResumedSessionData): Promise<void>;
    getChatRecordingService(): ChatRecordingService | undefined;
    getLoopDetectionService(): LoopDetectionService;
    getCurrentSequenceModel(): string | null;
    addDirectoryContext(): Promise<void>;
    updateSystemInstruction(): void;
    startChat(extraHistory?: Content[], resumedSessionData?: ResumedSessionData): Promise<GeminiChat>;
    private getIdeContextParts;
    private _getActiveModelForCurrentTurn;
    private processTurn;
    sendMessageStream(request: PartListUnion, signal: AbortSignal, prompt_id: string, turns?: number, isInvalidStreamRetry?: boolean, displayContent?: PartListUnion, stopHookActive?: boolean): AsyncGenerator<ServerGeminiStreamEvent, Turn>;
    generateContent(modelConfigKey: ModelConfigKey, contents: Content[], abortSignal: AbortSignal, role: LlmRole): Promise<GenerateContentResponse>;
    tryCompressChat(prompt_id: string, force?: boolean, abortSignal?: AbortSignal): Promise<ChatCompressionInfo>;
    /**
     * Masks bulky tool outputs to save context window space.
     */
    private tryMaskToolOutputs;
    /**
     * Handles loop recovery by providing feedback to the model and initiating a new turn.
     */
    private _recoverFromLoop;
}
