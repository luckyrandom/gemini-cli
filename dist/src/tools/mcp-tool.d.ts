/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseDeclarativeTool, BaseToolInvocation, ToolConfirmationOutcome, type ToolCallConfirmationDetails, type ToolInvocation, type ToolResult, type PolicyUpdateOptions, type ExecuteOptions } from './tools.js';
import type { CallableTool, Part } from '@google/genai';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import type { McpContext } from './mcp-client.js';
/**
 * The separator used to qualify MCP tool names with their server prefix.
 * e.g. "mcp_server_name_tool_name"
 */
export declare const MCP_QUALIFIED_NAME_SEPARATOR = "_";
/**
 * The strict prefix that all MCP tools must start with.
 */
export declare const MCP_TOOL_PREFIX = "mcp_";
/**
 * Returns true if `name` matches the MCP qualified name format: "mcp_server_tool",
 * i.e. starts with the "mcp_" prefix.
 */
export declare function isMcpToolName(name: string): boolean;
/**
 * Extracts the server name and tool name from a fully qualified MCP tool name.
 * Expected format: `mcp_{server_name}_{tool_name}`
 * @param name The fully qualified tool name.
 * @returns An object containing the extracted `serverName` and `toolName`, or
 *          `undefined` properties if the name doesn't match the expected format.
 */
export declare function parseMcpToolName(name: string): {
    serverName?: string;
    toolName?: string;
};
/**
 * Assembles a fully qualified MCP tool name (or wildcard pattern) from its server and tool components.
 *
 * @param serverName The backend MCP server name (can be '*' for global wildcards).
 * @param toolName The name of the tool (can be undefined or '*' for tool-level wildcards).
 * @returns The fully qualified name (e.g., `mcp_server_tool`, `mcp_*`, `mcp_server_*`).
 */
export declare function formatMcpToolName(serverName: string, toolName?: string): string;
/**
 * Interface representing metadata annotations specific to an MCP tool.
 * Ensures strongly-typed access to server-level properties.
 */
export interface McpToolAnnotation extends Record<string, unknown> {
    _serverName: string;
}
/**
 * Type guard to check if tool annotations implement McpToolAnnotation.
 */
export declare function isMcpToolAnnotation(annotation: unknown): annotation is McpToolAnnotation;
type ToolParams = Record<string, unknown>;
export declare class DiscoveredMCPToolInvocation extends BaseToolInvocation<ToolParams, ToolResult> {
    private readonly mcpTool;
    readonly serverName: string;
    readonly serverToolName: string;
    readonly displayName: string;
    readonly trust?: boolean | undefined;
    private readonly cliConfig?;
    private readonly toolDescription?;
    private readonly toolParameterSchema?;
    private static readonly allowlist;
    constructor(mcpTool: CallableTool, serverName: string, serverToolName: string, displayName: string, messageBus: MessageBus, trust?: boolean | undefined, params?: ToolParams, cliConfig?: McpContext | undefined, toolDescription?: string | undefined, toolParameterSchema?: unknown | undefined, toolAnnotationsData?: Record<string, unknown>);
    getPolicyUpdateOptions(_outcome: ToolConfirmationOutcome): PolicyUpdateOptions | undefined;
    protected getConfirmationDetails(_abortSignal: AbortSignal): Promise<ToolCallConfirmationDetails | false>;
    isMCPToolError(rawResponseParts: Part[]): boolean;
    execute({ abortSignal: signal }: ExecuteOptions): Promise<ToolResult>;
    getDescription(): string;
    getDisplayTitle(): string;
    getExplanation(): string;
}
export declare class DiscoveredMCPTool extends BaseDeclarativeTool<ToolParams, ToolResult> {
    private readonly mcpTool;
    readonly serverName: string;
    readonly serverToolName: string;
    readonly parameterSchema: unknown;
    readonly trust?: boolean | undefined;
    private readonly cliConfig?;
    readonly extensionName?: string | undefined;
    readonly extensionId?: string | undefined;
    private readonly _toolAnnotations?;
    constructor(mcpTool: CallableTool, serverName: string, serverToolName: string, description: string, parameterSchema: unknown, messageBus: MessageBus, trust?: boolean | undefined, isReadOnly?: boolean, nameOverride?: string, cliConfig?: McpContext | undefined, extensionName?: string | undefined, extensionId?: string | undefined, _toolAnnotations?: Record<string, unknown> | undefined);
    private readonly _isReadOnly?;
    get isReadOnly(): boolean;
    get toolAnnotations(): Record<string, unknown> | undefined;
    getFullyQualifiedPrefix(): string;
    getFullyQualifiedName(): string;
    protected createInvocation(params: ToolParams, messageBus: MessageBus, _toolName?: string, _displayName?: string): ToolInvocation<ToolParams, ToolResult>;
}
/** Visible for testing */
export declare function generateValidName(name: string): string;
export {};
