/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface FilterFilesOptions {
    respectGitIgnore?: boolean;
    respectGeminiIgnore?: boolean;
    customIgnoreFilePaths?: string[];
}
export interface FilterReport {
    filteredPaths: string[];
    ignoredCount: number;
}
export declare class FileDiscoveryService {
    private gitIgnoreFilter;
    private geminiIgnoreFilter;
    private customIgnoreFilter;
    private combinedIgnoreFilter;
    private defaultFilterFileOptions;
    private projectRoot;
    constructor(projectRoot: string, options?: FilterFilesOptions);
    /**
     * Returns all absolute paths (files and directories) within the project root that should be ignored.
     */
    getIgnoredPaths(options?: FilterFilesOptions): Promise<string[]>;
    private applyFilterFilesOptions;
    /**
     * Filters a list of file paths based on ignore rules.
     *
     * NOTE: Directory paths must include a trailing slash to be correctly identified and
     * matched against directory-specific ignore patterns (e.g., 'dist/').
     */
    filterFiles(filePaths: string[], options?: FilterFilesOptions): string[];
    /**
     * Filters a list of file paths based on git ignore rules and returns a report
     * with counts of ignored files.
     */
    filterFilesWithReport(filePaths: string[], opts?: FilterFilesOptions): FilterReport;
    /**
     * Checks if a specific file should be ignored based on project ignore rules.
     */
    shouldIgnoreFile(filePath: string, options?: FilterFilesOptions): boolean;
    /**
     * Checks if a specific directory should be ignored based on project ignore rules.
     */
    shouldIgnoreDirectory(dirPath: string, options?: FilterFilesOptions): boolean;
    /**
     * Internal unified check for paths.
     */
    private _shouldIgnore;
    /**
     * Returns the list of ignore files being used (e.g. .geminiignore) excluding .gitignore.
     */
    getIgnoreFilePaths(): string[];
    /**
     * Returns all ignore files including .gitignore if applicable.
     */
    getAllIgnoreFilePaths(): string[];
}
