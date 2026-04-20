/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseDeclarativeTool, BaseToolInvocation, type ToolResult, type ExecuteOptions } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import type { AgentLoopContext } from '../config/agent-loop-context.js';
export interface ReadMcpResourceParams {
    uri: string;
}
export declare class ReadMcpResourceTool extends BaseDeclarativeTool<ReadMcpResourceParams, ToolResult> {
    private readonly context;
    static readonly Name = "read_mcp_resource";
    constructor(context: AgentLoopContext, messageBus: MessageBus);
    protected createInvocation(params: ReadMcpResourceParams): ReadMcpResourceToolInvocation;
}
declare class ReadMcpResourceToolInvocation extends BaseToolInvocation<ReadMcpResourceParams, ToolResult> {
    private readonly context;
    private resource;
    constructor(context: AgentLoopContext, params: ReadMcpResourceParams, messageBus: MessageBus);
    getDescription(): string;
    execute({ abortSignal: _abortSignal, }: ExecuteOptions): Promise<ToolResult>;
}
export {};
