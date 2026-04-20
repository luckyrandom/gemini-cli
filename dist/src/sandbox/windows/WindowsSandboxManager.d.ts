/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type SandboxManager, type SandboxRequest, type SandboxedCommand, type GlobalSandboxOptions, type ParsedSandboxDenial } from '../../services/sandboxManager.js';
import type { ShellExecutionResult } from '../../services/shellExecutionService.js';
/**
 * A SandboxManager implementation for Windows that uses Restricted Tokens,
 * Job Objects, and Low Integrity levels for process isolation.
 * Uses a native C# helper to bypass PowerShell restrictions.
 */
export declare class WindowsSandboxManager implements SandboxManager {
    private readonly options;
    static readonly HELPER_EXE = "GeminiSandbox.exe";
    private readonly helperPath;
    private readonly denialCache;
    private static helperCompiled;
    private governanceFilesInitialized;
    constructor(options: GlobalSandboxOptions);
    isKnownSafeCommand(args: string[]): boolean;
    isDangerousCommand(args: string[]): boolean;
    parseDenials(result: ShellExecutionResult): ParsedSandboxDenial | undefined;
    getWorkspace(): string;
    getOptions(): GlobalSandboxOptions;
    private ensureGovernanceFilesExist;
    private ensureHelperCompiled;
    /**
     * Prepares a command for sandboxed execution on Windows.
     */
    prepareCommand(req: SandboxRequest): Promise<SandboxedCommand>;
    private isSystemDirectory;
}
