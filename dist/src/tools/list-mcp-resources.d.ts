/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseDeclarativeTool, BaseToolInvocation, type ToolResult, type ExecuteOptions } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import type { AgentLoopContext } from '../config/agent-loop-context.js';
export interface ListMcpResourcesParams {
    serverName?: string;
}
export declare class ListMcpResourcesTool extends BaseDeclarativeTool<ListMcpResourcesParams, ToolResult> {
    private readonly context;
    static readonly Name = "list_mcp_resources";
    constructor(context: AgentLoopContext, messageBus: MessageBus);
    protected createInvocation(params: ListMcpResourcesParams): ListMcpResourcesToolInvocation;
}
declare class ListMcpResourcesToolInvocation extends BaseToolInvocation<ListMcpResourcesParams, ToolResult> {
    private readonly context;
    constructor(context: AgentLoopContext, params: ListMcpResourcesParams, messageBus: MessageBus);
    getDescription(): string;
    execute({ abortSignal: _abortSignal, }: ExecuteOptions): Promise<ToolResult>;
}
export {};
