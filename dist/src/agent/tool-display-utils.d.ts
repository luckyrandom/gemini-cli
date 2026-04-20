/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ToolInvocation, ToolResult, ToolResultDisplay } from '../tools/tools.js';
import type { ToolDisplay, DisplayContent, DisplayDiff } from './types.js';
/**
 * Populates a ToolDisplay object from a tool invocation and its result.
 * This serves as a centralized bridge during the migration to tool-controlled display.
 */
export declare function populateToolDisplay({ name, invocation, resultDisplay, displayName, }: {
    name: string;
    invocation?: ToolInvocation<object, ToolResult>;
    resultDisplay?: ToolResultDisplay;
    displayName?: string;
}): ToolDisplay;
/**
 * Converts a legacy ToolResultDisplay into the new DisplayContent format.
 */
export declare function toolResultDisplayToDisplayContent(resultDisplay: ToolResultDisplay): DisplayContent;
/**
 * Renders a universal diff string from a DisplayDiff object.
 */
export declare function renderDisplayDiff(diff: DisplayDiff): string;
/**
 * Converts a DisplayContent object into a string representation.
 * Useful for fallback displays or non-interactive environments.
 */
export declare function displayContentToString(display: DisplayContent | undefined): string | undefined;
