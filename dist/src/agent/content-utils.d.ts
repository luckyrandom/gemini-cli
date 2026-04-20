/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Part } from '@google/genai';
import type { ContentPart } from './types.js';
/**
 * Converts Gemini API Part objects to framework-agnostic ContentPart objects.
 * Handles text, thought, inlineData, fileData parts and serializes unknown
 * part types to text to avoid silent data loss.
 */
export declare function geminiPartsToContentParts(parts: Part[]): ContentPart[];
/**
 * Converts framework-agnostic ContentPart objects to Gemini API Part objects.
 */
export declare function contentPartsToGeminiParts(content: ContentPart[]): Part[];
/**
 * Builds the data record for a tool_response AgentEvent, preserving
 * all available metadata from the ToolCallResponseInfo.
 */
export declare function buildToolResponseData(response: {
    data?: Record<string, unknown>;
    errorType?: string;
    outputFile?: string;
    contentLength?: number;
}): Record<string, unknown> | undefined;
