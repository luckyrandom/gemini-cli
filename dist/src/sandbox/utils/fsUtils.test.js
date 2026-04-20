/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { resolveGitWorktreePaths } from './fsUtils.js';
vi.mock('node:fs/promises', async () => {
    const actual = await vi.importActual('node:fs/promises');
    return {
        ...actual,
        default: {
            ...actual,
            lstat: vi.fn(),
            readFile: vi.fn(),
        },
        lstat: vi.fn(),
        readFile: vi.fn(),
    };
});
vi.mock('../../utils/paths.js', async () => {
    const actual = await vi.importActual('../../utils/paths.js');
    return {
        ...actual,
        resolveToRealPath: vi.fn((p) => p),
    };
});
describe('fsUtils', () => {
    describe('resolveGitWorktreePaths', () => {
        const workspace = path.resolve('/workspace');
        const gitPath = path.join(workspace, '.git');
        beforeEach(() => {
            vi.clearAllMocks();
        });
        it('should return empty if .git does not exist', async () => {
            vi.mocked(fsPromises.lstat).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
            const result = await resolveGitWorktreePaths(workspace);
            expect(result).toEqual({});
        });
        it('should return empty if .git is a directory', async () => {
            vi.mocked(fsPromises.lstat).mockResolvedValue({
                isFile: () => false,
            });
            const result = await resolveGitWorktreePaths(workspace);
            expect(result).toEqual({});
        });
        it('should resolve worktree paths from .git file', async () => {
            const mainGitDir = path.resolve('/project/.git');
            const worktreeGitDir = path.join(mainGitDir, 'worktrees', 'feature');
            vi.mocked(fsPromises.lstat).mockResolvedValue({
                isFile: () => true,
            });
            vi.mocked(fsPromises.readFile).mockImplementation(((p) => {
                if (p === gitPath)
                    return Promise.resolve(`gitdir: ${worktreeGitDir}`);
                if (p === path.join(worktreeGitDir, 'gitdir'))
                    return Promise.resolve(gitPath);
                return Promise.reject(new Error('ENOENT'));
            }));
            const result = await resolveGitWorktreePaths(workspace);
            expect(result).toEqual({
                worktreeGitDir,
                mainGitDir,
            });
        });
        it('should reject worktree if backlink is missing or invalid', async () => {
            const worktreeGitDir = path.resolve('/git/worktrees/feature');
            vi.mocked(fsPromises.lstat).mockResolvedValue({
                isFile: () => true,
            });
            vi.mocked(fsPromises.readFile).mockImplementation(((p) => {
                if (p === gitPath)
                    return Promise.resolve(`gitdir: ${worktreeGitDir}`);
                return Promise.reject(new Error('ENOENT'));
            }));
            const result = await resolveGitWorktreePaths(workspace);
            expect(result).toEqual({});
        });
        it('should support submodules via config check', async () => {
            const submoduleGitDir = path.resolve('/project/.git/modules/sub');
            vi.mocked(fsPromises.lstat).mockResolvedValue({
                isFile: () => true,
            });
            vi.mocked(fsPromises.readFile).mockImplementation(((p) => {
                if (p === gitPath)
                    return Promise.resolve(`gitdir: ${submoduleGitDir}`);
                if (p === path.join(submoduleGitDir, 'config'))
                    return Promise.resolve(`[core]\n\tworktree = ${workspace}`);
                return Promise.reject(new Error('ENOENT'));
            }));
            const result = await resolveGitWorktreePaths(workspace);
            expect(result).toEqual({
                worktreeGitDir: submoduleGitDir,
                mainGitDir: path.resolve('/project/.git'),
            });
        });
    });
});
//# sourceMappingURL=fsUtils.test.js.map