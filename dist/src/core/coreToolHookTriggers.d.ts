/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type McpToolContext } from '../hooks/types.js';
import type { Config } from '../config/config.js';
import type { ToolResult, AnyDeclarativeTool, AnyToolInvocation, ToolLiveOutput, ExecuteOptions } from '../tools/tools.js';
/**
 * Extracts MCP context from a tool invocation if it's an MCP tool.
 *
 * @param invocation The tool invocation
 * @param config Config to look up server details
 * @returns MCP context if this is an MCP tool, undefined otherwise
 */
export declare function extractMcpContext(invocation: AnyToolInvocation, config: Config): McpToolContext | undefined;
/**
 * Execute a tool with BeforeTool and AfterTool hooks.
 *
 * @param invocation The tool invocation to execute
 * @param toolName The name of the tool
 * @param signal Abort signal for cancellation
 * @param liveOutputCallback Optional callback for live output updates
 * @param options Optional execution options (shell config, execution ID callback, etc.)
 * @param config Config to look up MCP server details for hook context
 * @returns The tool result
 */
export declare function executeToolWithHooks(invocation: AnyToolInvocation, toolName: string, signal: AbortSignal, tool: AnyDeclarativeTool, liveOutputCallback?: (outputChunk: ToolLiveOutput) => void, options?: Omit<ExecuteOptions, 'abortSignal' | 'updateOutput'>, config?: Config, originalRequestName?: string, skipBeforeHook?: boolean): Promise<ToolResult>;
