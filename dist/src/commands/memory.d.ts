/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
import type { MessageActionReturn, ToolActionReturn } from './types.js';
export declare function showMemory(config: Config): MessageActionReturn;
export declare function addMemory(args?: string): MessageActionReturn | ToolActionReturn;
export declare function refreshMemory(config: Config): Promise<MessageActionReturn>;
export declare function listMemoryFiles(config: Config): MessageActionReturn;
/**
 * Represents a skill found in the extraction inbox.
 */
export interface InboxSkill {
    /** Directory name in the inbox. */
    dirName: string;
    /** Skill name from SKILL.md frontmatter. */
    name: string;
    /** Skill description from SKILL.md frontmatter. */
    description: string;
    /** Raw SKILL.md content for preview. */
    content: string;
    /** When the skill was extracted (ISO string), if known. */
    extractedAt?: string;
}
/**
 * Scans the skill extraction inbox and returns structured data
 * for each extracted skill.
 */
export declare function listInboxSkills(config: Config): Promise<InboxSkill[]>;
export type InboxSkillDestination = 'global' | 'project';
/**
 * Copies an inbox skill to the target skills directory.
 */
export declare function moveInboxSkill(config: Config, dirName: string, destination: InboxSkillDestination): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * Removes a skill from the extraction inbox.
 */
export declare function dismissInboxSkill(config: Config, dirName: string): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * A parsed patch entry from a unified diff, representing changes to a single file.
 */
export interface InboxPatchEntry {
    /** Absolute path to the target file (or '/dev/null' for new files). */
    targetPath: string;
    /** The unified diff text for this single file. */
    diffContent: string;
}
/**
 * Represents a .patch file found in the extraction inbox.
 */
export interface InboxPatch {
    /** The .patch filename (e.g. "update-docs-writer.patch"). */
    fileName: string;
    /** Display name (filename without .patch extension). */
    name: string;
    /** Per-file entries parsed from the patch. */
    entries: InboxPatchEntry[];
    /** When the patch was extracted (ISO string), if known. */
    extractedAt?: string;
}
/**
 * Scans the skill extraction inbox for .patch files and returns
 * structured data for each valid patch.
 */
export declare function listInboxPatches(config: Config): Promise<InboxPatch[]>;
/**
 * Applies a .patch file from the inbox by reading each target file,
 * applying the diff, and writing the result. Deletes the patch on success.
 */
export declare function applyInboxPatch(config: Config, fileName: string): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * Removes a .patch file from the extraction inbox.
 */
export declare function dismissInboxPatch(config: Config, fileName: string): Promise<{
    success: boolean;
    message: string;
}>;
