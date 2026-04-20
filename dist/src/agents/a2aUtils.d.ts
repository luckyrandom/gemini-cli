/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Message, TaskState, AgentCard } from '@a2a-js/sdk';
import type { SendMessageResult } from './a2a-client-manager.js';
import type { SubagentActivityItem } from './types.js';
export declare const AUTH_REQUIRED_MSG = "[Authorization Required] The agent has indicated it requires authorization to proceed. Please follow the agent's instructions.";
/**
 * Reassembles incremental A2A streaming updates into a coherent result.
 * Shows sequential status/messages followed by all reassembled artifacts.
 */
export declare class A2AResultReassembler {
    private messageLog;
    private artifacts;
    private artifactChunks;
    /**
     * Processes a new chunk from the A2A stream.
     */
    update(chunk: SendMessageResult): void;
    private appendStateInstructions;
    private pushMessage;
    /**
     * Returns an array of activity items representing the current reassembled state.
     */
    toActivityItems(): SubagentActivityItem[];
    /**
     * Returns a human-readable string representation of the current reassembled state.
     */
    toString(): string;
}
/**
 * Extracts a human-readable text representation from a Message object.
 * Handles Text, Data (JSON), and File parts.
 */
export declare function extractMessageText(message: Message | undefined): string;
/**
 * Normalizes proto field name aliases that the SDK doesn't handle yet.
 * The A2A proto spec uses `supported_interfaces` and `protocol_binding`,
 * while the SDK expects `additionalInterfaces` and `transport`.
 * TODO: Remove once @a2a-js/sdk handles these aliases natively.
 */
export declare function normalizeAgentCard(card: unknown): AgentCard;
/**
 * Extracts contextId and taskId from a Message, Task, or Update response.
 * Follows the pattern from the A2A CLI sample to maintain conversational continuity.
 */
export declare function extractIdsFromResponse(result: SendMessageResult): {
    contextId?: string;
    taskId?: string;
    clearTaskId?: boolean;
};
/**
 * Returns true if the given state is a terminal state for a task.
 */
export declare function isTerminalState(state: TaskState | undefined): boolean;
