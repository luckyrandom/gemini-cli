/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseDeclarativeTool, type ToolInvocation, type ToolResult } from '../tools/tools.js';
import { type AgentLoopContext } from '../config/agent-loop-context.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
/**
 * A unified tool for invoking subagents.
 *
 * Handles looking up the subagent, validating its eligibility,
 * mapping the general 'prompt' parameter to the agent's specific schema,
 * and delegating execution.
 */
export declare class AgentTool extends BaseDeclarativeTool<{
    agent_name: string;
    prompt: string;
}, ToolResult> {
    private readonly context;
    static readonly Name = "invoke_agent";
    constructor(context: AgentLoopContext, messageBus: MessageBus);
    protected createInvocation(params: {
        agent_name: string;
        prompt: string;
    }, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<{
        agent_name: string;
        prompt: string;
    }, ToolResult>;
    private mapParams;
}
