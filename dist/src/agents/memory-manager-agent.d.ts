/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { z } from 'zod';
import type { LocalAgentDefinition } from './types.js';
import type { Config } from '../config/config.js';
declare const MemoryManagerSchema: z.ZodObject<{
    response: z.ZodString;
}, "strip", z.ZodTypeAny, {
    response: string;
}, {
    response: string;
}>;
/**
 * A memory management agent that replaces the built-in save_memory tool.
 * It provides richer memory operations: adding, removing, de-duplicating,
 * and organizing memories in the global GEMINI.md file.
 *
 * Users can override this agent by placing a custom save_memory.md
 * in ~/.gemini/agents/ or .gemini/agents/.
 */
export declare const MemoryManagerAgent: (config: Config) => LocalAgentDefinition<typeof MemoryManagerSchema>;
export {};
