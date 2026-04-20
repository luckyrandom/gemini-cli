/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type ResolvedSandboxPaths } from '../../services/sandboxManager.js';
/**
 * Options for building bubblewrap (bwrap) arguments.
 */
export interface BwrapArgsOptions {
    resolvedPaths: ResolvedSandboxPaths;
    workspaceWrite: boolean;
    networkAccess: boolean;
    maskFilePath: string;
    isReadOnlyCommand: boolean;
}
/**
 * Builds the list of bubblewrap arguments based on the provided options.
 */
export declare function buildBwrapArgs(options: BwrapArgsOptions): Promise<string[]>;
