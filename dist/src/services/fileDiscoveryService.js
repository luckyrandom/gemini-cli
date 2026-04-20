/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { GitIgnoreParser, } from '../utils/gitIgnoreParser.js';
import { IgnoreFileParser, } from '../utils/ignoreFileParser.js';
import { isGitRepository } from '../utils/gitUtils.js';
import { GEMINI_IGNORE_FILE_NAME } from '../config/constants.js';
import { isNodeError } from '../utils/errors.js';
import { debugLogger } from '../utils/debugLogger.js';
import fs from 'node:fs';
import * as path from 'node:path';
export class FileDiscoveryService {
    gitIgnoreFilter = null;
    geminiIgnoreFilter = null;
    customIgnoreFilter = null;
    combinedIgnoreFilter = null;
    defaultFilterFileOptions = {
        respectGitIgnore: true,
        respectGeminiIgnore: true,
        customIgnoreFilePaths: [],
    };
    projectRoot;
    constructor(projectRoot, options) {
        this.projectRoot = path.resolve(projectRoot);
        this.applyFilterFilesOptions(options);
        if (isGitRepository(this.projectRoot)) {
            this.gitIgnoreFilter = new GitIgnoreParser(this.projectRoot);
        }
        this.geminiIgnoreFilter = new IgnoreFileParser(this.projectRoot, GEMINI_IGNORE_FILE_NAME);
        if (this.defaultFilterFileOptions.customIgnoreFilePaths?.length) {
            this.customIgnoreFilter = new IgnoreFileParser(this.projectRoot, this.defaultFilterFileOptions.customIgnoreFilePaths);
        }
        if (this.gitIgnoreFilter) {
            const geminiPatterns = this.geminiIgnoreFilter.getPatterns();
            const customPatterns = this.customIgnoreFilter
                ? this.customIgnoreFilter.getPatterns()
                : [];
            // Create combined parser: .gitignore + .geminiignore + custom ignore
            this.combinedIgnoreFilter = new GitIgnoreParser(this.projectRoot, 
            // customPatterns should go the last to ensure overwriting of geminiPatterns
            [...geminiPatterns, ...customPatterns]);
        }
        else {
            // Create combined parser when not git repo
            const geminiPatterns = this.geminiIgnoreFilter.getPatterns();
            const customPatterns = this.customIgnoreFilter
                ? this.customIgnoreFilter.getPatterns()
                : [];
            this.combinedIgnoreFilter = new IgnoreFileParser(this.projectRoot, [...geminiPatterns, ...customPatterns], true);
        }
    }
    /**
     * Returns all absolute paths (files and directories) within the project root that should be ignored.
     */
    async getIgnoredPaths(options = {}) {
        const ignoredPaths = [];
        /**
         * Recursively walks the directory tree to find ignored paths.
         */
        const walk = async (currentDir) => {
            let dirEntries;
            try {
                dirEntries = await fs.promises.readdir(currentDir, {
                    withFileTypes: true,
                });
            }
            catch (error) {
                if (isNodeError(error) &&
                    (error.code === 'EACCES' || error.code === 'ENOENT')) {
                    // Stop if the directory is inaccessible or doesn't exist
                    debugLogger.debug(`Skipping directory ${currentDir} due to ${error.code}`);
                    return;
                }
                throw error;
            }
            // Traverse sibling directories concurrently to improve performance.
            await Promise.all(dirEntries.map(async (entry) => {
                const fullPath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    // Optimization: If a directory is ignored, its contents are not traversed.
                    if (this.shouldIgnoreDirectory(fullPath, options)) {
                        ignoredPaths.push(fullPath);
                    }
                    else {
                        await walk(fullPath);
                    }
                }
                else {
                    if (this.shouldIgnoreFile(fullPath, options)) {
                        ignoredPaths.push(fullPath);
                    }
                }
            }));
        };
        await walk(this.projectRoot);
        return ignoredPaths;
    }
    applyFilterFilesOptions(options) {
        if (!options)
            return;
        if (options.respectGitIgnore !== undefined) {
            this.defaultFilterFileOptions.respectGitIgnore = options.respectGitIgnore;
        }
        if (options.respectGeminiIgnore !== undefined) {
            this.defaultFilterFileOptions.respectGeminiIgnore =
                options.respectGeminiIgnore;
        }
        if (options.customIgnoreFilePaths) {
            this.defaultFilterFileOptions.customIgnoreFilePaths =
                options.customIgnoreFilePaths;
        }
    }
    /**
     * Filters a list of file paths based on ignore rules.
     *
     * NOTE: Directory paths must include a trailing slash to be correctly identified and
     * matched against directory-specific ignore patterns (e.g., 'dist/').
     */
    filterFiles(filePaths, options = {}) {
        return filePaths.filter((filePath) => {
            // Infer directory status from the string format
            const isDir = filePath.endsWith('/') || filePath.endsWith('\\');
            return !this._shouldIgnore(filePath, isDir, options);
        });
    }
    /**
     * Filters a list of file paths based on git ignore rules and returns a report
     * with counts of ignored files.
     */
    filterFilesWithReport(filePaths, opts = {
        respectGitIgnore: true,
        respectGeminiIgnore: true,
    }) {
        const filteredPaths = this.filterFiles(filePaths, opts);
        const ignoredCount = filePaths.length - filteredPaths.length;
        return {
            filteredPaths,
            ignoredCount,
        };
    }
    /**
     * Checks if a specific file should be ignored based on project ignore rules.
     */
    shouldIgnoreFile(filePath, options = {}) {
        return this._shouldIgnore(filePath, false, options);
    }
    /**
     * Checks if a specific directory should be ignored based on project ignore rules.
     */
    shouldIgnoreDirectory(dirPath, options = {}) {
        return this._shouldIgnore(dirPath, true, options);
    }
    /**
     * Internal unified check for paths.
     */
    _shouldIgnore(filePath, isDirectory, options = {}) {
        const { respectGitIgnore = this.defaultFilterFileOptions.respectGitIgnore, respectGeminiIgnore = this.defaultFilterFileOptions.respectGeminiIgnore, } = options;
        if (respectGitIgnore && respectGeminiIgnore && this.combinedIgnoreFilter) {
            return this.combinedIgnoreFilter.isIgnored(filePath, isDirectory);
        }
        if (this.customIgnoreFilter?.isIgnored(filePath, isDirectory)) {
            return true;
        }
        if (respectGitIgnore &&
            this.gitIgnoreFilter?.isIgnored(filePath, isDirectory)) {
            return true;
        }
        if (respectGeminiIgnore &&
            this.geminiIgnoreFilter?.isIgnored(filePath, isDirectory)) {
            return true;
        }
        return false;
    }
    /**
     * Returns the list of ignore files being used (e.g. .geminiignore) excluding .gitignore.
     */
    getIgnoreFilePaths() {
        const paths = [];
        if (this.geminiIgnoreFilter &&
            this.defaultFilterFileOptions.respectGeminiIgnore) {
            paths.push(...this.geminiIgnoreFilter.getIgnoreFilePaths());
        }
        if (this.customIgnoreFilter) {
            paths.push(...this.customIgnoreFilter.getIgnoreFilePaths());
        }
        return paths;
    }
    /**
     * Returns all ignore files including .gitignore if applicable.
     */
    getAllIgnoreFilePaths() {
        const paths = [];
        if (this.gitIgnoreFilter &&
            this.defaultFilterFileOptions.respectGitIgnore) {
            const gitIgnorePath = path.join(this.projectRoot, '.gitignore');
            if (fs.existsSync(gitIgnorePath)) {
                paths.push(gitIgnorePath);
            }
        }
        return paths.concat(this.getIgnoreFilePaths());
    }
}
//# sourceMappingURL=fileDiscoveryService.js.map