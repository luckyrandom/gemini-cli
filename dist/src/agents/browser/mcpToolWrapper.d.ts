/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { DeclarativeTool, type ToolResult, type ToolInvocation } from '../../tools/tools.js';
import type { MessageBus } from '../../confirmation-bus/message-bus.js';
import { type BrowserManager } from './browserManager.js';
/**
 * DeclarativeTool wrapper for an MCP tool.
 */
declare class McpDeclarativeTool extends DeclarativeTool<Record<string, unknown>, ToolResult> {
    protected readonly browserManager: BrowserManager;
    private readonly shouldDisableInput;
    private readonly blockFileUploads;
    constructor(browserManager: BrowserManager, name: string, description: string, parameterSchema: unknown, messageBus: MessageBus, shouldDisableInput: boolean, blockFileUploads?: boolean);
    get toolAnnotations(): Record<string, unknown>;
    build(params: Record<string, unknown>): ToolInvocation<Record<string, unknown>, ToolResult>;
}
/**
 * Creates DeclarativeTool instances from dynamically discovered MCP tools,
 * plus custom composite tools (like type_text).
 *
 * These tools are registered in the browser agent's isolated ToolRegistry,
 * NOT in the main agent's registry.
 *
 * Tool definitions are fetched dynamically from the MCP server at runtime.
 *
 * @param browserManager The browser manager with isolated MCP client
 * @param messageBus Message bus for tool invocations
 * @param shouldDisableInput Whether input should be disabled for this agent
 * @returns Array of DeclarativeTools that dispatch to the isolated MCP client
 */
export declare function createMcpDeclarativeTools(browserManager: BrowserManager, messageBus: MessageBus, shouldDisableInput?: boolean, blockFileUploads?: boolean): Promise<McpDeclarativeTool[]>;
/**
 * Post-processes tool results to add contextual hints for common error patterns.
 * This helps the agent recover from overlay blocking, element not found, etc.
 * Also strips embedded snapshots to prevent token bloat.
 */
export declare function postProcessToolResult(toolName: string, result: string): string;
export {};
