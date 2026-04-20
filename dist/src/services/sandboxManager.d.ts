/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type EnvironmentSanitizationConfig } from './environmentSanitization.js';
import type { ShellExecutionResult } from './shellExecutionService.js';
import type { SandboxPolicyManager } from '../policy/sandboxPolicyManager.js';
/**
 * A structured result of fully resolved sandbox paths.
 * All paths in this object are absolute, deduplicated, and expanded to include
 * both the original path and its real target (if it is a symlink).
 */
export interface ResolvedSandboxPaths {
    /** The primary workspace directory. */
    workspace: {
        /** The original path provided in the sandbox options. */
        original: string;
        /** The real path. */
        resolved: string;
    };
    /** Explicitly denied paths. */
    forbidden: string[];
    /** Directories included globally across all commands in this sandbox session. */
    globalIncludes: string[];
    /** Paths explicitly allowed by the policy of the currently executing command. */
    policyAllowed: string[];
    /** Paths granted temporary read access by the current command's dynamic permissions. */
    policyRead: string[];
    /** Paths granted temporary write access by the current command's dynamic permissions. */
    policyWrite: string[];
    /** Auto-detected paths for git worktrees/submodules. */
    gitWorktree?: {
        /** The actual .git directory for this worktree. */
        worktreeGitDir: string;
        /** The main repository's .git directory (if applicable). */
        mainGitDir?: string;
    };
}
export interface SandboxPermissions {
    /** Filesystem permissions. */
    fileSystem?: {
        /** Paths that should be readable by the command. */
        read?: string[];
        /** Paths that should be writable by the command. */
        write?: string[];
    };
    /** Whether the command should have network access. */
    network?: boolean;
}
/**
 * Security boundaries and permissions applied to a specific sandboxed execution.
 */
export interface ExecutionPolicy {
    /** Additional absolute paths to grant full read/write access to. */
    allowedPaths?: string[];
    /** Whether network access is allowed. */
    networkAccess?: boolean;
    /** Rules for scrubbing sensitive environment variables. */
    sanitizationConfig?: Partial<EnvironmentSanitizationConfig>;
    /** Additional granular permissions to grant to this command. */
    additionalPermissions?: SandboxPermissions;
}
/**
 * Configuration for the sandbox mode behavior.
 */
export interface SandboxModeConfig {
    readonly?: boolean;
    network?: boolean;
    approvedTools?: string[];
    allowOverrides?: boolean;
    yolo?: boolean;
}
/**
 * Global configuration options used to initialize a SandboxManager.
 */
export interface GlobalSandboxOptions {
    /** The absolute path to the primary workspace directory, granted full read/write access. */
    workspace: string;
    /** Absolute paths to explicitly include in the workspace context. */
    includeDirectories?: string[];
    /** An optional asynchronous resolver function for paths that should be explicitly denied. */
    forbiddenPaths?: () => Promise<string[]>;
    /** The current sandbox mode behavior from config. */
    modeConfig?: SandboxModeConfig;
    /** The policy manager for persistent approvals. */
    policyManager?: SandboxPolicyManager;
}
/**
 * Request for preparing a command to run in a sandbox.
 */
export interface SandboxRequest {
    /** The program to execute. */
    command: string;
    /** Arguments for the program. */
    args: string[];
    /** The working directory. */
    cwd: string;
    /** Environment variables to be passed to the program. */
    env: NodeJS.ProcessEnv;
    /** Policy to use for this request. */
    policy?: ExecutionPolicy;
}
/**
 * A command that has been prepared for sandboxed execution.
 */
export interface SandboxedCommand {
    /** The program or wrapper to execute. */
    program: string;
    /** Final arguments for the program. */
    args: string[];
    /** Sanitized environment variables. */
    env: NodeJS.ProcessEnv;
    /** The working directory. */
    cwd?: string;
    /** An optional cleanup function to be called after the command terminates. */
    cleanup?: () => void;
}
/**
 * A structured result from parsing sandbox denials.
 */
export interface ParsedSandboxDenial {
    /** If the denial is related to file system access, these are the paths that were blocked. */
    filePaths?: string[];
    /** If the denial is related to network access. */
    network?: boolean;
}
/**
 * Interface for a service that prepares commands for sandboxed execution.
 */
export interface SandboxManager {
    /**
     * Prepares a command to run in a sandbox, including environment sanitization.
     */
    prepareCommand(req: SandboxRequest): Promise<SandboxedCommand>;
    /**
     * Checks if a command with its arguments is known to be safe for this sandbox.
     */
    isKnownSafeCommand(args: string[]): boolean;
    /**
     * Checks if a command with its arguments is explicitly known to be dangerous for this sandbox.
     */
    isDangerousCommand(args: string[]): boolean;
    /**
     * Parses the output of a command to detect sandbox denials.
     */
    parseDenials(result: ShellExecutionResult): ParsedSandboxDenial | undefined;
    /**
     * Returns the primary workspace directory for this sandbox.
     */
    getWorkspace(): string;
    /**
     * Returns the global sandbox options for this sandbox.
     */
    getOptions(): GlobalSandboxOptions | undefined;
}
/**
 * Files that represent the governance or "constitution" of the repository
 * and should be write-protected in any sandbox.
 */
export declare const GOVERNANCE_FILES: readonly [{
    readonly path: ".gitignore";
    readonly isDirectory: false;
}, {
    readonly path: ".geminiignore";
    readonly isDirectory: false;
}, {
    readonly path: ".git";
    readonly isDirectory: true;
}];
/**
 * Files that contain sensitive secrets or credentials and should be
 * completely hidden (deny read/write) in any sandbox.
 */
export declare const SECRET_FILES: readonly [{
    readonly pattern: ".env";
}, {
    readonly pattern: ".env.*";
}];
/**
 * Checks if a given file name matches any of the secret file patterns.
 */
export declare function isSecretFile(fileName: string): boolean;
/**
 * Returns arguments for the Linux 'find' command to locate secret files.
 */
export declare function getSecretFileFindArgs(): string[];
/**
 * Finds all secret files in a directory up to a certain depth.
 * Default is shallow scan (depth 1) for performance.
 */
export declare function findSecretFiles(baseDir: string, maxDepth?: number): Promise<string[]>;
/**
 * A no-op implementation of SandboxManager that silently passes commands
 * through while applying environment sanitization.
 */
export declare class NoopSandboxManager implements SandboxManager {
    private options?;
    constructor(options?: GlobalSandboxOptions | undefined);
    /**
     * Prepares a command by sanitizing the environment and passing through
     * the original program and arguments.
     */
    prepareCommand(req: SandboxRequest): Promise<SandboxedCommand>;
    isKnownSafeCommand(args: string[]): boolean;
    isDangerousCommand(args: string[]): boolean;
    parseDenials(): undefined;
    getWorkspace(): string;
    getOptions(): GlobalSandboxOptions | undefined;
}
/**
 * A SandboxManager implementation that just runs locally (no sandboxing yet).
 */
export declare class LocalSandboxManager implements SandboxManager {
    private options?;
    constructor(options?: GlobalSandboxOptions | undefined);
    prepareCommand(_req: SandboxRequest): Promise<SandboxedCommand>;
    isKnownSafeCommand(_args: string[]): boolean;
    isDangerousCommand(_args: string[]): boolean;
    parseDenials(): undefined;
    getWorkspace(): string;
    getOptions(): GlobalSandboxOptions | undefined;
}
/**
 * Resolves and sanitizes all path categories for a sandbox request.
 */
export declare function resolveSandboxPaths(options: GlobalSandboxOptions, req: SandboxRequest, overridePermissions?: SandboxPermissions): Promise<ResolvedSandboxPaths>;
export { createSandboxManager } from './sandboxManagerFactory.js';
