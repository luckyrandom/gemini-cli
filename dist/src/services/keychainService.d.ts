/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export declare const FORCE_FILE_STORAGE_ENV_VAR = "GEMINI_FORCE_FILE_STORAGE";
/**
 * Service for interacting with OS-level secure storage (e.g. @github/keytar).
 */
export declare class KeychainService {
    private readonly serviceName;
    private initializationPromise?;
    /**
     * @param serviceName Unique identifier for the app in the OS keychain.
     */
    constructor(serviceName: string);
    isAvailable(): Promise<boolean>;
    /**
     * Returns true if the service is using the encrypted file fallback backend.
     */
    isUsingFileFallback(): Promise<boolean>;
    /**
     * Retrieves a secret for the given account.
     * @throws Error if the keychain is unavailable.
     */
    getPassword(account: string): Promise<string | null>;
    /**
     * Securely stores a secret.
     * @throws Error if the keychain is unavailable.
     */
    setPassword(account: string, value: string): Promise<void>;
    /**
     * Removes a secret from the keychain.
     * @returns true if the secret was deleted, false otherwise.
     * @throws Error if the keychain is unavailable.
     */
    deletePassword(account: string): Promise<boolean>;
    /**
     * Lists all account/secret pairs stored under this service.
     * @throws Error if the keychain is unavailable.
     */
    findCredentials(): Promise<Array<{
        account: string;
        password: string;
    }>>;
    private getKeychainOrThrow;
    private getKeychain;
    private initializeKeychain;
    /**
     * Attempts to load and verify the native keychain module (@github/keytar).
     */
    private getNativeKeychain;
    private loadKeychainModule;
    private isKeychainFunctional;
    /**
     * MacOS-specific check to detect if a default keychain is available.
     */
    private isMacOSKeychainAvailable;
}
