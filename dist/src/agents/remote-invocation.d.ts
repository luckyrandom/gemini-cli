/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseToolInvocation, type ToolResult, type ToolCallConfirmationDetails, type ExecuteOptions } from '../tools/tools.js';
import { type RemoteAgentInputs, type RemoteAgentDefinition, type AgentInputs } from './types.js';
import { type AgentLoopContext } from '../config/agent-loop-context.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
/**
 * A tool invocation that proxies to a remote A2A agent.
 *
 * This implementation bypasses the local `LocalAgentExecutor` loop and directly
 * invokes the configured A2A tool.
 */
export declare class RemoteAgentInvocation extends BaseToolInvocation<RemoteAgentInputs, ToolResult> {
    private readonly definition;
    private readonly context;
    private static readonly sessionState;
    private contextId;
    private taskId;
    private readonly clientManager;
    private authHandler;
    constructor(definition: RemoteAgentDefinition, context: AgentLoopContext, params: AgentInputs, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string);
    getDescription(): string;
    private getAuthHandler;
    protected getConfirmationDetails(_abortSignal: AbortSignal): Promise<ToolCallConfirmationDetails | false>;
    execute(options: ExecuteOptions): Promise<ToolResult>;
    /**
     * Formats an execution error into a user-friendly message.
     * Recognizes typed A2AAgentError subclasses and falls back to
     * a generic message for unknown errors.
     */
    private formatExecutionError;
}
