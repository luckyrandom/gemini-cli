/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { z } from 'zod';
import type { AgentLoopContext } from '../config/agent-loop-context.js';
import type { LocalAgentDefinition } from './types.js';
declare const GeneralistAgentSchema: z.ZodObject<{
    response: z.ZodString;
}, "strip", z.ZodTypeAny, {
    response: string;
}, {
    response: string;
}>;
/**
 * A general-purpose AI agent with access to all tools.
 * It uses the same core system prompt as the main agent but in a non-interactive mode.
 */
export declare const GeneralistAgent: (context: AgentLoopContext) => LocalAgentDefinition<typeof GeneralistAgentSchema>;
export {};
