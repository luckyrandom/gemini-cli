/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface FileFilteringOptions {
    respectGitIgnore: boolean;
    respectGeminiIgnore: boolean;
    maxFileCount?: number;
    searchTimeout?: number;
    customIgnoreFilePaths: string[];
}
export declare const DEFAULT_MEMORY_FILE_FILTERING_OPTIONS: FileFilteringOptions;
export declare const DEFAULT_FILE_FILTERING_OPTIONS: FileFilteringOptions;
export declare const GEMINI_IGNORE_FILE_NAME = ".geminiignore";
export declare const INTEGRITY_FILENAME = "extension_integrity.json";
export declare const INTEGRITY_KEY_FILENAME = "integrity.key";
export declare const KEYCHAIN_SERVICE_NAME = "gemini-cli-extension-integrity";
export declare const SECRET_KEY_ACCOUNT = "secret-key";
