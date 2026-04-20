/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { FileDiscoveryService } from '../services/fileDiscoveryService.js';
import { type FileFilteringOptions } from '../config/constants.js';
import type { ExtensionLoader } from './extensionLoader.js';
import type { Config } from '../config/config.js';
import type { HierarchicalMemory } from '../config/memory.js';
export interface GeminiFileContent {
    filePath: string;
    content: string | null;
}
/**
 * Deduplicates file paths by file identity (device + inode) rather than string path.
 * This is necessary on case-insensitive filesystems where different case variants
 * of the same filename resolve to the same physical file but have different path strings.
 *
 * @param filePaths Array of file paths to deduplicate
 * @returns Object containing deduplicated file paths and a map of path to identity key
 */
export declare function deduplicatePathsByFileIdentity(filePaths: string[]): Promise<{
    paths: string[];
    identityMap: Map<string, string>;
}>;
export declare function readGeminiMdFiles(filePaths: string[], importFormat?: 'flat' | 'tree', boundaryMarkers?: readonly string[]): Promise<GeminiFileContent[]>;
export declare function concatenateInstructions(instructionContents: GeminiFileContent[]): string;
export interface MemoryLoadResult {
    files: Array<{
        path: string;
        content: string;
    }>;
    fileIdentities?: string[];
}
export declare function getGlobalMemoryPaths(): Promise<string[]>;
export declare function getUserProjectMemoryPaths(projectMemoryDir: string): Promise<string[]>;
export declare function getExtensionMemoryPaths(extensionLoader: ExtensionLoader): string[];
export declare function getEnvironmentMemoryPaths(trustedRoots: string[], boundaryMarkers?: readonly string[]): Promise<string[]>;
export declare function categorizeAndConcatenate(paths: {
    global: string[];
    extension: string[];
    project: string[];
    userProjectMemory?: string[];
}, contentsMap: Map<string, GeminiFileContent>): HierarchicalMemory;
export interface LoadServerHierarchicalMemoryResponse {
    memoryContent: HierarchicalMemory;
    fileCount: number;
    filePaths: string[];
}
/**
 * Loads hierarchical GEMINI.md files and concatenates their content.
 * This function is intended for use by the server.
 */
export declare function loadServerHierarchicalMemory(currentWorkingDirectory: string, includeDirectoriesToReadGemini: readonly string[], fileService: FileDiscoveryService, extensionLoader: ExtensionLoader, folderTrust: boolean, importFormat?: 'flat' | 'tree', fileFilteringOptions?: FileFilteringOptions, maxDirs?: number, boundaryMarkers?: readonly string[]): Promise<LoadServerHierarchicalMemoryResponse>;
/**
 * Loads the hierarchical memory and resets the state of `config` as needed such
 * that it reflects the new memory.
 *
 * Returns the result of the call to `loadHierarchicalGeminiMemory`.
 */
export declare function refreshServerHierarchicalMemory(config: Config): Promise<LoadServerHierarchicalMemoryResponse>;
export declare function loadJitSubdirectoryMemory(targetPath: string, trustedRoots: string[], alreadyLoadedPaths: Set<string>, alreadyLoadedIdentities?: Set<string>, boundaryMarkers?: readonly string[]): Promise<MemoryLoadResult>;
