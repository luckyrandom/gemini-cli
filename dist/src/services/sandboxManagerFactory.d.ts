/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type SandboxManager, type GlobalSandboxOptions } from './sandboxManager.js';
import type { SandboxConfig } from '../config/config.js';
/**
 * Creates a sandbox manager based on the provided settings.
 */
export declare function createSandboxManager(sandbox: SandboxConfig | undefined, options: GlobalSandboxOptions, approvalMode?: string): SandboxManager;
