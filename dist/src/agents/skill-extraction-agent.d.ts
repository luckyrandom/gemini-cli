/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { z } from 'zod';
import type { LocalAgentDefinition } from './types.js';
declare const SkillExtractionSchema: z.ZodObject<{
    response: z.ZodString;
}, "strip", z.ZodTypeAny, {
    response: string;
}, {
    response: string;
}>;
/**
 * A skill extraction agent that analyzes past conversation sessions and
 * writes reusable SKILL.md files to the project memory directory.
 *
 * This agent is designed to run in the background on session startup.
 * It has restricted tool access (file tools, shell, and skill activation — no
 * user interaction) and is prompted to only operate within the skills memory
 * directory.
 */
export declare const SkillExtractionAgent: (skillsDir: string, sessionIndex: string, existingSkillsSummary: string) => LocalAgentDefinition<typeof SkillExtractionSchema>;
export {};
