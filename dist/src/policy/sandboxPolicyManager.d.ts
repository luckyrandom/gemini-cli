/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { z } from 'zod';
import { type SandboxPermissions } from '../services/sandboxManager.js';
export declare const SandboxModeConfigSchema: z.ZodObject<{
    network: z.ZodBoolean;
    readonly: z.ZodBoolean;
    approvedTools: z.ZodArray<z.ZodString, "many">;
    allowOverrides: z.ZodOptional<z.ZodBoolean>;
    yolo: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    readonly: boolean;
    network: boolean;
    approvedTools: string[];
    yolo?: boolean | undefined;
    allowOverrides?: boolean | undefined;
}, {
    readonly: boolean;
    network: boolean;
    approvedTools: string[];
    yolo?: boolean | undefined;
    allowOverrides?: boolean | undefined;
}>;
export declare const PersistentCommandConfigSchema: z.ZodObject<{
    allowed_paths: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    allow_network: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    allowed_paths?: string[] | undefined;
    allow_network?: boolean | undefined;
}, {
    allowed_paths?: string[] | undefined;
    allow_network?: boolean | undefined;
}>;
export declare const SandboxTomlSchema: z.ZodObject<{
    modes: z.ZodObject<{
        plan: z.ZodObject<{
            network: z.ZodBoolean;
            readonly: z.ZodBoolean;
            approvedTools: z.ZodArray<z.ZodString, "many">;
            allowOverrides: z.ZodOptional<z.ZodBoolean>;
            yolo: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            readonly: boolean;
            network: boolean;
            approvedTools: string[];
            yolo?: boolean | undefined;
            allowOverrides?: boolean | undefined;
        }, {
            readonly: boolean;
            network: boolean;
            approvedTools: string[];
            yolo?: boolean | undefined;
            allowOverrides?: boolean | undefined;
        }>;
        default: z.ZodObject<{
            network: z.ZodBoolean;
            readonly: z.ZodBoolean;
            approvedTools: z.ZodArray<z.ZodString, "many">;
            allowOverrides: z.ZodOptional<z.ZodBoolean>;
            yolo: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            readonly: boolean;
            network: boolean;
            approvedTools: string[];
            yolo?: boolean | undefined;
            allowOverrides?: boolean | undefined;
        }, {
            readonly: boolean;
            network: boolean;
            approvedTools: string[];
            yolo?: boolean | undefined;
            allowOverrides?: boolean | undefined;
        }>;
        accepting_edits: z.ZodObject<{
            network: z.ZodBoolean;
            readonly: z.ZodBoolean;
            approvedTools: z.ZodArray<z.ZodString, "many">;
            allowOverrides: z.ZodOptional<z.ZodBoolean>;
            yolo: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            readonly: boolean;
            network: boolean;
            approvedTools: string[];
            yolo?: boolean | undefined;
            allowOverrides?: boolean | undefined;
        }, {
            readonly: boolean;
            network: boolean;
            approvedTools: string[];
            yolo?: boolean | undefined;
            allowOverrides?: boolean | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        default: {
            readonly: boolean;
            network: boolean;
            approvedTools: string[];
            yolo?: boolean | undefined;
            allowOverrides?: boolean | undefined;
        };
        plan: {
            readonly: boolean;
            network: boolean;
            approvedTools: string[];
            yolo?: boolean | undefined;
            allowOverrides?: boolean | undefined;
        };
        accepting_edits: {
            readonly: boolean;
            network: boolean;
            approvedTools: string[];
            yolo?: boolean | undefined;
            allowOverrides?: boolean | undefined;
        };
    }, {
        default: {
            readonly: boolean;
            network: boolean;
            approvedTools: string[];
            yolo?: boolean | undefined;
            allowOverrides?: boolean | undefined;
        };
        plan: {
            readonly: boolean;
            network: boolean;
            approvedTools: string[];
            yolo?: boolean | undefined;
            allowOverrides?: boolean | undefined;
        };
        accepting_edits: {
            readonly: boolean;
            network: boolean;
            approvedTools: string[];
            yolo?: boolean | undefined;
            allowOverrides?: boolean | undefined;
        };
    }>;
    commands: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        allowed_paths: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        allow_network: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        allowed_paths?: string[] | undefined;
        allow_network?: boolean | undefined;
    }, {
        allowed_paths?: string[] | undefined;
        allow_network?: boolean | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    commands: Record<string, {
        allowed_paths?: string[] | undefined;
        allow_network?: boolean | undefined;
    }>;
    modes: {
        default: {
            readonly: boolean;
            network: boolean;
            approvedTools: string[];
            yolo?: boolean | undefined;
            allowOverrides?: boolean | undefined;
        };
        plan: {
            readonly: boolean;
            network: boolean;
            approvedTools: string[];
            yolo?: boolean | undefined;
            allowOverrides?: boolean | undefined;
        };
        accepting_edits: {
            readonly: boolean;
            network: boolean;
            approvedTools: string[];
            yolo?: boolean | undefined;
            allowOverrides?: boolean | undefined;
        };
    };
}, {
    modes: {
        default: {
            readonly: boolean;
            network: boolean;
            approvedTools: string[];
            yolo?: boolean | undefined;
            allowOverrides?: boolean | undefined;
        };
        plan: {
            readonly: boolean;
            network: boolean;
            approvedTools: string[];
            yolo?: boolean | undefined;
            allowOverrides?: boolean | undefined;
        };
        accepting_edits: {
            readonly: boolean;
            network: boolean;
            approvedTools: string[];
            yolo?: boolean | undefined;
            allowOverrides?: boolean | undefined;
        };
    };
    commands?: Record<string, {
        allowed_paths?: string[] | undefined;
        allow_network?: boolean | undefined;
    }> | undefined;
}>;
export type SandboxModeConfig = z.infer<typeof SandboxModeConfigSchema>;
export type PersistentCommandConfig = z.infer<typeof PersistentCommandConfigSchema>;
export type SandboxTomlSchemaType = z.infer<typeof SandboxTomlSchema>;
export declare class SandboxPolicyManager {
    private static _DEFAULT_CONFIG;
    private static get DEFAULT_CONFIG();
    private config;
    private readonly configPath;
    private sessionApprovals;
    constructor(customConfigPath?: string);
    private isProtectedKey;
    private loadConfig;
    private saveConfig;
    getModeConfig(mode: 'plan' | 'accepting_edits' | 'default' | 'yolo' | string): SandboxModeConfig;
    getCommandPermissions(commandName: string): SandboxPermissions;
    addSessionApproval(commandName: string, permissions: SandboxPermissions): void;
    addPersistentApproval(commandName: string, permissions: SandboxPermissions): void;
}
