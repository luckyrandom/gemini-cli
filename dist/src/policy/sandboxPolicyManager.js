/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import toml from '@iarna/toml';
import { z } from 'zod';
import { fileURLToPath } from 'node:url';
import { debugLogger } from '../utils/debugLogger.js';
import {} from '../services/sandboxManager.js';
import { deduplicateAbsolutePaths } from '../utils/paths.js';
import { normalizeCommand } from '../utils/shell-utils.js';
export const SandboxModeConfigSchema = z.object({
    network: z.boolean(),
    readonly: z.boolean(),
    approvedTools: z.array(z.string()),
    allowOverrides: z.boolean().optional(),
    yolo: z.boolean().optional(),
});
export const PersistentCommandConfigSchema = z.object({
    allowed_paths: z.array(z.string()).optional(),
    allow_network: z.boolean().optional(),
});
export const SandboxTomlSchema = z.object({
    modes: z.object({
        plan: SandboxModeConfigSchema,
        default: SandboxModeConfigSchema,
        accepting_edits: SandboxModeConfigSchema,
    }),
    commands: z.record(z.string(), PersistentCommandConfigSchema).default({}),
});
export class SandboxPolicyManager {
    static _DEFAULT_CONFIG = null;
    static get DEFAULT_CONFIG() {
        if (!SandboxPolicyManager._DEFAULT_CONFIG) {
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            const defaultPath = path.join(__dirname, 'policies', 'sandbox-default.toml');
            try {
                const content = fs.readFileSync(defaultPath, 'utf8');
                if (typeof content !== 'string') {
                    SandboxPolicyManager._DEFAULT_CONFIG = {
                        modes: {
                            plan: {
                                network: false,
                                readonly: true,
                                approvedTools: [],
                                allowOverrides: true,
                            },
                            default: {
                                network: false,
                                readonly: false,
                                approvedTools: [],
                                allowOverrides: true,
                            },
                            accepting_edits: {
                                network: false,
                                readonly: false,
                                approvedTools: ['sed', 'grep', 'awk', 'perl', 'cat', 'echo'],
                                allowOverrides: true,
                            },
                        },
                        commands: {},
                    };
                    return SandboxPolicyManager._DEFAULT_CONFIG;
                }
                SandboxPolicyManager._DEFAULT_CONFIG = SandboxTomlSchema.parse(toml.parse(content));
            }
            catch (e) {
                debugLogger.error(`Failed to parse default sandbox policy: ${e}`);
                throw new Error(`Failed to parse default sandbox policy: ${e}`);
            }
        }
        return SandboxPolicyManager._DEFAULT_CONFIG;
    }
    config;
    configPath;
    sessionApprovals = {};
    constructor(customConfigPath) {
        this.configPath =
            customConfigPath ??
                path.join(os.homedir(), '.gemini', 'policies', 'sandbox.toml');
        this.config = this.loadConfig();
    }
    isProtectedKey(key) {
        return key === '__proto__' || key === 'constructor' || key === 'prototype';
    }
    loadConfig() {
        if (!fs.existsSync(this.configPath)) {
            return SandboxPolicyManager.DEFAULT_CONFIG;
        }
        try {
            const content = fs.readFileSync(this.configPath, 'utf8');
            return SandboxTomlSchema.parse(toml.parse(content));
        }
        catch (e) {
            debugLogger.error(`Failed to parse sandbox.toml: ${e}`);
            return SandboxPolicyManager.DEFAULT_CONFIG;
        }
    }
    saveConfig() {
        try {
            const dir = path.dirname(this.configPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
            const content = toml.stringify(this.config);
            fs.writeFileSync(this.configPath, content);
        }
        catch (e) {
            debugLogger.error(`Failed to save sandbox.toml: ${e}`);
        }
    }
    getModeConfig(mode) {
        if (mode === 'yolo') {
            return {
                network: true,
                readonly: false,
                approvedTools: [],
                allowOverrides: true,
                yolo: true,
            };
        }
        if (mode === 'plan')
            return this.config.modes.plan;
        if (mode === 'accepting_edits' || mode === 'autoEdit')
            return this.config.modes.accepting_edits;
        if (mode === 'default')
            return this.config.modes.default;
        // Default fallback
        return this.config.modes.default ?? this.config.modes.plan;
    }
    getCommandPermissions(commandName) {
        const normalized = normalizeCommand(commandName);
        if (this.isProtectedKey(normalized)) {
            return {
                fileSystem: { read: [], write: [] },
                network: false,
            };
        }
        const persistent = this.config.commands[normalized];
        const session = this.sessionApprovals[normalized];
        return {
            fileSystem: {
                read: [
                    ...(persistent?.allowed_paths ?? []),
                    ...(session?.fileSystem?.read ?? []),
                ],
                write: [
                    ...(persistent?.allowed_paths ?? []),
                    ...(session?.fileSystem?.write ?? []),
                ],
            },
            network: persistent?.allow_network || session?.network || false,
        };
    }
    addSessionApproval(commandName, permissions) {
        const normalized = normalizeCommand(commandName);
        if (this.isProtectedKey(normalized)) {
            return;
        }
        const existing = this.sessionApprovals[normalized] || {
            fileSystem: { read: [], write: [] },
            network: false,
        };
        this.sessionApprovals[normalized] = {
            fileSystem: {
                read: deduplicateAbsolutePaths([
                    ...(existing.fileSystem?.read ?? []),
                    ...(permissions.fileSystem?.read ?? []),
                ]),
                write: deduplicateAbsolutePaths([
                    ...(existing.fileSystem?.write ?? []),
                    ...(permissions.fileSystem?.write ?? []),
                ]),
            },
            network: existing.network || permissions.network || false,
        };
    }
    addPersistentApproval(commandName, permissions) {
        const normalized = normalizeCommand(commandName);
        if (this.isProtectedKey(normalized)) {
            return;
        }
        const existing = this.config.commands[normalized] || {
            allowed_paths: [],
            allow_network: false,
        };
        const newPathsArray = [
            ...(existing.allowed_paths ?? []),
            ...(permissions.fileSystem?.read ?? []),
            ...(permissions.fileSystem?.write ?? []),
        ];
        const newPaths = new Set(deduplicateAbsolutePaths(newPathsArray));
        this.config.commands[normalized] = {
            allowed_paths: Array.from(newPaths),
            allow_network: existing.allow_network || permissions.network || false,
        };
        this.saveConfig();
    }
}
//# sourceMappingURL=sandboxPolicyManager.js.map