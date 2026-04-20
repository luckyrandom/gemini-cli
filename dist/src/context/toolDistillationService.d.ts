/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type Config } from '../index.js';
import type { PartListUnion } from '@google/genai';
import { type GeminiClient } from '../core/client.js';
export interface DistilledToolOutput {
    truncatedContent: PartListUnion;
    outputFile?: string;
}
export declare class ToolOutputDistillationService {
    private readonly config;
    private readonly geminiClient;
    private readonly promptId;
    constructor(config: Config, geminiClient: GeminiClient, promptId: string);
    /**
     * Distills a tool's output if it exceeds configured length thresholds, preserving
     * the agent's context window. This includes saving the raw output to disk, replacing
     * the output with a truncated placeholder, and optionally summarizing the output
     * via a secondary LLM call if the output is massively oversized.
     */
    distill(toolName: string, callId: string, content: PartListUnion): Promise<DistilledToolOutput>;
    private isExemptFromDistillation;
    private calculateContentLength;
    private stringifyContent;
    private performDistillation;
    /**
     * Truncates content while maintaining its Part structure.
     */
    private truncateContentStructurally;
    /**
     * Calls the secondary model to distill the strategic "why" signals and intent
     * of the truncated content before it is offloaded.
     */
    private generateIntentSummary;
}
