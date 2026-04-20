/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { StructuredPatch } from 'diff';
import type { Config } from '../config/config.js';
export declare function getAllowedSkillPatchRoots(config: Config): string[];
export declare function resolveAllowedSkillPatchTarget(targetPath: string, config: Config): Promise<string | undefined>;
export declare function isAllowedSkillPatchTarget(targetPath: string, config: Config): Promise<boolean>;
interface ValidatedSkillPatchHeader {
    targetPath: string;
    isNewFile: boolean;
}
type ValidateParsedSkillPatchHeadersResult = {
    success: true;
    patches: ValidatedSkillPatchHeader[];
} | {
    success: false;
    reason: 'missingTargetPath' | 'invalidPatchHeaders';
    targetPath?: string;
};
export declare function validateParsedSkillPatchHeaders(parsedPatches: StructuredPatch[]): ValidateParsedSkillPatchHeadersResult;
export declare function isProjectSkillPatchTarget(targetPath: string, config: Config): Promise<boolean>;
export declare function hasParsedPatchHunks(parsedPatches: StructuredPatch[]): boolean;
export interface AppliedSkillPatchTarget {
    targetPath: string;
    original: string;
    patched: string;
    isNewFile: boolean;
}
export type ApplyParsedSkillPatchesResult = {
    success: true;
    results: AppliedSkillPatchTarget[];
} | {
    success: false;
    reason: 'missingTargetPath' | 'invalidPatchHeaders' | 'outsideAllowedRoots' | 'newFileAlreadyExists' | 'targetNotFound' | 'doesNotApply';
    targetPath?: string;
    isNewFile?: boolean;
};
export declare function applyParsedSkillPatches(parsedPatches: StructuredPatch[], config: Config): Promise<ApplyParsedSkillPatchesResult>;
export {};
