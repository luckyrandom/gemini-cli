/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type ParsedSandboxDenial } from '../../services/sandboxManager.js';
import type { ShellExecutionResult } from '../../services/shellExecutionService.js';
import { type SandboxDenialCache } from '../utils/sandboxDenialUtils.js';
/**
 * Windows-specific sandbox denial detection.
 * Extracts paths from "Access is denied" and related errors.
 */
export declare function parseWindowsSandboxDenials(result: ShellExecutionResult, cache?: SandboxDenialCache): ParsedSandboxDenial | undefined;
