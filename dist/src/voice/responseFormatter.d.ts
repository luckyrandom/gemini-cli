/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Options for formatForSpeech().
 */
export interface FormatForSpeechOptions {
    /**
     * Maximum output length in characters before truncating.
     * @default 500
     */
    maxLength?: number;
    /**
     * Number of trailing path segments to keep when abbreviating absolute paths.
     * @default 3
     */
    pathDepth?: number;
    /**
     * Maximum number of characters in a JSON value before summarising it.
     * @default 80
     */
    jsonThreshold?: number;
}
/**
 * Transforms a markdown/ANSI-formatted string into speech-ready plain text.
 *
 * Transformations applied (in order):
 * 1. Strip ANSI escape codes
 * 2. Collapse fenced code blocks to their content (or a JSON summary)
 * 3. Collapse stack traces to first frame + count
 * 4. Strip markdown syntax (bold, italic, blockquotes, headings, links, lists, inline code)
 * 5. Abbreviate deep absolute paths
 * 6. Normalise whitespace
 * 7. Truncate to maxLength
 */
export declare function formatForSpeech(text: string, options?: FormatForSpeechOptions): string;
