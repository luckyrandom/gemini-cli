/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type ThoughtSummary } from '../utils/thoughtUtils.js';
import type { Content, PartListUnion, GenerateContentResponseUsageMetadata } from '@google/genai';
import type { AgentLoopContext } from '../config/agent-loop-context.js';
import { type ToolCallRecord, type ConversationRecordExtra, type ConversationRecord, type ResumedSessionData, type LoadConversationOptions } from './chatRecordingTypes.js';
export * from './chatRecordingTypes.js';
export declare function loadConversationRecord(filePath: string, options?: LoadConversationOptions): Promise<(ConversationRecord & {
    messageCount?: number;
    firstUserMessage?: string;
    hasUserOrAssistantMessage?: boolean;
}) | null>;
export declare class ChatRecordingService {
    private conversationFile;
    private cachedConversation;
    private sessionId;
    private projectHash;
    private kind?;
    private queuedThoughts;
    private queuedTokens;
    private context;
    constructor(context: AgentLoopContext);
    initialize(resumedSessionData?: ResumedSessionData, kind?: 'main' | 'subagent'): Promise<void>;
    private appendRecord;
    private updateMetadata;
    private pushMessage;
    private getLastMessage;
    private newMessage;
    recordMessage(message: {
        model: string | undefined;
        type: ConversationRecordExtra['type'];
        content: PartListUnion;
        displayContent?: PartListUnion;
    }): void;
    recordThought(thought: ThoughtSummary): void;
    recordMessageTokens(respUsageMetadata: GenerateContentResponseUsageMetadata): void;
    recordToolCalls(model: string, toolCalls: ToolCallRecord[]): void;
    saveSummary(summary: string): void;
    recordDirectories(directories: readonly string[]): void;
    getConversation(): ConversationRecord | null;
    getConversationFilePath(): string | null;
    /**
     * Deletes a session file by sessionId, filename, or basename.
     * Derives an 8-character shortId to find and delete all associated files
     * (parent and subagents).
     *
     * @throws {Error} If shortId validation fails.
     */
    deleteSession(sessionIdOrBasename: string): Promise<void>;
    private deriveShortId;
    private getMatchingSessionFiles;
    /**
     * Deletes a single session file and its associated logs, tool-outputs, and directory.
     */
    private deleteSessionAndArtifacts;
    /**
     * Rewinds the conversation to the state just before the specified message ID.
     * All messages from (and including) the specified ID onwards are removed.
     */
    rewindTo(messageId: string): ConversationRecord | null;
    updateMessagesFromHistory(history: readonly Content[]): void;
}
