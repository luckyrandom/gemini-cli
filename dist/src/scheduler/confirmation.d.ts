/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { type SerializableConfirmationDetails } from '../confirmation-bus/types.js';
import { ToolConfirmationOutcome, type ToolConfirmationPayload, type ForcedToolDecision } from '../tools/tools.js';
import { type ValidatingToolCall } from './types.js';
import type { Config } from '../config/config.js';
import type { SchedulerStateManager } from './state-manager.js';
import type { ToolModificationHandler } from './tool-modifier.js';
import { type EditorType } from '../utils/editor.js';
export interface ConfirmationResult {
    outcome: ToolConfirmationOutcome;
    payload?: ToolConfirmationPayload;
}
/**
 * Result of the full confirmation flow, including any user modifications.
 */
export interface ResolutionResult {
    outcome: ToolConfirmationOutcome;
    lastDetails?: SerializableConfirmationDetails;
    /**
     * Final payload from the user's confirmation response. May carry feedback
     * (when outcome is Cancel) or other outcome-specific data.
     */
    payload?: ToolConfirmationPayload;
}
/**
 * Manages the interactive confirmation loop, handling user modifications
 * via inline diffs or external editors (Vim).
 */
export declare function resolveConfirmation(toolCall: ValidatingToolCall, signal: AbortSignal, deps: {
    config: Config;
    messageBus: MessageBus;
    state: SchedulerStateManager;
    modifier: ToolModificationHandler;
    getPreferredEditor: () => EditorType | undefined;
    schedulerId: string;
    onWaitingForConfirmation?: (waiting: boolean) => void;
    systemMessage?: string;
    forcedDecision?: ForcedToolDecision;
}): Promise<ResolutionResult>;
