/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
export declare const UPGRADE_URL_PAGE = "https://goo.gle/set-up-gemini-code-assist";
export declare function handleFallback(config: Config, failedModel: string, authType?: string, error?: unknown): Promise<string | boolean | null>;
