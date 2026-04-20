/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { Scheduler } from '../scheduler/scheduler.js';
/**
 * Schedules a batch of tool calls for an agent using the new event-driven Scheduler.
 *
 * @param config The global runtime configuration.
 * @param requests The list of tool call requests from the agent.
 * @param options Scheduling options including registry and IDs.
 * @returns A promise that resolves to the completed tool calls.
 */
export async function scheduleAgentTools(config, requests, options) {
    const { schedulerId, subagent, parentCallId, toolRegistry, promptRegistry, resourceRegistry, signal, getPreferredEditor, onWaitingForConfirmation, } = options;
    const schedulerContext = {
        config,
        promptId: config.promptId,
        toolRegistry,
        promptRegistry: promptRegistry ?? config.getPromptRegistry(),
        resourceRegistry: resourceRegistry ?? config.getResourceRegistry(),
        messageBus: toolRegistry.messageBus,
        geminiClient: config.geminiClient,
        sandboxManager: config.sandboxManager,
    };
    const scheduler = new Scheduler({
        context: schedulerContext,
        messageBus: toolRegistry.messageBus,
        getPreferredEditor: getPreferredEditor ?? (() => undefined),
        schedulerId,
        subagent,
        parentCallId,
        onWaitingForConfirmation,
    });
    try {
        return await scheduler.schedule(requests, signal);
    }
    finally {
        scheduler.dispose();
    }
}
//# sourceMappingURL=agent-scheduler.js.map