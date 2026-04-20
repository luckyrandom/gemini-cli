/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as Diff from 'diff';
import { Storage } from '../config/storage.js';
import { isNodeError } from '../utils/errors.js';
import { debugLogger } from '../utils/debugLogger.js';
import { isSubpath } from '../utils/paths.js';
export function getAllowedSkillPatchRoots(config) {
    return Array.from(new Set([Storage.getUserSkillsDir(), config.storage.getProjectSkillsDir()].map((root) => path.resolve(root))));
}
async function resolvePathWithExistingAncestors(targetPath) {
    const missingSegments = [];
    let currentPath = path.resolve(targetPath);
    while (true) {
        try {
            const realCurrentPath = await fs.realpath(currentPath);
            return path.join(realCurrentPath, ...missingSegments.reverse());
        }
        catch (error) {
            if (!isNodeError(error) ||
                (error.code !== 'ENOENT' && error.code !== 'ENOTDIR')) {
                return undefined;
            }
            const parentPath = path.dirname(currentPath);
            if (parentPath === currentPath) {
                return undefined;
            }
            missingSegments.push(path.basename(currentPath));
            currentPath = parentPath;
        }
    }
}
async function getCanonicalAllowedSkillPatchRoots(config) {
    const canonicalRoots = await Promise.all(getAllowedSkillPatchRoots(config).map((root) => resolvePathWithExistingAncestors(root)));
    return Array.from(new Set(canonicalRoots.filter((root) => typeof root === 'string')));
}
export async function resolveAllowedSkillPatchTarget(targetPath, config) {
    const canonicalTargetPath = await resolvePathWithExistingAncestors(targetPath);
    if (!canonicalTargetPath) {
        return undefined;
    }
    const allowedRoots = await getCanonicalAllowedSkillPatchRoots(config);
    if (allowedRoots.some((root) => isSubpath(root, canonicalTargetPath))) {
        return canonicalTargetPath;
    }
    return undefined;
}
export async function isAllowedSkillPatchTarget(targetPath, config) {
    return ((await resolveAllowedSkillPatchTarget(targetPath, config)) !== undefined);
}
function isAbsoluteSkillPatchPath(targetPath) {
    return targetPath !== '/dev/null' && path.isAbsolute(targetPath);
}
const GIT_DIFF_PREFIX_RE = /^[ab]\//;
/**
 * Strips git-style `a/` or `b/` prefixes from a patch filename.
 * Logs a warning when stripping occurs so we can track LLM formatting issues.
 */
function stripGitDiffPrefix(fileName) {
    if (GIT_DIFF_PREFIX_RE.test(fileName)) {
        const stripped = fileName.replace(GIT_DIFF_PREFIX_RE, '');
        debugLogger.warn(`[memoryPatchUtils] Stripped git diff prefix from patch header: "${fileName}" → "${stripped}"`);
        return stripped;
    }
    return fileName;
}
export function validateParsedSkillPatchHeaders(parsedPatches) {
    const validatedPatches = [];
    for (const patch of parsedPatches) {
        const oldFileName = patch.oldFileName
            ? stripGitDiffPrefix(patch.oldFileName)
            : patch.oldFileName;
        const newFileName = patch.newFileName
            ? stripGitDiffPrefix(patch.newFileName)
            : patch.newFileName;
        if (!oldFileName || !newFileName) {
            return {
                success: false,
                reason: 'missingTargetPath',
            };
        }
        if (oldFileName === '/dev/null') {
            if (!isAbsoluteSkillPatchPath(newFileName)) {
                return {
                    success: false,
                    reason: 'invalidPatchHeaders',
                    targetPath: newFileName,
                };
            }
            validatedPatches.push({
                targetPath: newFileName,
                isNewFile: true,
            });
            continue;
        }
        if (!isAbsoluteSkillPatchPath(oldFileName) ||
            !isAbsoluteSkillPatchPath(newFileName) ||
            oldFileName !== newFileName) {
            return {
                success: false,
                reason: 'invalidPatchHeaders',
                targetPath: newFileName,
            };
        }
        validatedPatches.push({
            targetPath: newFileName,
            isNewFile: false,
        });
    }
    return {
        success: true,
        patches: validatedPatches,
    };
}
export async function isProjectSkillPatchTarget(targetPath, config) {
    const canonicalTargetPath = await resolvePathWithExistingAncestors(targetPath);
    if (!canonicalTargetPath) {
        return false;
    }
    const canonicalProjectSkillsDir = await resolvePathWithExistingAncestors(config.storage.getProjectSkillsDir());
    if (!canonicalProjectSkillsDir) {
        return false;
    }
    return isSubpath(canonicalProjectSkillsDir, canonicalTargetPath);
}
export function hasParsedPatchHunks(parsedPatches) {
    return (parsedPatches.length > 0 &&
        parsedPatches.every((patch) => patch.hunks.length > 0));
}
export async function applyParsedSkillPatches(parsedPatches, config) {
    const results = new Map();
    const patchedContentByTarget = new Map();
    const originalContentByTarget = new Map();
    const validatedHeaders = validateParsedSkillPatchHeaders(parsedPatches);
    if (!validatedHeaders.success) {
        return validatedHeaders;
    }
    for (const [index, patch] of parsedPatches.entries()) {
        const { targetPath, isNewFile } = validatedHeaders.patches[index];
        const resolvedTargetPath = await resolveAllowedSkillPatchTarget(targetPath, config);
        if (!resolvedTargetPath) {
            return {
                success: false,
                reason: 'outsideAllowedRoots',
                targetPath,
            };
        }
        let source;
        if (patchedContentByTarget.has(resolvedTargetPath)) {
            source = patchedContentByTarget.get(resolvedTargetPath);
        }
        else if (isNewFile) {
            try {
                await fs.lstat(resolvedTargetPath);
                return {
                    success: false,
                    reason: 'newFileAlreadyExists',
                    targetPath,
                    isNewFile: true,
                };
            }
            catch (error) {
                if (!isNodeError(error) ||
                    (error.code !== 'ENOENT' && error.code !== 'ENOTDIR')) {
                    return {
                        success: false,
                        reason: 'targetNotFound',
                        targetPath,
                        isNewFile: true,
                    };
                }
            }
            source = '';
            originalContentByTarget.set(resolvedTargetPath, source);
        }
        else {
            try {
                source = await fs.readFile(resolvedTargetPath, 'utf-8');
                originalContentByTarget.set(resolvedTargetPath, source);
            }
            catch {
                return {
                    success: false,
                    reason: 'targetNotFound',
                    targetPath,
                };
            }
        }
        const applied = Diff.applyPatch(source, patch);
        if (applied === false) {
            return {
                success: false,
                reason: 'doesNotApply',
                targetPath,
                isNewFile: results.get(resolvedTargetPath)?.isNewFile ?? isNewFile,
            };
        }
        patchedContentByTarget.set(resolvedTargetPath, applied);
        results.set(resolvedTargetPath, {
            targetPath: resolvedTargetPath,
            original: originalContentByTarget.get(resolvedTargetPath) ?? '',
            patched: applied,
            isNewFile: results.get(resolvedTargetPath)?.isNewFile ?? isNewFile,
        });
    }
    return {
        success: true,
        results: Array.from(results.values()),
    };
}
//# sourceMappingURL=memoryPatchUtils.js.map