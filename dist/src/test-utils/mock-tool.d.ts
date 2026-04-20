/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ModifiableDeclarativeTool, ModifyContext } from '../tools/modifiable-tool.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind, type ToolCallConfirmationDetails, type ToolInvocation, type ToolResult, type ExecuteOptions } from '../tools/tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
interface MockToolOptions {
    name: string;
    displayName?: string;
    description?: string;
    canUpdateOutput?: boolean;
    isOutputMarkdown?: boolean;
    kind?: Kind;
    shouldConfirmExecute?: (params: {
        [key: string]: unknown;
    }, signal: AbortSignal) => Promise<ToolCallConfirmationDetails | false>;
    execute?: (params: {
        [key: string]: unknown;
    }, signal?: AbortSignal, updateOutput?: (output: string) => void, options?: ExecuteOptions) => Promise<ToolResult>;
    params?: object;
    messageBus?: MessageBus;
}
/**
 * A highly configurable mock tool for testing purposes.
 */
export declare class MockTool extends BaseDeclarativeTool<{
    [key: string]: unknown;
}, ToolResult> {
    readonly shouldConfirmExecute: (params: {
        [key: string]: unknown;
    }, signal: AbortSignal) => Promise<ToolCallConfirmationDetails | false>;
    readonly execute: (params: {
        [key: string]: unknown;
    }, signal?: AbortSignal, updateOutput?: (output: string) => void, options?: ExecuteOptions) => Promise<ToolResult>;
    constructor(options: MockToolOptions);
    protected createInvocation(params: {
        [key: string]: unknown;
    }, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<{
        [key: string]: unknown;
    }, ToolResult>;
}
export declare const MOCK_TOOL_SHOULD_CONFIRM_EXECUTE: () => Promise<{
    type: "exec";
    title: string;
    command: string;
    rootCommand: string;
    rootCommands: string[];
    onConfirm: () => Promise<void>;
}>;
export declare class MockModifiableToolInvocation extends BaseToolInvocation<Record<string, unknown>, ToolResult> {
    private readonly tool;
    constructor(tool: MockModifiableTool, params: Record<string, unknown>, messageBus: MessageBus);
    execute({ abortSignal: _signal, updateOutput: _updateOutput, }: ExecuteOptions): Promise<ToolResult>;
    shouldConfirmExecute(_abortSignal: AbortSignal): Promise<ToolCallConfirmationDetails | false>;
    getDescription(): string;
}
/**
 * Configurable mock modifiable tool for testing.
 */
export declare class MockModifiableTool extends BaseDeclarativeTool<Record<string, unknown>, ToolResult> implements ModifiableDeclarativeTool<Record<string, unknown>> {
    executeFn: (params: Record<string, unknown>) => ToolResult | undefined;
    shouldConfirm: boolean;
    constructor(name?: string);
    getModifyContext(_abortSignal: AbortSignal): ModifyContext<Record<string, unknown>>;
    protected createInvocation(params: Record<string, unknown>, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<Record<string, unknown>, ToolResult>;
}
export {};
