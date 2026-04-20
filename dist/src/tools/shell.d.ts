/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type SandboxPermissions } from '../services/sandboxManager.js';
import { BaseDeclarativeTool, BaseToolInvocation, ToolConfirmationOutcome, type ToolInvocation, type ToolResult, type ToolCallConfirmationDetails, type PolicyUpdateOptions, type ExecuteOptions, type ForcedToolDecision } from './tools.js';
import { PARAM_ADDITIONAL_PERMISSIONS } from './definitions/base-declarations.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import type { AgentLoopContext } from '../config/agent-loop-context.js';
export declare const OUTPUT_UPDATE_INTERVAL_MS = 1000;
export interface ShellToolParams {
    command: string;
    description?: string;
    dir_path?: string;
    is_background?: boolean;
    delay_ms?: number;
    [PARAM_ADDITIONAL_PERMISSIONS]?: SandboxPermissions;
}
export declare class ShellToolInvocation extends BaseToolInvocation<ShellToolParams, ToolResult> {
    private readonly context;
    private proactivePermissionsConfirmed?;
    constructor(context: AgentLoopContext, params: ShellToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string);
    /**
     * Wraps a command in a subshell `()` to capture background process IDs (PIDs) using pgrep.
     * Uses newlines to prevent breaking heredocs or trailing comments.
     *
     * @param command The raw command string to execute.
     * @param tempFilePath Path to the temporary file where PIDs will be written.
     * @param isWindows Whether the current platform is Windows (if true, the command is returned as-is).
     * @returns The wrapped command string.
     */
    private wrapCommandForPgrep;
    private getContextualDetails;
    getDescription(): string;
    private simplifyPaths;
    getDisplayTitle(): string;
    getExplanation(): string;
    getPolicyUpdateOptions(outcome: ToolConfirmationOutcome): PolicyUpdateOptions | undefined;
    shouldConfirmExecute(abortSignal: AbortSignal, forcedDecision?: ForcedToolDecision): Promise<ToolCallConfirmationDetails | false>;
    protected getConfirmationDetails(_abortSignal: AbortSignal, proactivePermissions?: SandboxPermissions): Promise<ToolCallConfirmationDetails | false>;
    execute(options: ExecuteOptions): Promise<ToolResult>;
}
export declare class ShellTool extends BaseDeclarativeTool<ShellToolParams, ToolResult> {
    private readonly context;
    static readonly Name = "run_shell_command";
    constructor(context: AgentLoopContext, messageBus: MessageBus);
    protected validateToolParamValues(params: ShellToolParams): string | null;
    protected createInvocation(params: ShellToolParams, messageBus: MessageBus, _toolName?: string, _toolDisplayName?: string): ToolInvocation<ShellToolParams, ToolResult>;
    getSchema(modelId?: string): import("@google/genai").FunctionDeclaration;
}
