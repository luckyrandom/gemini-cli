/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { SafetyCheckInput } from './protocol.js';
import type { AgentLoopContext } from '../config/agent-loop-context.js';
/**
 * Builds context objects for safety checkers, ensuring sensitive data is filtered.
 */
export declare class ContextBuilder {
    private readonly context;
    constructor(context: AgentLoopContext);
    /**
     * Builds the full context object with all available data.
     */
    buildFullContext(): SafetyCheckInput['context'];
    /**
     * Builds a minimal context with only the specified keys.
     */
    buildMinimalContext(requiredKeys: Array<keyof SafetyCheckInput['context']>): SafetyCheckInput['context'];
    private convertHistoryToTurns;
}
