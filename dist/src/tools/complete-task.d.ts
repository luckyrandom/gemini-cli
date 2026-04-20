/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseDeclarativeTool, BaseToolInvocation, type ToolResult, type ExecuteOptions } from './tools.js';
import { type OutputConfig } from '../agents/types.js';
import { type z } from 'zod';
import { type MessageBus } from '../confirmation-bus/message-bus.js';
/**
 * Tool for signaling task completion and optionally returning structured output.
 * This tool is specifically designed for use in subagent loops.
 */
export declare class CompleteTaskTool<TOutput extends z.ZodTypeAny = z.ZodTypeAny> extends BaseDeclarativeTool<Record<string, unknown>, ToolResult> {
    private readonly outputConfig?;
    private readonly processOutput?;
    static readonly Name = "complete_task";
    constructor(messageBus: MessageBus, outputConfig?: OutputConfig<TOutput> | undefined, processOutput?: ((output: z.infer<TOutput>) => string) | undefined);
    private static buildParameterSchema;
    protected validateToolParamValues(params: Record<string, unknown>): string | null;
    protected createInvocation(params: Record<string, unknown>, messageBus: MessageBus, toolName: string, toolDisplayName: string): CompleteTaskInvocation<TOutput>;
}
export declare class CompleteTaskInvocation<TOutput extends z.ZodTypeAny = z.ZodTypeAny> extends BaseToolInvocation<Record<string, unknown>, ToolResult> {
    private readonly outputConfig?;
    private readonly processOutput?;
    constructor(params: Record<string, unknown>, messageBus: MessageBus, toolName: string, toolDisplayName: string, outputConfig?: OutputConfig<TOutput> | undefined, processOutput?: ((output: z.infer<TOutput>) => string) | undefined);
    getDescription(): string;
    execute({ abortSignal: _signal }: ExecuteOptions): Promise<ToolResult>;
}
