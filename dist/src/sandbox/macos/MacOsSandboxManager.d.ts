/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type SandboxManager, type SandboxRequest, type SandboxedCommand, type GlobalSandboxOptions, type ParsedSandboxDenial } from '../../services/sandboxManager.js';
import type { ShellExecutionResult } from '../../services/shellExecutionService.js';
export declare class MacOsSandboxManager implements SandboxManager {
    private readonly options;
    private readonly denialCache;
    constructor(options: GlobalSandboxOptions);
    isKnownSafeCommand(args: string[]): boolean;
    isDangerousCommand(args: string[]): boolean;
    parseDenials(result: ShellExecutionResult): ParsedSandboxDenial | undefined;
    getWorkspace(): string;
    getOptions(): GlobalSandboxOptions;
    prepareCommand(req: SandboxRequest): Promise<SandboxedCommand>;
    private writeProfileToTempFile;
}
