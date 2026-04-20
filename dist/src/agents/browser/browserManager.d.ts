/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Manages browser lifecycle for the Browser Agent.
 *
 * Handles:
 * - Browser management via chrome-devtools-mcp with --isolated mode
 * - CDP connection via raw MCP SDK Client (NOT registered in main registry)
 * - Visual tools via --experimental-vision flag
 *
 * IMPORTANT: The MCP client here is ISOLATED from the main agent's tool registry.
 * Tools discovered from chrome-devtools-mcp are NOT registered in the main registry.
 * They are wrapped as DeclarativeTools and passed directly to the browser agent.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Tool as McpTool } from '@modelcontextprotocol/sdk/types.js';
import type { Config } from '../../config/config.js';
/**
 * Typed error for domain restriction violations.
 * Thrown when a navigation tool targets a domain not in allowedDomains.
 * Caught by mcpToolWrapper to terminate the agent immediately.
 */
export declare class DomainNotAllowedError extends Error {
    constructor(message: string);
}
/**
 * Content item from an MCP tool call response.
 * Can be text or image (for take_screenshot).
 */
export interface McpContentItem {
    type: 'text' | 'image';
    text?: string;
    /** Base64-encoded image data (for type='image') */
    data?: string;
    /** MIME type of the image (e.g., 'image/png') */
    mimeType?: string;
}
/**
 * Result from an MCP tool call.
 */
export interface McpToolCallResult {
    content?: McpContentItem[];
    isError?: boolean;
}
/**
 * Manages browser lifecycle and ISOLATED MCP client for the Browser Agent.
 *
 * The browser is launched and managed by chrome-devtools-mcp in --isolated mode.
 * Visual tools (click_at, etc.) are enabled via --experimental-vision flag.
 *
 * Key isolation property: The MCP client here does NOT register tools
 * in the main ToolRegistry. Tools are kept local to the browser agent.
 */
export declare class BrowserManager {
    private config;
    private static instances;
    /**
     * Maximum number of parallel browser instances allowed in isolated mode.
     * Prevents unbounded resource consumption from concurrent browser_agent calls.
     */
    static readonly MAX_PARALLEL_INSTANCES = 5;
    /**
     * Returns the cache key for a given config.
     * Uses `sessionMode:profilePath` so different profiles get separate instances.
     */
    private static getInstanceKey;
    /**
     * Returns an existing BrowserManager for the current config's session mode
     * and profile, or creates a new one.
     *
     * Concurrency rules:
     * - **persistent / existing mode**: Only one instance is allowed at a time.
     *   If the instance is already in-use, an error is thrown instructing the
     *   caller to run browser tasks sequentially.
     * - **isolated mode**: Parallel instances are allowed up to
     *   MAX_PARALLEL_INSTANCES. Each isolated instance gets its own temp profile.
     */
    static getInstance(config: Config): BrowserManager;
    /**
     * Closes all cached BrowserManager instances and clears the cache.
     * Called on /clear commands and CLI exit.
     */
    static resetAll(): Promise<void>;
    /**
     * Alias for resetAll — used by CLI exit cleanup for clarity.
     */
    static closeAll(): Promise<void>;
    private rawMcpClient;
    private mcpTransport;
    private discoveredTools;
    private disconnected;
    private isClosing;
    private connectionPromise;
    /**
     * Whether this instance is currently acquired by an active invocation.
     * Used by getInstance() to avoid handing the same browser to concurrent
     * browser_agent calls.
     */
    private inUse;
    /**
     * Marks this instance as in-use. Call this when starting a browser agent
     * invocation so concurrent calls get a separate instance.
     */
    acquire(): void;
    /**
     * Marks this instance as available for reuse. Call this in the finally
     * block of a browser agent invocation.
     */
    release(): void;
    /**
     * Returns whether this instance is currently acquired by an active invocation.
     */
    isAcquired(): boolean;
    /** State for action rate limiting */
    private actionCounter;
    private readonly maxActionsPerTask;
    /**
     * Whether to inject the automation overlay.
     * Always false in headless mode (no visible window to decorate).
     */
    private readonly shouldInjectOverlay;
    private readonly shouldDisableInput;
    constructor(config: Config);
    /**
     * Gets the raw MCP SDK Client for direct tool calls.
     * This client is ISOLATED from the main tool registry.
     */
    getRawMcpClient(): Promise<Client>;
    /**
     * Gets the tool definitions discovered from the MCP server.
     * These are dynamically fetched from chrome-devtools-mcp.
     */
    getDiscoveredTools(): Promise<McpTool[]>;
    /**
     * Calls a tool on the MCP server.
     *
     * @param toolName The name of the tool to call
     * @param args Arguments to pass to the tool
     * @param signal Optional AbortSignal to cancel the call
     * @param isInternal Determine if the tool is for internal execution
     * @returns The result from the MCP server
     */
    callTool(toolName: string, args: Record<string, unknown>, signal?: AbortSignal, isInternal?: boolean): Promise<McpToolCallResult>;
    /**
     * Safely maps a raw MCP SDK callTool response to our typed McpToolCallResult
     * without using unsafe type assertions.
     */
    private toResult;
    /**
     * Returns whether the MCP client is currently connected and healthy.
     */
    isConnected(): boolean;
    /**
     * Ensures browser and MCP client are connected.
     * If a previous connection was lost (e.g., user closed the browser),
     * this will reconnect with exponential backoff (up to MAX_RECONNECT_RETRIES).
     *
     * Concurrent callers share a single in-flight connection promise so that
     * two subagents racing at startup do not trigger duplicate connectMcp() calls.
     */
    ensureConnection(): Promise<void>;
    /**
     * Connects to chrome-devtools-mcp with exponential backoff retry.
     */
    private connectWithRetry;
    /**
     * Closes browser and cleans up connections.
     * The browser process is managed by chrome-devtools-mcp, so closing
     * the transport will terminate the browser.
     */
    close(): Promise<void>;
    /**
     * Connects to chrome-devtools-mcp which manages the browser process.
     *
     * Spawns node with the bundled chrome-devtools-mcp.mjs.
     * - --experimental-vision: Enables visual tools (click_at, etc.)
     *
     * IMPORTANT: This does NOT use McpClientManager and does NOT register
     * tools in the main ToolRegistry. The connection is isolated to this
     * BrowserManager instance.
     */
    private connectMcp;
    /**
     * Classifies a connection error message into a known error type.
     * Shared between connectMcp error recording and createConnectionError
     * to ensure consistent error categorization across the browser agent.
     */
    private static classifyConnectionError;
    /**
     * Creates an Error with context-specific remediation based on the actual
     * error message and the current sessionMode.
     */
    private createConnectionError;
    /**
     * Discovers tools from the connected MCP server.
     */
    private discoverTools;
    /**
     * Check navigation restrictions based on tools and the args sent
     * along with them.
     *
     * @returns error message if failed, undefined if passed.
     */
    private checkNavigationRestrictions;
    /**
     * Checks whether a hostname matches any pattern in the allowed domains list.
     */
    private isDomainAllowed;
}
