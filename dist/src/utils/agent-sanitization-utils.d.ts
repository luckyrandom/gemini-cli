/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Sensitive key patterns used for redaction.
 */
export declare const SENSITIVE_KEY_PATTERNS: string[];
/**
 * Sanitizes tool arguments by recursively redacting sensitive fields.
 * Supports nested objects and arrays.
 */
export declare function sanitizeToolArgs(args: unknown): unknown;
/**
 * Sanitizes error messages by redacting potential sensitive data patterns.
 * Uses [^\s'"]+ to catch JWTs, tokens with dots/slashes, and other complex values.
 */
export declare function sanitizeErrorMessage(message: string): string;
/**
 * Sanitizes LLM thought content by redacting sensitive data patterns.
 */
export declare function sanitizeThoughtContent(text: string): string;
