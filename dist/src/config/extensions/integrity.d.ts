/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type ExtensionInstallMetadata } from '../config.js';
import { type IExtensionIntegrity, IntegrityDataStatus } from './integrityTypes.js';
export * from './integrityTypes.js';
/**
 * Implementation of IExtensionIntegrity that persists data to disk.
 */
export declare class ExtensionIntegrityManager implements IExtensionIntegrity {
    private readonly keyManager;
    private readonly integrityStore;
    private writeLock;
    constructor();
    /**
     * Verifies the provided metadata against the recorded integrity data.
     */
    verify(extensionName: string, metadata: ExtensionInstallMetadata | undefined): Promise<IntegrityDataStatus>;
    /**
     * Records the integrity data for an extension.
     * Uses a promise chain to serialize concurrent store operations.
     */
    store(extensionName: string, metadata: ExtensionInstallMetadata): Promise<void>;
    /**
     * Retrieves or generates the master secret key.
     * @internal visible for testing
     */
    getSecretKey(): Promise<string>;
}
