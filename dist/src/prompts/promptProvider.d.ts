/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { HierarchicalMemory } from '../config/memory.js';
import type { AgentLoopContext } from '../config/agent-loop-context.js';
/**
 * Orchestrates prompt generation by gathering context and building options.
 */
export declare class PromptProvider {
    /**
     * Generates the core system prompt.
     */
    getCoreSystemPrompt(context: AgentLoopContext, userMemory?: string | HierarchicalMemory, interactiveOverride?: boolean, topicUpdateNarrationOverride?: boolean): string;
    getCompressionPrompt(context: AgentLoopContext): string;
    private withSection;
    private maybeWriteSystemMd;
}
