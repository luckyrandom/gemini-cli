/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Keychain } from './keychainTypes.js';
export declare class FileKeychain implements Keychain {
    private readonly tokenFilePath;
    private readonly encryptionKey;
    constructor();
    private deriveEncryptionKey;
    private encrypt;
    private decrypt;
    private ensureDirectoryExists;
    private loadData;
    private saveData;
    getPassword(service: string, account: string): Promise<string | null>;
    setPassword(service: string, account: string, password: string): Promise<void>;
    deletePassword(service: string, account: string): Promise<boolean>;
    findCredentials(service: string): Promise<Array<{
        account: string;
        password: string;
    }>>;
}
