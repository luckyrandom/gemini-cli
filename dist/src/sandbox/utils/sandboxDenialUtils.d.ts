/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { LRUCache } from 'mnemonist';
import { type ParsedSandboxDenial } from '../../services/sandboxManager.js';
import type { ShellExecutionResult } from '../../services/shellExecutionService.js';
/**
 * Type for the sandbox denial error cache.
 * Stores normalized error output to prevent redundant processing.
 */
export type SandboxDenialCache = LRUCache<string, boolean>;
/**
 * Creates a new sandbox denial cache with a standard LRU policy.
 */
export declare function createSandboxDenialCache(maxSize?: number): SandboxDenialCache;
/**
 * Sanitizes extracted paths to prevent path traversal vulnerabilities.
 * Filters out paths containing '..' or null bytes.
 */
export declare function sanitizeExtractedPath(p: string): string | undefined;
/**
 * Common POSIX-style sandbox denial detection.
 * Used by macOS and Linux sandbox managers.
 */
export declare function parsePosixSandboxDenials(result: ShellExecutionResult, cache?: SandboxDenialCache): ParsedSandboxDenial | undefined;
