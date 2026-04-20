/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type AgentLoopContext } from '../../config/agent-loop-context.js';
import { BaseToolInvocation, type ToolResult, type ExecuteOptions } from '../../tools/tools.js';
import { type AgentInputs } from '../types.js';
import type { MessageBus } from '../../confirmation-bus/message-bus.js';
/**
 * Browser agent invocation with async tool setup.
 *
 * This invocation handles the browser agent's special requirements:
 * - MCP connection and tool wrapping at invocation time
 * - Browser cleanup after execution
 */
export declare class BrowserAgentInvocation extends BaseToolInvocation<AgentInputs, ToolResult> {
    private readonly context;
    private readonly agentName;
    constructor(context: AgentLoopContext, params: AgentInputs, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string);
    private get config();
    /**
     * Returns a concise, human-readable description of the invocation.
     */
    getDescription(): string;
    /**
     * Executes the browser agent.
     *
     * This method:
     * 1. Creates browser manager and MCP connection
     * 2. Wraps MCP tools for the isolated registry
     * 3. Runs the agent via LocalAgentExecutor
     * 4. Cleans up browser resources
     */
    execute(options: ExecuteOptions): Promise<ToolResult>;
}
