/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseTokenStorage } from './base-token-storage.js';
import type { OAuthCredentials, SecretStorage } from './types.js';
export declare class KeychainTokenStorage extends BaseTokenStorage implements SecretStorage {
    private readonly keychainService;
    constructor(serviceName: string);
    getCredentials(serverName: string): Promise<OAuthCredentials | null>;
    setCredentials(credentials: OAuthCredentials): Promise<void>;
    deleteCredentials(serverName: string): Promise<void>;
    listServers(): Promise<string[]>;
    getAllCredentials(): Promise<Map<string, OAuthCredentials>>;
    clearAll(): Promise<void>;
    isAvailable(): Promise<boolean>;
    isUsingFileFallback(): Promise<boolean>;
    setSecret(key: string, value: string): Promise<void>;
    getSecret(key: string): Promise<string | null>;
    deleteSecret(key: string): Promise<void>;
    listSecrets(): Promise<string[]>;
}
