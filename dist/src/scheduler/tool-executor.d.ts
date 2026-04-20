/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type AgentLoopContext, type ToolLiveOutput } from '../index.js';
import { type CompletedToolCall, type ToolCall } from './types.js';
export interface ToolExecutionContext {
    call: ToolCall;
    signal: AbortSignal;
    outputUpdateHandler?: (callId: string, output: ToolLiveOutput) => void;
    onUpdateToolCall: (updatedCall: ToolCall) => void;
}
export declare class ToolExecutor {
    private readonly context;
    constructor(context: AgentLoopContext);
    private get config();
    execute(context: ToolExecutionContext): Promise<CompletedToolCall>;
    private truncateOutputIfNeeded;
    private createCancelledResult;
    private createSuccessResult;
    private createErrorResult;
    private createErrorResponse;
}
