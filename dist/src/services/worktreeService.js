/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { execa } from 'execa';
import { debugLogger } from '../utils/debugLogger.js';
/**
 * Service for managing Git worktrees within Gemini CLI.
 * Handles creation, cleanup, and environment setup for isolated sessions.
 */
export class WorktreeService {
    projectRoot;
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
    }
    /**
     * Creates a new worktree and prepares the environment.
     */
    async setup(name) {
        let worktreeName = name?.trim();
        if (!worktreeName) {
            const now = new Date();
            const timestamp = now
                .toISOString()
                .replace(/[:.]/g, '-')
                .replace('T', '-')
                .replace('Z', '');
            const randomSuffix = Math.random().toString(36).substring(2, 6);
            worktreeName = `${timestamp}-${randomSuffix}`;
        }
        // Capture the base commit before creating the worktree
        const { stdout: baseSha } = await execa('git', ['rev-parse', 'HEAD'], {
            cwd: this.projectRoot,
        });
        const worktreePath = await createWorktree(this.projectRoot, worktreeName);
        return {
            name: worktreeName,
            path: worktreePath,
            baseSha: baseSha.trim(),
        };
    }
    /**
     * Checks if a worktree has changes and cleans it up if it's unmodified.
     */
    async maybeCleanup(info) {
        const hasChanges = await hasWorktreeChanges(info.path, info.baseSha);
        if (!hasChanges) {
            try {
                await cleanupWorktree(info.path, this.projectRoot);
                debugLogger.log(`Automatically cleaned up unmodified worktree: ${info.path}`);
                return true;
            }
            catch (error) {
                debugLogger.error(`Failed to clean up worktree ${info.path}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        else {
            debugLogger.debug(`Preserving worktree ${info.path} because it has changes.`);
        }
        return false;
    }
}
export async function createWorktreeService(cwd) {
    const projectRoot = await getProjectRootForWorktree(cwd);
    return new WorktreeService(projectRoot);
}
// Low-level worktree utilities
export async function getProjectRootForWorktree(cwd) {
    try {
        const { stdout } = await execa('git', ['rev-parse', '--git-common-dir'], {
            cwd,
        });
        const gitCommonDir = stdout.trim();
        const absoluteGitDir = path.isAbsolute(gitCommonDir)
            ? gitCommonDir
            : path.resolve(cwd, gitCommonDir);
        // The project root is the parent of the .git directory/file
        return path.dirname(absoluteGitDir);
    }
    catch (e) {
        debugLogger.debug(`Failed to get project root for worktree at ${cwd}: ${e instanceof Error ? e.message : String(e)}`);
        return cwd;
    }
}
export function getWorktreePath(projectRoot, name) {
    return path.join(projectRoot, '.gemini', 'worktrees', name);
}
export async function createWorktree(projectRoot, name) {
    const worktreePath = getWorktreePath(projectRoot, name);
    const branchName = `worktree-${name}`;
    await execa('git', ['worktree', 'add', worktreePath, '-b', branchName], {
        cwd: projectRoot,
    });
    return worktreePath;
}
export function isGeminiWorktree(dirPath, projectRoot) {
    try {
        const realDirPath = realpathSync(dirPath);
        const realProjectRoot = realpathSync(projectRoot);
        const worktreesBaseDir = path.join(realProjectRoot, '.gemini', 'worktrees');
        const relative = path.relative(worktreesBaseDir, realDirPath);
        return !relative.startsWith('..') && !path.isAbsolute(relative);
    }
    catch {
        return false;
    }
}
export async function hasWorktreeChanges(dirPath, baseSha) {
    try {
        // 1. Check for uncommitted changes (index or working tree)
        const { stdout: status } = await execa('git', ['status', '--porcelain'], {
            cwd: dirPath,
        });
        if (status.trim() !== '') {
            return true;
        }
        // 2. Check if the current commit has moved from the base
        if (baseSha) {
            const { stdout: currentSha } = await execa('git', ['rev-parse', 'HEAD'], {
                cwd: dirPath,
            });
            if (currentSha.trim() !== baseSha) {
                return true;
            }
        }
        return false;
    }
    catch (e) {
        debugLogger.debug(`Failed to check worktree changes at ${dirPath}: ${e instanceof Error ? e.message : String(e)}`);
        // If any git command fails, assume the worktree is dirty to be safe.
        return true;
    }
}
export async function cleanupWorktree(dirPath, projectRoot) {
    try {
        await fs.access(dirPath);
    }
    catch {
        return; // Worktree already gone
    }
    let branchName;
    try {
        // 1. Discover the branch name associated with this worktree path
        const { stdout } = await execa('git', ['-C', dirPath, 'branch', '--show-current'], {
            cwd: projectRoot,
        });
        branchName = stdout.trim() || undefined;
        // 2. Remove the worktree
        await execa('git', ['worktree', 'remove', dirPath, '--force'], {
            cwd: projectRoot,
        });
    }
    catch (e) {
        debugLogger.debug(`Failed to remove worktree ${dirPath}: ${e instanceof Error ? e.message : String(e)}`);
    }
    finally {
        // 3. Delete the branch if we found it
        if (branchName) {
            try {
                await execa('git', ['branch', '-D', branchName], {
                    cwd: projectRoot,
                });
            }
            catch (e) {
                debugLogger.debug(`Failed to delete branch ${branchName}: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
    }
}
//# sourceMappingURL=worktreeService.js.map