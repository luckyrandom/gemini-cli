/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { EventEmitter } from 'node:events';
import { EVENT_API_ERROR, EVENT_API_RESPONSE, EVENT_TOOL_CALL, } from './types.js';
import { ToolCallDecision } from './tool-call-decision.js';
import {} from '../services/chatRecordingService.js';
const createInitialRoleMetrics = () => ({
    totalRequests: 0,
    totalErrors: 0,
    totalLatencyMs: 0,
    tokens: {
        input: 0,
        prompt: 0,
        candidates: 0,
        total: 0,
        cached: 0,
        thoughts: 0,
        tool: 0,
    },
});
const createInitialModelMetrics = () => ({
    api: {
        totalRequests: 0,
        totalErrors: 0,
        totalLatencyMs: 0,
    },
    tokens: {
        input: 0,
        prompt: 0,
        candidates: 0,
        total: 0,
        cached: 0,
        thoughts: 0,
        tool: 0,
    },
    roles: {},
});
const createInitialMetrics = () => ({
    models: {},
    tools: {
        totalCalls: 0,
        totalSuccess: 0,
        totalFail: 0,
        totalDurationMs: 0,
        totalDecisions: {
            [ToolCallDecision.ACCEPT]: 0,
            [ToolCallDecision.REJECT]: 0,
            [ToolCallDecision.MODIFY]: 0,
            [ToolCallDecision.AUTO_ACCEPT]: 0,
        },
        byName: {},
    },
    files: {
        totalLinesAdded: 0,
        totalLinesRemoved: 0,
    },
});
export class UiTelemetryService extends EventEmitter {
    #metrics = createInitialMetrics();
    #lastPromptTokenCount = 0;
    addEvent(event) {
        switch (event['event.name']) {
            case EVENT_API_RESPONSE:
                this.processApiResponse(event);
                break;
            case EVENT_API_ERROR:
                this.processApiError(event);
                break;
            case EVENT_TOOL_CALL:
                this.processToolCall(event);
                break;
            default:
                // We should not emit update for any other event metric.
                return;
        }
        this.emit('update', {
            metrics: this.#metrics,
            lastPromptTokenCount: this.#lastPromptTokenCount,
        });
    }
    getMetrics() {
        return this.#metrics;
    }
    getLastPromptTokenCount() {
        return this.#lastPromptTokenCount;
    }
    setLastPromptTokenCount(lastPromptTokenCount) {
        this.#lastPromptTokenCount = lastPromptTokenCount;
        this.emit('update', {
            metrics: this.#metrics,
            lastPromptTokenCount: this.#lastPromptTokenCount,
        });
    }
    clear(newSessionId) {
        this.#metrics = createInitialMetrics();
        this.#lastPromptTokenCount = 0;
        this.emit('clear', newSessionId);
        this.emit('update', {
            metrics: this.#metrics,
            lastPromptTokenCount: this.#lastPromptTokenCount,
        });
    }
    /**
     * Hydrates the telemetry metrics from a historical conversation record.
     * This is used when resuming a session to restore token counts and tool stats.
     */
    hydrate(conversation) {
        this.clear(conversation.sessionId);
        let totalTokensInContext = 0;
        for (const message of conversation.messages) {
            if (message.type === 'gemini') {
                const model = message.model || 'unknown';
                const modelMetrics = this.getOrCreateModelMetrics(model);
                // Restore API request stats
                modelMetrics.api.totalRequests++;
                // Restore token metrics
                if (message.tokens) {
                    modelMetrics.tokens.prompt += message.tokens.input;
                    modelMetrics.tokens.candidates += message.tokens.output;
                    modelMetrics.tokens.total += message.tokens.total;
                    modelMetrics.tokens.cached += message.tokens.cached;
                    modelMetrics.tokens.thoughts += message.tokens.thoughts || 0;
                    modelMetrics.tokens.tool += message.tokens.tool || 0;
                    modelMetrics.tokens.input = Math.max(0, modelMetrics.tokens.prompt - modelMetrics.tokens.cached);
                    // The total tokens of the last Gemini message represents the context
                    // size at that point in time.
                    totalTokensInContext = message.tokens.total;
                }
                // Restore tool metrics
                if (message.toolCalls) {
                    for (const toolCall of message.toolCalls) {
                        this.#metrics.tools.totalCalls++;
                        if (toolCall.status === 'success') {
                            this.#metrics.tools.totalSuccess++;
                        }
                        else if (toolCall.status === 'error') {
                            this.#metrics.tools.totalFail++;
                        }
                        if (!this.#metrics.tools.byName[toolCall.name]) {
                            this.#metrics.tools.byName[toolCall.name] = {
                                count: 0,
                                success: 0,
                                fail: 0,
                                durationMs: 0,
                                decisions: {
                                    [ToolCallDecision.ACCEPT]: 0,
                                    [ToolCallDecision.REJECT]: 0,
                                    [ToolCallDecision.MODIFY]: 0,
                                    [ToolCallDecision.AUTO_ACCEPT]: 0,
                                },
                            };
                        }
                        const toolStats = this.#metrics.tools.byName[toolCall.name];
                        toolStats.count++;
                        if (toolCall.status === 'success') {
                            toolStats.success++;
                        }
                        else if (toolCall.status === 'error') {
                            toolStats.fail++;
                        }
                    }
                }
            }
        }
        this.#lastPromptTokenCount = totalTokensInContext;
        this.emit('update', {
            metrics: this.#metrics,
            lastPromptTokenCount: this.#lastPromptTokenCount,
        });
    }
    getOrCreateModelMetrics(modelName) {
        if (!this.#metrics.models[modelName]) {
            this.#metrics.models[modelName] = createInitialModelMetrics();
        }
        return this.#metrics.models[modelName];
    }
    processApiResponse(event) {
        const modelMetrics = this.getOrCreateModelMetrics(event.model);
        modelMetrics.api.totalRequests++;
        modelMetrics.api.totalLatencyMs += event.duration_ms;
        modelMetrics.tokens.prompt += event.usage.input_token_count;
        modelMetrics.tokens.candidates += event.usage.output_token_count;
        modelMetrics.tokens.total += event.usage.total_token_count;
        modelMetrics.tokens.cached += event.usage.cached_content_token_count;
        modelMetrics.tokens.thoughts += event.usage.thoughts_token_count;
        modelMetrics.tokens.tool += event.usage.tool_token_count;
        modelMetrics.tokens.input = Math.max(0, modelMetrics.tokens.prompt - modelMetrics.tokens.cached);
        if (event.role) {
            if (!modelMetrics.roles[event.role]) {
                modelMetrics.roles[event.role] = createInitialRoleMetrics();
            }
            const roleMetrics = modelMetrics.roles[event.role];
            roleMetrics.totalRequests++;
            roleMetrics.totalLatencyMs += event.duration_ms;
            roleMetrics.tokens.prompt += event.usage.input_token_count;
            roleMetrics.tokens.candidates += event.usage.output_token_count;
            roleMetrics.tokens.total += event.usage.total_token_count;
            roleMetrics.tokens.cached += event.usage.cached_content_token_count;
            roleMetrics.tokens.thoughts += event.usage.thoughts_token_count;
            roleMetrics.tokens.tool += event.usage.tool_token_count;
            roleMetrics.tokens.input = Math.max(0, roleMetrics.tokens.prompt - roleMetrics.tokens.cached);
        }
    }
    processApiError(event) {
        const modelMetrics = this.getOrCreateModelMetrics(event.model);
        modelMetrics.api.totalRequests++;
        modelMetrics.api.totalErrors++;
        modelMetrics.api.totalLatencyMs += event.duration_ms;
        if (event.role) {
            if (!modelMetrics.roles[event.role]) {
                modelMetrics.roles[event.role] = createInitialRoleMetrics();
            }
            const roleMetrics = modelMetrics.roles[event.role];
            roleMetrics.totalRequests++;
            roleMetrics.totalErrors++;
            roleMetrics.totalLatencyMs += event.duration_ms;
        }
    }
    processToolCall(event) {
        const { tools, files } = this.#metrics;
        tools.totalCalls++;
        tools.totalDurationMs += event.duration_ms;
        if (event.success) {
            tools.totalSuccess++;
        }
        else {
            tools.totalFail++;
        }
        if (!tools.byName[event.function_name]) {
            tools.byName[event.function_name] = {
                count: 0,
                success: 0,
                fail: 0,
                durationMs: 0,
                decisions: {
                    [ToolCallDecision.ACCEPT]: 0,
                    [ToolCallDecision.REJECT]: 0,
                    [ToolCallDecision.MODIFY]: 0,
                    [ToolCallDecision.AUTO_ACCEPT]: 0,
                },
            };
        }
        const toolStats = tools.byName[event.function_name];
        toolStats.count++;
        toolStats.durationMs += event.duration_ms;
        if (event.success) {
            toolStats.success++;
        }
        else {
            toolStats.fail++;
        }
        if (event.decision) {
            tools.totalDecisions[event.decision]++;
            toolStats.decisions[event.decision]++;
        }
        // Aggregate line count data from metadata
        if (event.metadata) {
            if (event.metadata['model_added_lines'] !== undefined) {
                files.totalLinesAdded += event.metadata['model_added_lines'];
            }
            if (event.metadata['model_removed_lines'] !== undefined) {
                files.totalLinesRemoved += event.metadata['model_removed_lines'];
            }
        }
    }
}
export const uiTelemetryService = new UiTelemetryService();
//# sourceMappingURL=uiTelemetry.js.map