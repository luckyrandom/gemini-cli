/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type SandboxManager, type GlobalSandboxOptions, type SandboxRequest, type SandboxedCommand, type ParsedSandboxDenial } from '../../services/sandboxManager.js';
import type { ShellExecutionResult } from '../../services/shellExecutionService.js';
/**
 * A SandboxManager implementation for Linux that uses Bubblewrap (bwrap).
 */
export declare class LinuxSandboxManager implements SandboxManager {
    private readonly options;
    private static maskFilePath;
    private readonly denialCache;
    private governanceFilesInitialized;
    constructor(options: GlobalSandboxOptions);
    private ensureGovernanceFilesExist;
    isKnownSafeCommand(args: string[]): boolean;
    isDangerousCommand(args: string[]): boolean;
    parseDenials(result: ShellExecutionResult): ParsedSandboxDenial | undefined;
    getWorkspace(): string;
    getOptions(): GlobalSandboxOptions;
    private getMaskFilePath;
    prepareCommand(req: SandboxRequest): Promise<SandboxedCommand>;
    private writeArgsToTempFile;
}
