/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Resets the API key cache. Used exclusively for test isolation.
 * @internal
 */
export declare function resetApiKeyCacheForTesting(): void;
/**
 * Load cached API key
 */
export declare function loadApiKey(): Promise<string | null>;
/**
 * Save API key
 */
export declare function saveApiKey(apiKey: string | null | undefined): Promise<void>;
/**
 * Clear cached API key
 */
export declare function clearApiKey(): Promise<void>;
