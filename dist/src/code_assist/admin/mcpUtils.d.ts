/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { MCPServerConfig } from '../../config/config.js';
import type { RequiredMcpServerConfig } from '../types.js';
/**
 * Applies the admin allowlist to the local MCP servers.
 *
 * If an admin allowlist is provided and not empty, this function filters the
 * local servers to only those present in the allowlist. It also overrides
 * connection details (url, type, trust) with the admin configuration and
 * removes local execution details (command, args, env, cwd).
 *
 * @param localMcpServers The locally configured MCP servers.
 * @param adminAllowlist The admin allowlist configuration.
 * @returns The filtered and merged MCP servers.
 */
export declare function applyAdminAllowlist(localMcpServers: Record<string, MCPServerConfig>, adminAllowlist: Record<string, MCPServerConfig> | undefined): {
    mcpServers: Record<string, MCPServerConfig>;
    blockedServerNames: string[];
};
/**
 * Applies admin-required MCP servers by injecting them into the MCP server
 * list. Required servers always take precedence over locally configured servers
 * with the same name and cannot be disabled by the user.
 *
 * @param mcpServers The current MCP servers (after allowlist filtering).
 * @param requiredServers The admin-required MCP server configurations.
 * @returns The MCP servers with required servers injected, and the list of
 *   required server names for informational purposes.
 */
export declare function applyRequiredServers(mcpServers: Record<string, MCPServerConfig>, requiredServers: Record<string, RequiredMcpServerConfig> | undefined): {
    mcpServers: Record<string, MCPServerConfig>;
    requiredServerNames: string[];
};
