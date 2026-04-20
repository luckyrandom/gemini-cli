/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import {} from 'zod';
/**
 * Describes the possible termination modes for an agent.
 */
export var AgentTerminateMode;
(function (AgentTerminateMode) {
    AgentTerminateMode["ERROR"] = "ERROR";
    AgentTerminateMode["TIMEOUT"] = "TIMEOUT";
    AgentTerminateMode["GOAL"] = "GOAL";
    AgentTerminateMode["MAX_TURNS"] = "MAX_TURNS";
    AgentTerminateMode["ABORTED"] = "ABORTED";
    AgentTerminateMode["ERROR_NO_COMPLETE_TASK_CALL"] = "ERROR_NO_COMPLETE_TASK_CALL";
})(AgentTerminateMode || (AgentTerminateMode = {}));
/**
 * The default query string provided to an agent as input.
 */
export const DEFAULT_QUERY_STRING = 'Get Started!';
/**
 * The default maximum number of conversational turns for an agent.
 */
export const DEFAULT_MAX_TURNS = 30;
/**
 * The default maximum execution time for an agent in minutes.
 */
export const DEFAULT_MAX_TIME_MINUTES = 10;
/**
 * Structured events emitted during subagent execution for user observability.
 */
export var SubagentActivityErrorType;
(function (SubagentActivityErrorType) {
    SubagentActivityErrorType["REJECTED"] = "REJECTED";
    SubagentActivityErrorType["CANCELLED"] = "CANCELLED";
    SubagentActivityErrorType["GENERIC"] = "GENERIC";
})(SubagentActivityErrorType || (SubagentActivityErrorType = {}));
/**
 * Standard error messages for subagent activities.
 */
export const SUBAGENT_REJECTED_ERROR_PREFIX = 'User rejected this operation.';
export const SUBAGENT_CANCELLED_ERROR_MESSAGE = 'Request cancelled.';
export function isSubagentProgress(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'isSubagentProgress' in obj &&
        obj.isSubagentProgress === true);
}
/**
 * Checks if the tool call data indicates an error.
 */
export function isToolActivityError(data) {
    return (data !== null &&
        typeof data === 'object' &&
        'isError' in data &&
        data.isError === true);
}
/**
 * Derives the AgentCardLoadOptions from a RemoteAgentDefinition.
 * Throws if neither agentCardUrl nor agentCardJson is present.
 */
export function getAgentCardLoadOptions(def) {
    if (def.agentCardJson) {
        return { type: 'json', json: def.agentCardJson };
    }
    if (def.agentCardUrl) {
        return { type: 'url', url: def.agentCardUrl };
    }
    throw new Error(`Remote agent '${def.name}' has neither agentCardUrl nor agentCardJson`);
}
/**
 * Extracts a target URL for auth providers from a RemoteAgentDefinition.
 * For URL-based agents, returns the agentCardUrl.
 * For JSON-based agents, attempts to parse the URL from the inline card JSON.
 * Returns undefined if no URL can be determined.
 */
export function getRemoteAgentTargetUrl(def) {
    if (def.agentCardUrl) {
        return def.agentCardUrl;
    }
    if (def.agentCardJson) {
        try {
            const parsed = JSON.parse(def.agentCardJson);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
            const card = parsed;
            if (card.url) {
                return card.url;
            }
        }
        catch {
            // JSON parse will fail properly later in loadAgent
        }
    }
    return undefined;
}
//# sourceMappingURL=types.js.map