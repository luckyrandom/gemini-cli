/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { AgentDefinition } from './types.js';
import { z } from 'zod';
import type { AgentLoopContext } from '../config/agent-loop-context.js';
declare const CliHelpReportSchema: z.ZodObject<{
    answer: z.ZodString;
    sources: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    sources: string[];
    answer: string;
}, {
    sources: string[];
    answer: string;
}>;
/**
 * An agent specialized in answering questions about Gemini CLI itself,
 * using its own documentation and runtime state.
 */
export declare const CliHelpAgent: (context: AgentLoopContext) => AgentDefinition<typeof CliHelpReportSchema>;
export {};
