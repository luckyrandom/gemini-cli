/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { HttpHeaders } from '@a2a-js/sdk/client';
import { BaseA2AAuthProvider } from './base-provider.js';
import type { GoogleCredentialsAuthConfig } from './types.js';
/**
 * Authentication provider for Google ADC (Application Default Credentials).
 * Automatically decides whether to use identity tokens or access tokens
 * based on the target endpoint URL.
 */
export declare class GoogleCredentialsAuthProvider extends BaseA2AAuthProvider {
    private readonly config;
    readonly type: "google-credentials";
    private readonly auth;
    private readonly useIdToken;
    private readonly audience?;
    private cachedToken?;
    private tokenExpiryTime?;
    constructor(config: GoogleCredentialsAuthConfig, targetUrl?: string);
    initialize(): Promise<void>;
    headers(): Promise<HttpHeaders>;
    shouldRetryWithHeaders(_req: RequestInit, res: Response): Promise<HttpHeaders | undefined>;
}
