/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseDeclarativeTool, BaseToolInvocation, type ToolResult, type ExecuteOptions } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import type { AgentLoopContext } from '../config/agent-loop-context.js';
declare class ListBackgroundProcessesInvocation extends BaseToolInvocation<Record<string, never>, ToolResult> {
    private readonly context;
    constructor(context: AgentLoopContext, params: Record<string, never>, messageBus: MessageBus, toolName?: string, toolDisplayName?: string);
    getDescription(): string;
    execute({ abortSignal: _signal }: ExecuteOptions): Promise<ToolResult>;
}
export declare class ListBackgroundProcessesTool extends BaseDeclarativeTool<Record<string, never>, ToolResult> {
    private readonly context;
    static readonly Name = "list_background_processes";
    constructor(context: AgentLoopContext, messageBus: MessageBus);
    protected createInvocation(params: Record<string, never>, messageBus: MessageBus): ListBackgroundProcessesInvocation;
}
interface ReadBackgroundOutputParams {
    pid: number;
    lines?: number;
    delay_ms?: number;
}
declare class ReadBackgroundOutputInvocation extends BaseToolInvocation<ReadBackgroundOutputParams, ToolResult> {
    private readonly context;
    constructor(context: AgentLoopContext, params: ReadBackgroundOutputParams, messageBus: MessageBus, toolName?: string, toolDisplayName?: string);
    getDescription(): string;
    execute({ abortSignal: _signal }: ExecuteOptions): Promise<ToolResult>;
}
export declare class ReadBackgroundOutputTool extends BaseDeclarativeTool<ReadBackgroundOutputParams, ToolResult> {
    private readonly context;
    static readonly Name = "read_background_output";
    constructor(context: AgentLoopContext, messageBus: MessageBus);
    protected createInvocation(params: ReadBackgroundOutputParams, messageBus: MessageBus): ReadBackgroundOutputInvocation;
}
export {};
