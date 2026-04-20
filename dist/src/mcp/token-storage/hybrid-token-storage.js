/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseTokenStorage } from './base-token-storage.js';
import { KeychainTokenStorage } from './keychain-token-storage.js';
import { TokenStorageType, } from './types.js';
import { coreEvents } from '../../utils/events.js';
import { TokenStorageInitializationEvent } from '../../telemetry/types.js';
import { FORCE_FILE_STORAGE_ENV_VAR } from '../../services/keychainService.js';
export class HybridTokenStorage extends BaseTokenStorage {
    storage = null;
    storageType = null;
    storageInitPromise = null;
    constructor(serviceName) {
        super(serviceName);
    }
    async initializeStorage() {
        const forceFileStorage = process.env[FORCE_FILE_STORAGE_ENV_VAR] === 'true';
        const keychainStorage = new KeychainTokenStorage(this.serviceName);
        this.storage = keychainStorage;
        const isUsingFileFallback = await keychainStorage.isUsingFileFallback();
        this.storageType = isUsingFileFallback
            ? TokenStorageType.ENCRYPTED_FILE
            : TokenStorageType.KEYCHAIN;
        coreEvents.emitTelemetryTokenStorageType(new TokenStorageInitializationEvent(isUsingFileFallback ? 'encrypted_file' : 'keychain', forceFileStorage));
        return this.storage;
    }
    async getStorage() {
        if (this.storage !== null) {
            return this.storage;
        }
        // Use a single initialization promise to avoid race conditions
        if (!this.storageInitPromise) {
            this.storageInitPromise = this.initializeStorage();
        }
        // Wait for initialization to complete
        return this.storageInitPromise;
    }
    async getCredentials(serverName) {
        const storage = await this.getStorage();
        return storage.getCredentials(serverName);
    }
    async setCredentials(credentials) {
        const storage = await this.getStorage();
        await storage.setCredentials(credentials);
    }
    async deleteCredentials(serverName) {
        const storage = await this.getStorage();
        await storage.deleteCredentials(serverName);
    }
    async listServers() {
        const storage = await this.getStorage();
        return storage.listServers();
    }
    async getAllCredentials() {
        const storage = await this.getStorage();
        return storage.getAllCredentials();
    }
    async clearAll() {
        const storage = await this.getStorage();
        await storage.clearAll();
    }
    async getStorageType() {
        await this.getStorage();
        return this.storageType;
    }
}
//# sourceMappingURL=hybrid-token-storage.js.map