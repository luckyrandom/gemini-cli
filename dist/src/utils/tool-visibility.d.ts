/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { ApprovalMode } from '../policy/types.js';
import { CoreToolCallStatus, type ToolCall } from '../scheduler/types.js';
export interface ToolVisibilityContext {
    /** The internal name of the tool. */
    name: string;
    /** The display name of the tool. */
    displayName?: string;
    /** The current status of the tool call. */
    status: CoreToolCallStatus;
    /** The approval mode active when the tool was called. */
    approvalMode?: ApprovalMode;
    /** Whether the tool has produced a result for display (e.g., resultDisplay or liveOutput). */
    hasResult: boolean;
    /** The ID of the parent tool call, if any. */
    parentCallId?: string;
    /** True if the tool was initiated directly by the user via a slash command. */
    isClientInitiated?: boolean;
}
/**
 * Maps a core ToolCall to a ToolVisibilityContext.
 */
export declare function buildToolVisibilityContext(tc: ToolCall): ToolVisibilityContext;
/**
 * Determines if a tool should ever appear as a completed block in the main chat log.
 */
export declare function isRenderedInHistory(ctx: ToolVisibilityContext): boolean;
/**
 * Determines if a tool belongs in the Awaiting Approval confirmation queue.
 */
export declare function belongsInConfirmationQueue(ctx: ToolVisibilityContext): boolean;
/**
 * Determines if a tool should be actively rendered in the dynamic ToolGroupMessage UI right now.
 * This takes into account current execution states and UI settings.
 */
export declare function isVisibleInToolGroup(ctx: ToolVisibilityContext, errorVerbosity: 'full' | 'low'): boolean;
