/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface WorktreeInfo {
    name: string;
    path: string;
    baseSha: string;
}
/**
 * Service for managing Git worktrees within Gemini CLI.
 * Handles creation, cleanup, and environment setup for isolated sessions.
 */
export declare class WorktreeService {
    private readonly projectRoot;
    constructor(projectRoot: string);
    /**
     * Creates a new worktree and prepares the environment.
     */
    setup(name?: string): Promise<WorktreeInfo>;
    /**
     * Checks if a worktree has changes and cleans it up if it's unmodified.
     */
    maybeCleanup(info: WorktreeInfo): Promise<boolean>;
}
export declare function createWorktreeService(cwd: string): Promise<WorktreeService>;
export declare function getProjectRootForWorktree(cwd: string): Promise<string>;
export declare function getWorktreePath(projectRoot: string, name: string): string;
export declare function createWorktree(projectRoot: string, name: string): Promise<string>;
export declare function isGeminiWorktree(dirPath: string, projectRoot: string): boolean;
export declare function hasWorktreeChanges(dirPath: string, baseSha?: string): Promise<boolean>;
export declare function cleanupWorktree(dirPath: string, projectRoot: string): Promise<void>;
