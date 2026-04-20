/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { isKnownSafeCommand as isMacSafeCommand, isDangerousCommand as isMacDangerousCommand, } from '../sandbox/utils/commandSafety.js';
import { isKnownSafeCommand as isWindowsSafeCommand, isDangerousCommand as isWindowsDangerousCommand, } from '../sandbox/windows/commandSafety.js';
import { sanitizeEnvironment, getSecureSanitizationConfig, } from './environmentSanitization.js';
import { toPathKey, deduplicateAbsolutePaths, resolveToRealPath, } from '../utils/paths.js';
import { resolveGitWorktreePaths } from '../sandbox/utils/fsUtils.js';
/**
 * Files that represent the governance or "constitution" of the repository
 * and should be write-protected in any sandbox.
 */
export const GOVERNANCE_FILES = [
    { path: '.gitignore', isDirectory: false },
    { path: '.geminiignore', isDirectory: false },
    { path: '.git', isDirectory: true },
];
/**
 * Files that contain sensitive secrets or credentials and should be
 * completely hidden (deny read/write) in any sandbox.
 */
export const SECRET_FILES = [
    { pattern: '.env' },
    { pattern: '.env.*' },
];
/**
 * Checks if a given file name matches any of the secret file patterns.
 */
export function isSecretFile(fileName) {
    return SECRET_FILES.some((s) => {
        if (s.pattern.endsWith('*')) {
            const prefix = s.pattern.slice(0, -1);
            return fileName.startsWith(prefix);
        }
        return fileName === s.pattern;
    });
}
/**
 * Returns arguments for the Linux 'find' command to locate secret files.
 */
export function getSecretFileFindArgs() {
    const args = ['('];
    SECRET_FILES.forEach((s, i) => {
        if (i > 0)
            args.push('-o');
        args.push('-name', s.pattern);
    });
    args.push(')');
    return args;
}
/**
 * Finds all secret files in a directory up to a certain depth.
 * Default is shallow scan (depth 1) for performance.
 */
export async function findSecretFiles(baseDir, maxDepth = 1) {
    const secrets = [];
    const skipDirs = new Set([
        'node_modules',
        '.git',
        '.venv',
        '__pycache__',
        'dist',
        'build',
        '.next',
        '.idea',
        '.vscode',
    ]);
    async function walk(dir, depth) {
        if (depth > maxDepth)
            return;
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (!skipDirs.has(entry.name)) {
                        await walk(fullPath, depth + 1);
                    }
                }
                else if (entry.isFile()) {
                    if (isSecretFile(entry.name)) {
                        secrets.push(fullPath);
                    }
                }
            }
        }
        catch {
            // Ignore read errors
        }
    }
    await walk(baseDir, 1);
    return secrets;
}
/**
 * A no-op implementation of SandboxManager that silently passes commands
 * through while applying environment sanitization.
 */
export class NoopSandboxManager {
    options;
    constructor(options) {
        this.options = options;
    }
    /**
     * Prepares a command by sanitizing the environment and passing through
     * the original program and arguments.
     */
    async prepareCommand(req) {
        const sanitizationConfig = getSecureSanitizationConfig(req.policy?.sanitizationConfig);
        const sanitizedEnv = sanitizeEnvironment(req.env, sanitizationConfig);
        return {
            program: req.command,
            args: req.args,
            env: sanitizedEnv,
        };
    }
    isKnownSafeCommand(args) {
        return os.platform() === 'win32'
            ? isWindowsSafeCommand(args)
            : isMacSafeCommand(args);
    }
    isDangerousCommand(args) {
        return os.platform() === 'win32'
            ? isWindowsDangerousCommand(args)
            : isMacDangerousCommand(args);
    }
    parseDenials() {
        return undefined;
    }
    getWorkspace() {
        return this.options?.workspace ?? process.cwd();
    }
    getOptions() {
        return this.options;
    }
}
/**
 * A SandboxManager implementation that just runs locally (no sandboxing yet).
 */
export class LocalSandboxManager {
    options;
    constructor(options) {
        this.options = options;
    }
    async prepareCommand(_req) {
        throw new Error('Tool sandboxing is not yet implemented.');
    }
    isKnownSafeCommand(_args) {
        return false;
    }
    isDangerousCommand(_args) {
        return false;
    }
    parseDenials() {
        return undefined;
    }
    getWorkspace() {
        return this.options?.workspace ?? process.cwd();
    }
    getOptions() {
        return this.options;
    }
}
/**
 * Resolves and sanitizes all path categories for a sandbox request.
 */
export async function resolveSandboxPaths(options, req, overridePermissions) {
    /**
     * Helper that expands each path to include its realpath (if it's a symlink)
     * and pipes the result through deduplicateAbsolutePaths for deduplication and absolute path enforcement.
     */
    const expand = (paths) => {
        if (!paths || paths.length === 0)
            return [];
        const expanded = paths.flatMap((p) => {
            try {
                const resolved = resolveToRealPath(p);
                return resolved === p ? [p] : [p, resolved];
            }
            catch {
                return [p];
            }
        });
        return deduplicateAbsolutePaths(expanded);
    };
    const forbidden = expand(await options.forbiddenPaths?.());
    const globalIncludes = expand(options.includeDirectories);
    const policyAllowed = expand(req.policy?.allowedPaths);
    const policyRead = expand(overridePermissions?.fileSystem?.read);
    const policyWrite = expand(overridePermissions?.fileSystem?.write);
    const resolvedWorkspace = resolveToRealPath(options.workspace);
    const workspaceIdentities = new Set([options.workspace, resolvedWorkspace].map(toPathKey));
    const forbiddenIdentities = new Set(forbidden.map(toPathKey));
    const { worktreeGitDir, mainGitDir } = await resolveGitWorktreePaths(resolvedWorkspace);
    const gitWorktree = worktreeGitDir
        ? { gitWorktree: { worktreeGitDir, mainGitDir } }
        : undefined;
    if (worktreeGitDir) {
        const gitIdentities = new Set([
            path.join(options.workspace, '.git'),
            path.join(resolvedWorkspace, '.git'),
        ].map(toPathKey));
        if (policyRead.some((p) => gitIdentities.has(toPathKey(p)))) {
            policyRead.push(worktreeGitDir);
            if (mainGitDir)
                policyRead.push(mainGitDir);
        }
        if (policyWrite.some((p) => gitIdentities.has(toPathKey(p)))) {
            policyWrite.push(worktreeGitDir);
            if (mainGitDir)
                policyWrite.push(mainGitDir);
        }
    }
    /**
     * Filters out any paths that are explicitly forbidden or match the workspace root (original or resolved).
     */
    const filter = (paths) => paths.filter((p) => {
        const identity = toPathKey(p);
        return (!workspaceIdentities.has(identity) && !forbiddenIdentities.has(identity));
    });
    return {
        workspace: {
            original: options.workspace,
            resolved: resolvedWorkspace,
        },
        forbidden,
        globalIncludes: filter(globalIncludes),
        policyAllowed: filter(policyAllowed),
        policyRead: filter(policyRead),
        policyWrite: filter(policyWrite),
        ...gitWorktree,
    };
}
export { createSandboxManager } from './sandboxManagerFactory.js';
//# sourceMappingURL=sandboxManager.js.map