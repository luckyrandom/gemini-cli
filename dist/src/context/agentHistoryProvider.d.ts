/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Content } from '@google/genai';
import type { AgentHistoryProviderConfig } from './types.js';
import type { Config } from '../config/config.js';
export declare class AgentHistoryProvider {
    private readonly providerConfig;
    private readonly config;
    constructor(providerConfig: AgentHistoryProviderConfig, config: Config);
    /**
     * Evaluates the chat history and performs truncation and summarization if necessary.
     * Returns a new array of Content if truncation occurred, otherwise returns the original array.
     */
    manageHistory(history: readonly Content[], abortSignal?: AbortSignal): Promise<readonly Content[]>;
    /**
     * Enforces message size limits on the most recent message and the message
     * that just exited the grace zone.
     * - Recent messages have a high MAXIMUM limit.
     * - Older messages (already processed) are restricted to the NORMAL limit
     *   once they exit the grace period.
     */
    private enforceMessageSizeLimits;
    /**
     * Normalizes a message by proportionally masking its text or function response
     * if its total token count exceeds the target token limit.
     */
    private normalizeMessage;
    /**
     * Determines the boundary for splitting history based on the token budget,
     * keeping recent messages under a specific target token threshold,
     * while ensuring structural integrity (e.g. keeping functionCall/functionResponse pairs).
     */
    private splitHistoryForTruncation;
    /**
     * Adjusts the truncation boundary backwards to prevent breaking functionCall/functionResponse pairs.
     */
    private adjustBoundaryForIntegrity;
    private getFallbackSummaryText;
    private getSummaryText;
    private mergeSummaryWithHistory;
    private generateIntentSummary;
}
