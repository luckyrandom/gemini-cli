/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseToolInvocation, } from '../tools/tools.js';
import { DEFAULT_QUERY_STRING, getAgentCardLoadOptions, getRemoteAgentTargetUrl, } from './types.js';
import {} from '../config/agent-loop-context.js';
import { extractIdsFromResponse, A2AResultReassembler } from './a2aUtils.js';
import { debugLogger } from '../utils/debugLogger.js';
import { A2AAuthProviderFactory } from './auth-provider/factory.js';
import { A2AAgentError } from './a2a-errors.js';
/**
 * A tool invocation that proxies to a remote A2A agent.
 *
 * This implementation bypasses the local `LocalAgentExecutor` loop and directly
 * invokes the configured A2A tool.
 */
export class RemoteAgentInvocation extends BaseToolInvocation {
    definition;
    context;
    // Persist state across ephemeral invocation instances.
    static sessionState = new Map();
    // State for the ongoing conversation with the remote agent
    contextId;
    taskId;
    clientManager;
    authHandler;
    constructor(definition, context, params, messageBus, _toolName, _toolDisplayName) {
        const query = params['query'] ?? DEFAULT_QUERY_STRING;
        if (typeof query !== 'string') {
            throw new Error(`Remote agent '${definition.name}' requires a string 'query' input.`);
        }
        // Safe to pass strict object to super
        super({ query }, messageBus, _toolName ?? definition.name, _toolDisplayName ?? definition.displayName);
        this.definition = definition;
        this.context = context;
        const clientManager = this.context.config.getA2AClientManager();
        if (!clientManager) {
            throw new Error(`Failed to initialize RemoteAgentInvocation for '${definition.name}': A2AClientManager is not available.`);
        }
        this.clientManager = clientManager;
    }
    getDescription() {
        return `Calling remote agent ${this.definition.displayName ?? this.definition.name}`;
    }
    async getAuthHandler() {
        if (this.authHandler) {
            return this.authHandler;
        }
        if (this.definition.auth) {
            const targetUrl = getRemoteAgentTargetUrl(this.definition);
            const provider = await A2AAuthProviderFactory.create({
                authConfig: this.definition.auth,
                agentName: this.definition.name,
                targetUrl,
                agentCardUrl: this.definition.agentCardUrl,
            });
            if (!provider) {
                throw new Error(`Failed to create auth provider for agent '${this.definition.name}'`);
            }
            this.authHandler = provider;
        }
        return this.authHandler;
    }
    async getConfirmationDetails(_abortSignal) {
        // For now, always require confirmation for remote agents until we have a policy system for them.
        return {
            type: 'info',
            title: `Call Remote Agent: ${this.definition.displayName ?? this.definition.name}`,
            prompt: `Calling remote agent: "${this.params.query}"`,
            onConfirm: async (_outcome) => {
                // Policy updates are now handled centrally by the scheduler
            },
        };
    }
    async execute(options) {
        const { abortSignal: _signal, updateOutput } = options;
        // 1. Ensure the agent is loaded (cached by manager)
        // We assume the user has provided an access token via some mechanism (TODO),
        // or we rely on ADC.
        const reassembler = new A2AResultReassembler();
        const agentName = this.definition.displayName ?? this.definition.name;
        try {
            if (updateOutput) {
                updateOutput({
                    isSubagentProgress: true,
                    agentName,
                    state: 'running',
                    recentActivity: [
                        {
                            id: 'pending',
                            type: 'thought',
                            content: 'Working...',
                            status: 'running',
                        },
                    ],
                });
            }
            const priorState = RemoteAgentInvocation.sessionState.get(this.definition.name);
            if (priorState) {
                this.contextId = priorState.contextId;
                this.taskId = priorState.taskId;
            }
            const authHandler = await this.getAuthHandler();
            if (!this.clientManager.getClient(this.definition.name)) {
                await this.clientManager.loadAgent(this.definition.name, getAgentCardLoadOptions(this.definition), authHandler);
            }
            const message = this.params.query;
            const stream = this.clientManager.sendMessageStream(this.definition.name, message, {
                contextId: this.contextId,
                taskId: this.taskId,
                signal: _signal,
            });
            let finalResponse;
            for await (const chunk of stream) {
                if (_signal.aborted) {
                    throw new Error('Operation aborted');
                }
                finalResponse = chunk;
                reassembler.update(chunk);
                if (updateOutput) {
                    updateOutput({
                        isSubagentProgress: true,
                        agentName,
                        state: 'running',
                        recentActivity: reassembler.toActivityItems(),
                        result: reassembler.toString(),
                    });
                }
                const { contextId: newContextId, taskId: newTaskId, clearTaskId, } = extractIdsFromResponse(chunk);
                if (newContextId) {
                    this.contextId = newContextId;
                }
                this.taskId = clearTaskId ? undefined : (newTaskId ?? this.taskId);
            }
            if (!finalResponse) {
                throw new Error('No response from remote agent.');
            }
            const finalOutput = reassembler.toString();
            debugLogger.debug(`[RemoteAgent] Final response from ${this.definition.name}:\n${JSON.stringify(finalResponse, null, 2)}`);
            const finalProgress = {
                isSubagentProgress: true,
                agentName,
                state: 'completed',
                result: finalOutput,
                recentActivity: reassembler.toActivityItems(),
            };
            if (updateOutput) {
                updateOutput(finalProgress);
            }
            return {
                llmContent: [{ text: finalOutput }],
                returnDisplay: finalProgress,
            };
        }
        catch (error) {
            const partialOutput = reassembler.toString();
            // Surface structured, user-friendly error messages.
            const errorMessage = this.formatExecutionError(error);
            const fullDisplay = partialOutput
                ? `${partialOutput}\n\n${errorMessage}`
                : errorMessage;
            const errorProgress = {
                isSubagentProgress: true,
                agentName,
                state: 'error',
                result: fullDisplay,
                recentActivity: reassembler.toActivityItems(),
            };
            if (updateOutput) {
                updateOutput(errorProgress);
            }
            return {
                llmContent: [{ text: fullDisplay }],
                returnDisplay: errorProgress,
            };
        }
        finally {
            // Persist state even on partial failures or aborts to maintain conversational continuity.
            RemoteAgentInvocation.sessionState.set(this.definition.name, {
                contextId: this.contextId,
                taskId: this.taskId,
            });
        }
    }
    /**
     * Formats an execution error into a user-friendly message.
     * Recognizes typed A2AAgentError subclasses and falls back to
     * a generic message for unknown errors.
     */
    formatExecutionError(error) {
        // All A2A-specific errors include a human-friendly `userMessage` on the
        // A2AAgentError base class. Rely on that to avoid duplicating messages
        // for specific subclasses, which improves maintainability.
        if (error instanceof A2AAgentError) {
            return error.userMessage;
        }
        return `Error calling remote agent: ${error instanceof Error ? error.message : String(error)}`;
    }
}
//# sourceMappingURL=remote-invocation.js.map