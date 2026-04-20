/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Configuration for an OAuth 2.0 Authorization Code flow.
 * Contains only the fields needed by the shared flow utilities.
 */
export interface OAuthFlowConfig {
    clientId: string;
    clientSecret?: string;
    authorizationUrl: string;
    tokenUrl: string;
    scopes?: string[];
    audiences?: string[];
    redirectUri?: string;
}
/**
 * Configuration subset needed for token refresh operations.
 */
export type OAuthRefreshConfig = Pick<OAuthFlowConfig, 'clientId' | 'clientSecret' | 'scopes' | 'audiences'>;
/**
 * PKCE (Proof Key for Code Exchange) parameters.
 */
export interface PKCEParams {
    codeVerifier: string;
    codeChallenge: string;
    state: string;
}
/**
 * OAuth authorization response from the callback server.
 */
export interface OAuthAuthorizationResponse {
    code: string;
    state: string;
}
/**
 * OAuth token response from the authorization server.
 */
export interface OAuthTokenResponse {
    access_token: string;
    token_type: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
}
/** The path the local callback server listens on. */
export declare const REDIRECT_PATH = "/oauth/callback";
/**
 * Generate PKCE parameters for OAuth flow.
 *
 * @returns PKCE parameters including code verifier, challenge, and state
 */
export declare function generatePKCEParams(): PKCEParams;
/**
 * Start a local HTTP server to handle OAuth callback.
 * The server will listen on the specified port (or port 0 for OS assignment).
 *
 * @param expectedState The state parameter to validate
 * @param port Optional preferred port to listen on
 * @returns Object containing the port (available immediately) and a promise for the auth response
 */
export declare function startCallbackServer(expectedState: string, port?: number): {
    port: Promise<number>;
    response: Promise<OAuthAuthorizationResponse>;
};
/**
 * Extract the port number from a URL string if available and valid.
 *
 * @param urlString The URL string to parse
 * @returns The port number or undefined if not found or invalid
 */
export declare function getPortFromUrl(urlString?: string): number | undefined;
/**
 * Build the authorization URL for the OAuth flow.
 *
 * @param config OAuth flow configuration
 * @param pkceParams PKCE parameters
 * @param redirectPort The port to use for the redirect URI
 * @param resource Optional resource parameter value (RFC 8707)
 * @returns The authorization URL
 */
export declare function buildAuthorizationUrl(config: OAuthFlowConfig, pkceParams: PKCEParams, redirectPort: number, resource?: string): string;
/**
 * Exchange an authorization code for tokens.
 *
 * @param config OAuth flow configuration
 * @param code Authorization code
 * @param codeVerifier PKCE code verifier
 * @param redirectPort The port to use for the redirect URI
 * @param resource Optional resource parameter value (RFC 8707)
 * @returns The token response
 */
export declare function exchangeCodeForToken(config: OAuthFlowConfig, code: string, codeVerifier: string, redirectPort: number, resource?: string): Promise<OAuthTokenResponse>;
/**
 * Refresh an access token using a refresh token.
 *
 * @param config OAuth configuration subset needed for refresh
 * @param refreshToken The refresh token
 * @param tokenUrl The token endpoint URL
 * @param resource Optional resource parameter value (RFC 8707)
 * @returns The new token response
 */
export declare function refreshAccessToken(config: OAuthRefreshConfig, refreshToken: string, tokenUrl: string, resource?: string): Promise<OAuthTokenResponse>;
