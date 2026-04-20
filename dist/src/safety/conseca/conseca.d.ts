/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { InProcessChecker } from '../built-in.js';
import { type SafetyCheckInput, type SafetyCheckResult } from '../protocol.js';
import type { Config } from '../../config/config.js';
import type { SecurityPolicy } from './types.js';
import type { AgentLoopContext } from '../../config/agent-loop-context.js';
export declare class ConsecaSafetyChecker implements InProcessChecker {
    private static instance;
    private currentPolicy;
    private activeUserPrompt;
    private context;
    /**
     * Private constructor to enforce singleton pattern.
     * Use `getInstance()` to access the instance.
     */
    private constructor();
    static getInstance(): ConsecaSafetyChecker;
    /**
     * Resets the singleton instance. Use only in tests.
     */
    static resetInstance(): void;
    setContext(context: AgentLoopContext): void;
    check(input: SafetyCheckInput): Promise<SafetyCheckResult>;
    getPolicy(userPrompt: string, trustedContent: string, config: Config): Promise<SecurityPolicy>;
    private extractUserPrompt;
    getCurrentPolicy(): SecurityPolicy | null;
    getActiveUserPrompt(): string | null;
}
