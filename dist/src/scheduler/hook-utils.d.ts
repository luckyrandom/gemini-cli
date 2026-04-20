/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
import type { AnyDeclarativeTool, AnyToolInvocation } from '../tools/tools.js';
import type { ToolCallRequestInfo } from './types.js';
import { ToolErrorType } from '../tools/tool-error.js';
export type HookEvaluationResult = {
    status: 'continue';
    hookDecision?: 'ask' | 'block';
    hookSystemMessage?: string;
    modifiedArgs?: Record<string, unknown>;
    newInvocation?: AnyToolInvocation;
} | {
    status: 'error';
    error: Error;
    errorType: ToolErrorType;
};
export declare function evaluateBeforeToolHook(config: Config, tool: AnyDeclarativeTool, request: ToolCallRequestInfo, invocation: AnyToolInvocation): Promise<HookEvaluationResult>;
