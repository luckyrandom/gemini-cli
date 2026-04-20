/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { z } from 'zod';
import { type AgentDefinition } from './types.js';
/**
 * Error thrown when an agent definition is invalid or cannot be loaded.
 */
export declare class AgentLoadError extends Error {
    filePath: string;
    constructor(filePath: string, message: string);
}
/**
 * Result of loading agents from a directory.
 */
export interface AgentLoadResult {
    agents: AgentDefinition[];
    errors: AgentLoadError[];
}
declare const localAgentSchema: z.ZodObject<{
    kind: z.ZodDefault<z.ZodOptional<z.ZodLiteral<"local">>>;
    name: z.ZodString;
    description: z.ZodString;
    display_name: z.ZodOptional<z.ZodString>;
    tools: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
    mcp_servers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        command: z.ZodOptional<z.ZodString>;
        args: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        cwd: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
        http_url: z.ZodOptional<z.ZodString>;
        headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        tcp: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodEnum<["sse", "http"]>>;
        timeout: z.ZodOptional<z.ZodNumber>;
        trust: z.ZodOptional<z.ZodBoolean>;
        description: z.ZodOptional<z.ZodString>;
        include_tools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        exclude_tools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        auth: z.ZodOptional<z.ZodUnion<[z.ZodObject<{
            type: z.ZodLiteral<"google-credentials">;
            scopes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            type: "google-credentials";
            scopes?: string[] | undefined;
        }, {
            type: "google-credentials";
            scopes?: string[] | undefined;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"oauth">;
            client_id: z.ZodOptional<z.ZodString>;
            client_secret: z.ZodOptional<z.ZodString>;
            scopes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            authorization_url: z.ZodOptional<z.ZodString>;
            token_url: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "oauth";
            scopes?: string[] | undefined;
            client_id?: string | undefined;
            client_secret?: string | undefined;
            token_url?: string | undefined;
            authorization_url?: string | undefined;
        }, {
            type: "oauth";
            scopes?: string[] | undefined;
            client_id?: string | undefined;
            client_secret?: string | undefined;
            token_url?: string | undefined;
            authorization_url?: string | undefined;
        }>]>>;
    }, "strip", z.ZodTypeAny, {
        type?: "http" | "sse" | undefined;
        command?: string | undefined;
        args?: string[] | undefined;
        auth?: {
            type: "google-credentials";
            scopes?: string[] | undefined;
        } | {
            type: "oauth";
            scopes?: string[] | undefined;
            client_id?: string | undefined;
            client_secret?: string | undefined;
            token_url?: string | undefined;
            authorization_url?: string | undefined;
        } | undefined;
        headers?: Record<string, string> | undefined;
        url?: string | undefined;
        description?: string | undefined;
        timeout?: number | undefined;
        env?: Record<string, string> | undefined;
        cwd?: string | undefined;
        trust?: boolean | undefined;
        http_url?: string | undefined;
        tcp?: string | undefined;
        include_tools?: string[] | undefined;
        exclude_tools?: string[] | undefined;
    }, {
        type?: "http" | "sse" | undefined;
        command?: string | undefined;
        args?: string[] | undefined;
        auth?: {
            type: "google-credentials";
            scopes?: string[] | undefined;
        } | {
            type: "oauth";
            scopes?: string[] | undefined;
            client_id?: string | undefined;
            client_secret?: string | undefined;
            token_url?: string | undefined;
            authorization_url?: string | undefined;
        } | undefined;
        headers?: Record<string, string> | undefined;
        url?: string | undefined;
        description?: string | undefined;
        timeout?: number | undefined;
        env?: Record<string, string> | undefined;
        cwd?: string | undefined;
        trust?: boolean | undefined;
        http_url?: string | undefined;
        tcp?: string | undefined;
        include_tools?: string[] | undefined;
        exclude_tools?: string[] | undefined;
    }>>>;
    model: z.ZodOptional<z.ZodString>;
    temperature: z.ZodOptional<z.ZodNumber>;
    max_turns: z.ZodOptional<z.ZodNumber>;
    timeout_mins: z.ZodOptional<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    name: string;
    description: string;
    kind: "local";
    model?: string | undefined;
    tools?: string[] | undefined;
    temperature?: number | undefined;
    mcp_servers?: Record<string, {
        type?: "http" | "sse" | undefined;
        command?: string | undefined;
        args?: string[] | undefined;
        auth?: {
            type: "google-credentials";
            scopes?: string[] | undefined;
        } | {
            type: "oauth";
            scopes?: string[] | undefined;
            client_id?: string | undefined;
            client_secret?: string | undefined;
            token_url?: string | undefined;
            authorization_url?: string | undefined;
        } | undefined;
        headers?: Record<string, string> | undefined;
        url?: string | undefined;
        description?: string | undefined;
        timeout?: number | undefined;
        env?: Record<string, string> | undefined;
        cwd?: string | undefined;
        trust?: boolean | undefined;
        http_url?: string | undefined;
        tcp?: string | undefined;
        include_tools?: string[] | undefined;
        exclude_tools?: string[] | undefined;
    }> | undefined;
    display_name?: string | undefined;
    max_turns?: number | undefined;
    timeout_mins?: number | undefined;
}, {
    name: string;
    description: string;
    model?: string | undefined;
    tools?: string[] | undefined;
    kind?: "local" | undefined;
    temperature?: number | undefined;
    mcp_servers?: Record<string, {
        type?: "http" | "sse" | undefined;
        command?: string | undefined;
        args?: string[] | undefined;
        auth?: {
            type: "google-credentials";
            scopes?: string[] | undefined;
        } | {
            type: "oauth";
            scopes?: string[] | undefined;
            client_id?: string | undefined;
            client_secret?: string | undefined;
            token_url?: string | undefined;
            authorization_url?: string | undefined;
        } | undefined;
        headers?: Record<string, string> | undefined;
        url?: string | undefined;
        description?: string | undefined;
        timeout?: number | undefined;
        env?: Record<string, string> | undefined;
        cwd?: string | undefined;
        trust?: boolean | undefined;
        http_url?: string | undefined;
        tcp?: string | undefined;
        include_tools?: string[] | undefined;
        exclude_tools?: string[] | undefined;
    }> | undefined;
    display_name?: string | undefined;
    max_turns?: number | undefined;
    timeout_mins?: number | undefined;
}>;
type FrontmatterLocalAgentDefinition = z.infer<typeof localAgentSchema> & {
    system_prompt: string;
};
declare const remoteAgentSchema: z.ZodUnion<[z.ZodObject<{
    kind: z.ZodDefault<z.ZodOptional<z.ZodLiteral<"remote">>>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    display_name: z.ZodOptional<z.ZodString>;
    auth: z.ZodOptional<z.ZodEffects<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"apiKey">;
        key: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "apiKey";
        key: string;
        name?: string | undefined;
    }, {
        type: "apiKey";
        key: string;
        name?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"http">;
        scheme: z.ZodString;
        token: z.ZodOptional<z.ZodString>;
        username: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "http";
        scheme: string;
        value?: string | undefined;
        token?: string | undefined;
        password?: string | undefined;
        username?: string | undefined;
    }, {
        type: "http";
        scheme: string;
        value?: string | undefined;
        token?: string | undefined;
        password?: string | undefined;
        username?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"google-credentials">;
        scopes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "google-credentials";
        scopes?: string[] | undefined;
    }, {
        type: "google-credentials";
        scopes?: string[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"oauth">;
        client_id: z.ZodOptional<z.ZodString>;
        client_secret: z.ZodOptional<z.ZodString>;
        scopes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        authorization_url: z.ZodOptional<z.ZodString>;
        token_url: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "oauth";
        scopes?: string[] | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        token_url?: string | undefined;
        authorization_url?: string | undefined;
    }, {
        type: "oauth";
        scopes?: string[] | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        token_url?: string | undefined;
        authorization_url?: string | undefined;
    }>]>, {
        type: "apiKey";
        key: string;
        name?: string | undefined;
    } | {
        type: "http";
        scheme: string;
        value?: string | undefined;
        token?: string | undefined;
        password?: string | undefined;
        username?: string | undefined;
    } | {
        type: "google-credentials";
        scopes?: string[] | undefined;
    } | {
        type: "oauth";
        scopes?: string[] | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        token_url?: string | undefined;
        authorization_url?: string | undefined;
    }, {
        type: "apiKey";
        key: string;
        name?: string | undefined;
    } | {
        type: "http";
        scheme: string;
        value?: string | undefined;
        token?: string | undefined;
        password?: string | undefined;
        username?: string | undefined;
    } | {
        type: "google-credentials";
        scopes?: string[] | undefined;
    } | {
        type: "oauth";
        scopes?: string[] | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        token_url?: string | undefined;
        authorization_url?: string | undefined;
    }>>;
} & {
    agent_card_url: z.ZodString;
    agent_card_json: z.ZodOptional<z.ZodUndefined>;
}, "strict", z.ZodTypeAny, {
    name: string;
    kind: "remote";
    agent_card_url: string;
    auth?: {
        type: "apiKey";
        key: string;
        name?: string | undefined;
    } | {
        type: "http";
        scheme: string;
        value?: string | undefined;
        token?: string | undefined;
        password?: string | undefined;
        username?: string | undefined;
    } | {
        type: "google-credentials";
        scopes?: string[] | undefined;
    } | {
        type: "oauth";
        scopes?: string[] | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        token_url?: string | undefined;
        authorization_url?: string | undefined;
    } | undefined;
    description?: string | undefined;
    display_name?: string | undefined;
    agent_card_json?: undefined;
}, {
    name: string;
    agent_card_url: string;
    auth?: {
        type: "apiKey";
        key: string;
        name?: string | undefined;
    } | {
        type: "http";
        scheme: string;
        value?: string | undefined;
        token?: string | undefined;
        password?: string | undefined;
        username?: string | undefined;
    } | {
        type: "google-credentials";
        scopes?: string[] | undefined;
    } | {
        type: "oauth";
        scopes?: string[] | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        token_url?: string | undefined;
        authorization_url?: string | undefined;
    } | undefined;
    description?: string | undefined;
    kind?: "remote" | undefined;
    display_name?: string | undefined;
    agent_card_json?: undefined;
}>, z.ZodObject<{
    kind: z.ZodDefault<z.ZodOptional<z.ZodLiteral<"remote">>>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    display_name: z.ZodOptional<z.ZodString>;
    auth: z.ZodOptional<z.ZodEffects<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"apiKey">;
        key: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "apiKey";
        key: string;
        name?: string | undefined;
    }, {
        type: "apiKey";
        key: string;
        name?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"http">;
        scheme: z.ZodString;
        token: z.ZodOptional<z.ZodString>;
        username: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "http";
        scheme: string;
        value?: string | undefined;
        token?: string | undefined;
        password?: string | undefined;
        username?: string | undefined;
    }, {
        type: "http";
        scheme: string;
        value?: string | undefined;
        token?: string | undefined;
        password?: string | undefined;
        username?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"google-credentials">;
        scopes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "google-credentials";
        scopes?: string[] | undefined;
    }, {
        type: "google-credentials";
        scopes?: string[] | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"oauth">;
        client_id: z.ZodOptional<z.ZodString>;
        client_secret: z.ZodOptional<z.ZodString>;
        scopes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        authorization_url: z.ZodOptional<z.ZodString>;
        token_url: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "oauth";
        scopes?: string[] | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        token_url?: string | undefined;
        authorization_url?: string | undefined;
    }, {
        type: "oauth";
        scopes?: string[] | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        token_url?: string | undefined;
        authorization_url?: string | undefined;
    }>]>, {
        type: "apiKey";
        key: string;
        name?: string | undefined;
    } | {
        type: "http";
        scheme: string;
        value?: string | undefined;
        token?: string | undefined;
        password?: string | undefined;
        username?: string | undefined;
    } | {
        type: "google-credentials";
        scopes?: string[] | undefined;
    } | {
        type: "oauth";
        scopes?: string[] | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        token_url?: string | undefined;
        authorization_url?: string | undefined;
    }, {
        type: "apiKey";
        key: string;
        name?: string | undefined;
    } | {
        type: "http";
        scheme: string;
        value?: string | undefined;
        token?: string | undefined;
        password?: string | undefined;
        username?: string | undefined;
    } | {
        type: "google-credentials";
        scopes?: string[] | undefined;
    } | {
        type: "oauth";
        scopes?: string[] | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        token_url?: string | undefined;
        authorization_url?: string | undefined;
    }>>;
} & {
    agent_card_url: z.ZodOptional<z.ZodUndefined>;
    agent_card_json: z.ZodEffects<z.ZodString, string, string>;
}, "strict", z.ZodTypeAny, {
    name: string;
    kind: "remote";
    agent_card_json: string;
    auth?: {
        type: "apiKey";
        key: string;
        name?: string | undefined;
    } | {
        type: "http";
        scheme: string;
        value?: string | undefined;
        token?: string | undefined;
        password?: string | undefined;
        username?: string | undefined;
    } | {
        type: "google-credentials";
        scopes?: string[] | undefined;
    } | {
        type: "oauth";
        scopes?: string[] | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        token_url?: string | undefined;
        authorization_url?: string | undefined;
    } | undefined;
    description?: string | undefined;
    display_name?: string | undefined;
    agent_card_url?: undefined;
}, {
    name: string;
    agent_card_json: string;
    auth?: {
        type: "apiKey";
        key: string;
        name?: string | undefined;
    } | {
        type: "http";
        scheme: string;
        value?: string | undefined;
        token?: string | undefined;
        password?: string | undefined;
        username?: string | undefined;
    } | {
        type: "google-credentials";
        scopes?: string[] | undefined;
    } | {
        type: "oauth";
        scopes?: string[] | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        token_url?: string | undefined;
        authorization_url?: string | undefined;
    } | undefined;
    description?: string | undefined;
    kind?: "remote" | undefined;
    display_name?: string | undefined;
    agent_card_url?: undefined;
}>]>;
type FrontmatterRemoteAgentDefinition = z.infer<typeof remoteAgentSchema>;
type FrontmatterAgentDefinition = FrontmatterLocalAgentDefinition | FrontmatterRemoteAgentDefinition;
/**
 * Parses and validates an agent Markdown file with frontmatter.
 *
 * @param filePath Path to the Markdown file.
 * @param content Optional pre-loaded content of the file.
 * @returns An array containing the single parsed agent definition.
 * @throws AgentLoadError if parsing or validation fails.
 */
export declare function parseAgentMarkdown(filePath: string, content?: string): Promise<FrontmatterAgentDefinition[]>;
/**
 * Converts a FrontmatterAgentDefinition DTO to the internal AgentDefinition structure.
 *
 * @param markdown The parsed Markdown/Frontmatter definition.
 * @param metadata Optional metadata including hash and file path.
 * @returns The internal AgentDefinition.
 */
export declare function markdownToAgentDefinition(markdown: FrontmatterAgentDefinition, metadata?: {
    hash?: string;
    filePath?: string;
}): AgentDefinition;
/**
 * Loads all agents from a specific directory.
 * Ignores files starting with _ and non-supported extensions.
 * Supported extensions: .md
 *
 * @param dir Directory path to scan.
 * @returns Object containing successfully loaded agents and any errors.
 */
export declare function loadAgentsFromDirectory(dir: string): Promise<AgentLoadResult>;
export {};
