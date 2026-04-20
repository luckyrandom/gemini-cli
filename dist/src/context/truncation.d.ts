/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Part } from '@google/genai';
export declare const MIN_TARGET_TOKENS = 10;
export declare const MIN_CHARS_FOR_TRUNCATION = 100;
export declare const TEXT_TRUNCATION_PREFIX = "[Message Normalized: Exceeded size limit]";
export declare const TOOL_TRUNCATION_PREFIX = "[Message Normalized: Tool output exceeded size limit]";
/**
 * Estimates the character limit for a target token count, accounting for ASCII vs Non-ASCII.
 * Uses a weighted average based on the provided text to decide how many characters
 * fit into the target token budget.
 */
export declare function estimateCharsFromTokens(text: string, targetTokens: number): number;
/**
 * Truncates a string to a target length, keeping a proportional amount of the head and tail,
 * and prepending a prefix.
 */
export declare function truncateProportionally(str: string, targetChars: number, prefix: string, headRatio?: number): string;
/**
 * Safely normalizes a function response by truncating large string values
 * within the response object while maintaining its JSON structure.
 */
export declare function normalizeFunctionResponse(part: Part, ratio: number, headRatio?: number, savedPath?: string, intentSummary?: string): Part;
