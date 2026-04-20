/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type HttpHeaders } from '@a2a-js/sdk/client';
import type { AgentCard } from '@a2a-js/sdk';
import { BaseA2AAuthProvider } from './base-provider.js';
import type { OAuth2AuthConfig } from './types.js';
/**
 * Authentication provider for OAuth 2.0 Authorization Code flow with PKCE.
 *
 * Used by A2A remote agents whose security scheme is `oauth2`.
 * Reuses the shared OAuth flow primitives from `utils/oauth-flow.ts`
 * and persists tokens via `MCPOAuthTokenStorage`.
 */
export declare class OAuth2AuthProvider extends BaseA2AAuthProvider {
    private readonly config;
    private readonly agentName;
    private readonly agentCardUrl?;
    readonly type: "oauth2";
    private readonly tokenStorage;
    private cachedToken;
    /** Resolved OAuth URLs — may come from config or agent card. */
    private authorizationUrl;
    private tokenUrl;
    private scopes;
    constructor(config: OAuth2AuthConfig, agentName: string, agentCard?: AgentCard, agentCardUrl?: string | undefined);
    /**
     * Initialize the provider by loading any persisted token from storage.
     * Also discovers OAuth URLs from the agent card if not yet resolved.
     */
    initialize(): Promise<void>;
    /**
     * Return an Authorization header with a valid Bearer token.
     * Refreshes or triggers interactive auth as needed.
     */
    headers(): Promise<HttpHeaders>;
    /**
     * On 401/403, clear the cached token and re-authenticate (up to MAX_AUTH_RETRIES).
     */
    shouldRetryWithHeaders(_req: RequestInit, res: Response): Promise<HttpHeaders | undefined>;
    /**
     * Merge authorization_url, token_url, and scopes from the agent card's
     * `securitySchemes` when not already provided via user config.
     */
    private mergeAgentCardDefaults;
    /**
     * Fetch the agent card from `agentCardUrl` using `DefaultAgentCardResolver`
     * (which normalizes proto-format cards) and extract OAuth2 URLs.
     */
    private fetchAgentCardDefaults;
    /**
     * Run a full OAuth 2.0 Authorization Code + PKCE flow through the browser.
     */
    private authenticateInteractively;
    /**
     * Convert an `OAuthTokenResponse` into the internal `OAuthToken` format.
     */
    private toOAuthToken;
    /**
     * Persist the current cached token to disk.
     */
    private persistToken;
}
