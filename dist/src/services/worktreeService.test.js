/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { getProjectRootForWorktree, createWorktree, isGeminiWorktree, hasWorktreeChanges, cleanupWorktree, getWorktreePath, WorktreeService, } from './worktreeService.js';
import { execa } from 'execa';
vi.mock('execa');
vi.mock('node:fs/promises');
vi.mock('node:fs', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        realpathSync: vi.fn((p) => p),
    };
});
describe('worktree utilities', () => {
    const projectRoot = path.resolve('/mock/project');
    const worktreeName = 'test-feature';
    const expectedPath = path.join(projectRoot, '.gemini', 'worktrees', worktreeName);
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('getProjectRootForWorktree', () => {
        it('should return the project root from git common dir', async () => {
            // In main repo, git-common-dir is often just ".git"
            vi.mocked(execa).mockResolvedValue({
                stdout: '.git\n',
            });
            const result = await getProjectRootForWorktree(projectRoot);
            expect(result).toBe(projectRoot);
            expect(execa).toHaveBeenCalledWith('git', ['rev-parse', '--git-common-dir'], { cwd: projectRoot });
        });
        it('should resolve absolute git common dir paths (as seen in worktrees)', async () => {
            // Inside a worktree, git-common-dir is usually an absolute path to the main .git folder
            vi.mocked(execa).mockResolvedValue({
                stdout: '/mock/project/.git\n',
            });
            const result = await getProjectRootForWorktree('/mock/project/.gemini/worktrees/my-feature');
            expect(result).toBe('/mock/project');
        });
        it('should fallback to cwd if git command fails', async () => {
            vi.mocked(execa).mockRejectedValue(new Error('not a git repo'));
            const result = await getProjectRootForWorktree('/mock/non-git/src');
            expect(result).toBe('/mock/non-git/src');
        });
    });
    describe('getWorktreePath', () => {
        it('should return the correct path for a given name', () => {
            expect(getWorktreePath(projectRoot, worktreeName)).toBe(expectedPath);
        });
    });
    describe('createWorktree', () => {
        it('should execute git worktree add with correct branch and path', async () => {
            vi.mocked(execa).mockResolvedValue({ stdout: '' });
            const resultPath = await createWorktree(projectRoot, worktreeName);
            expect(resultPath).toBe(expectedPath);
            expect(execa).toHaveBeenCalledWith('git', ['worktree', 'add', expectedPath, '-b', `worktree-${worktreeName}`], { cwd: projectRoot });
        });
        it('should throw an error if git worktree add fails', async () => {
            vi.mocked(execa).mockRejectedValue(new Error('git failed'));
            await expect(createWorktree(projectRoot, worktreeName)).rejects.toThrow('git failed');
        });
    });
    describe('isGeminiWorktree', () => {
        it('should return true for a valid gemini worktree path', () => {
            expect(isGeminiWorktree(expectedPath, projectRoot)).toBe(true);
            expect(isGeminiWorktree(path.join(expectedPath, 'src'), projectRoot)).toBe(true);
        });
        it('should return false for a path outside gemini worktrees', () => {
            expect(isGeminiWorktree(path.join(projectRoot, 'src'), projectRoot)).toBe(false);
            expect(isGeminiWorktree(path.resolve('/some/other/path'), projectRoot)).toBe(false);
        });
    });
    describe('hasWorktreeChanges', () => {
        it('should return true if git status --porcelain has output', async () => {
            vi.mocked(execa).mockResolvedValue({
                stdout: ' M somefile.txt\n?? newfile.txt',
            });
            const hasChanges = await hasWorktreeChanges(expectedPath);
            expect(hasChanges).toBe(true);
            expect(execa).toHaveBeenCalledWith('git', ['status', '--porcelain'], {
                cwd: expectedPath,
            });
        });
        it('should return true if there are untracked files', async () => {
            vi.mocked(execa).mockResolvedValue({
                stdout: '?? untracked-file.txt\n',
            });
            const hasChanges = await hasWorktreeChanges(expectedPath);
            expect(hasChanges).toBe(true);
        });
        it('should return true if HEAD differs from baseSha', async () => {
            vi.mocked(execa)
                .mockResolvedValueOnce({ stdout: '' }) // status clean
                .mockResolvedValueOnce({ stdout: 'different-sha' }); // HEAD moved
            const hasChanges = await hasWorktreeChanges(expectedPath, 'base-sha');
            expect(hasChanges).toBe(true);
        });
        it('should return false if status is clean and HEAD matches baseSha', async () => {
            vi.mocked(execa)
                .mockResolvedValueOnce({ stdout: '' }) // status clean
                .mockResolvedValueOnce({ stdout: 'base-sha' }); // HEAD same
            const hasChanges = await hasWorktreeChanges(expectedPath, 'base-sha');
            expect(hasChanges).toBe(false);
        });
        it('should return true if any git command fails', async () => {
            vi.mocked(execa).mockRejectedValue(new Error('git error'));
            const hasChanges = await hasWorktreeChanges(expectedPath);
            expect(hasChanges).toBe(true);
        });
    });
    describe('cleanupWorktree', () => {
        it('should remove the worktree and delete the branch', async () => {
            vi.mocked(fs.access).mockResolvedValue(undefined);
            vi.mocked(execa)
                .mockResolvedValueOnce({
                stdout: `worktree-${worktreeName}\n`,
            }) // branch --show-current
                .mockResolvedValueOnce({ stdout: '' }) // remove
                .mockResolvedValueOnce({ stdout: '' }); // branch -D
            await cleanupWorktree(expectedPath, projectRoot);
            expect(execa).toHaveBeenCalledTimes(3);
            expect(execa).toHaveBeenNthCalledWith(1, 'git', ['-C', expectedPath, 'branch', '--show-current'], { cwd: projectRoot });
            expect(execa).toHaveBeenNthCalledWith(2, 'git', ['worktree', 'remove', expectedPath, '--force'], { cwd: projectRoot });
            expect(execa).toHaveBeenNthCalledWith(3, 'git', ['branch', '-D', `worktree-${worktreeName}`], { cwd: projectRoot });
        });
        it('should handle branch discovery failure gracefully', async () => {
            vi.mocked(fs.access).mockResolvedValue(undefined);
            vi.mocked(execa)
                .mockResolvedValueOnce({ stdout: '' }) // no branch found
                .mockResolvedValueOnce({ stdout: '' }); // remove
            await cleanupWorktree(expectedPath, projectRoot);
            expect(execa).toHaveBeenCalledTimes(2);
            expect(execa).toHaveBeenNthCalledWith(2, 'git', ['worktree', 'remove', expectedPath, '--force'], { cwd: projectRoot });
        });
    });
});
describe('WorktreeService', () => {
    const projectRoot = path.resolve('/mock/project');
    const service = new WorktreeService(projectRoot);
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('setup', () => {
        it('should capture baseSha and create a worktree', async () => {
            vi.mocked(execa).mockResolvedValue({
                stdout: 'current-sha\n',
            });
            const info = await service.setup('feature-x');
            expect(execa).toHaveBeenCalledWith('git', ['rev-parse', 'HEAD'], {
                cwd: projectRoot,
            });
            expect(info.name).toBe('feature-x');
            expect(info.baseSha).toBe('current-sha');
            expect(info.path).toContain('feature-x');
        });
        it('should generate a timestamped name if none provided', async () => {
            vi.mocked(execa).mockResolvedValue({
                stdout: 'current-sha\n',
            });
            const info = await service.setup();
            expect(info.name).toMatch(/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}-\w+/);
            expect(info.path).toContain(info.name);
        });
    });
    describe('maybeCleanup', () => {
        const info = {
            name: 'feature-x',
            path: path.join(projectRoot, '.gemini', 'worktrees', 'feature-x'),
            baseSha: 'base-sha',
        };
        it('should cleanup unmodified worktrees', async () => {
            // Mock hasWorktreeChanges -> false (no changes)
            vi.mocked(execa)
                .mockResolvedValueOnce({ stdout: '' }) // status check
                .mockResolvedValueOnce({ stdout: 'base-sha' }); // SHA check
            vi.mocked(fs.access).mockResolvedValue(undefined);
            vi.mocked(execa).mockResolvedValue({ stdout: '' }); // cleanup calls
            const cleanedUp = await service.maybeCleanup(info);
            expect(cleanedUp).toBe(true);
            // Verify cleanupWorktree utilities were called (execa calls inside cleanupWorktree)
            expect(execa).toHaveBeenCalledWith(expect.anything(), expect.arrayContaining(['worktree', 'remove', info.path, '--force']), expect.anything());
        });
        it('should preserve modified worktrees', async () => {
            // Mock hasWorktreeChanges -> true (changes detected)
            vi.mocked(execa).mockResolvedValue({
                stdout: ' M modified-file.ts',
            });
            const cleanedUp = await service.maybeCleanup(info);
            expect(cleanedUp).toBe(false);
            // Ensure cleanupWorktree was NOT called
            expect(execa).not.toHaveBeenCalledWith(expect.anything(), expect.arrayContaining(['worktree', 'remove']), expect.anything());
        });
    });
});
//# sourceMappingURL=worktreeService.test.js.map