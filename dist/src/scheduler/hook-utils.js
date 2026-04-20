/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { extractMcpContext } from '../core/coreToolHookTriggers.js';
import { BeforeToolHookOutput } from '../hooks/types.js';
import { ToolErrorType } from '../tools/tool-error.js';
export async function evaluateBeforeToolHook(config, tool, request, invocation) {
    const hookSystem = config.getHookSystem();
    if (!hookSystem) {
        return { status: 'continue' };
    }
    const params = invocation.params || {};
    const toolInput = { ...params };
    const mcpContext = extractMcpContext(invocation, config);
    const beforeOutput = await hookSystem.fireBeforeToolEvent(request.name, toolInput, mcpContext, request.originalRequestName);
    if (!beforeOutput) {
        return { status: 'continue' };
    }
    if (beforeOutput.shouldStopExecution()) {
        return {
            status: 'error',
            error: new Error(`Agent execution stopped by hook: ${beforeOutput.getEffectiveReason()}`),
            errorType: ToolErrorType.STOP_EXECUTION,
        };
    }
    const blockingError = beforeOutput.getBlockingError();
    if (blockingError?.blocked) {
        return {
            status: 'error',
            error: new Error(`Tool execution blocked: ${blockingError.reason}`),
            errorType: ToolErrorType.POLICY_VIOLATION,
        };
    }
    let hookDecision;
    let hookSystemMessage;
    if (beforeOutput.isAskDecision()) {
        hookDecision = 'ask';
        hookSystemMessage = beforeOutput.systemMessage;
    }
    let modifiedArgs;
    let newInvocation;
    if (beforeOutput instanceof BeforeToolHookOutput) {
        const modifiedInput = beforeOutput.getModifiedToolInput();
        if (modifiedInput) {
            modifiedArgs = modifiedInput;
            try {
                newInvocation = tool.build(modifiedInput);
            }
            catch (error) {
                return {
                    status: 'error',
                    error: new Error(`Tool parameter modification by hook failed validation: ${error instanceof Error ? error.message : String(error)}`),
                    errorType: ToolErrorType.INVALID_TOOL_PARAMS,
                };
            }
        }
    }
    return {
        status: 'continue',
        hookDecision,
        hookSystemMessage,
        modifiedArgs,
        newInvocation,
    };
}
//# sourceMappingURL=hook-utils.js.map