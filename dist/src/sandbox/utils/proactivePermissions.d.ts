/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type SandboxPermissions } from '../../services/sandboxManager.js';
/**
 * Returns true if the command or subcommand is known to be network-reliant.
 */
export declare function isNetworkReliantCommand(commandName: string, subCommand?: string): boolean;
/**
 * Returns suggested additional permissions for network-reliant tools
 * based on common configuration and cache directories.
 */
/**
 * Returns suggested additional permissions for network-reliant tools
 * based on common configuration and cache directories.
 */
export declare function getProactiveToolSuggestions(commandName: string): Promise<SandboxPermissions | undefined>;
