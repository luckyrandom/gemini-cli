/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export function isEpisode(node) {
    return node.type === 'EPISODE';
}
export function isTask(node) {
    return node.type === 'TASK';
}
export function isAgentThought(node) {
    return node.type === 'AGENT_THOUGHT';
}
export function isAgentYield(node) {
    return node.type === 'AGENT_YIELD';
}
export function isToolExecution(node) {
    return node.type === 'TOOL_EXECUTION';
}
export function isMaskedTool(node) {
    return node.type === 'MASKED_TOOL';
}
export function isUserPrompt(node) {
    return node.type === 'USER_PROMPT';
}
export function isSystemEvent(node) {
    return node.type === 'SYSTEM_EVENT';
}
export function isSnapshot(node) {
    return node.type === 'SNAPSHOT';
}
export function isRollingSummary(node) {
    return node.type === 'ROLLING_SUMMARY';
}
//# sourceMappingURL=types.js.map