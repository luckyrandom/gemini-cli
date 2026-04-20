/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Converts a JSON-compatible value into a readable Markdown representation.
 *
 * @param data The data to convert.
 * @param indent The current indentation level (for internal recursion).
 * @returns A Markdown string representing the data.
 */
export declare function jsonToMarkdown(data: unknown, indent?: number): string;
/**
 * Safely attempts to parse a string as JSON and convert it to Markdown.
 * If parsing fails, returns the original string.
 *
 * @param text The text to potentially convert.
 * @returns The Markdown representation or the original text.
 */
export declare function safeJsonToMarkdown(text: string): string;
export declare function isRecord(value: unknown): value is Record<string, unknown>;
