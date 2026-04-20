/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { loadJitSubdirectoryMemory, concatenateInstructions, getGlobalMemoryPaths, getUserProjectMemoryPaths, getExtensionMemoryPaths, getEnvironmentMemoryPaths, readGeminiMdFiles, categorizeAndConcatenate, deduplicatePathsByFileIdentity, } from '../utils/memoryDiscovery.js';
import { coreEvents, CoreEvent } from '../utils/events.js';
export class MemoryContextManager {
    loadedPaths = new Set();
    loadedFileIdentities = new Set();
    config;
    globalMemory = '';
    extensionMemory = '';
    projectMemory = '';
    userProjectMemoryContent = '';
    constructor(config) {
        this.config = config;
    }
    /**
     * Refreshes the memory by reloading global, extension, and project memory.
     */
    async refresh() {
        this.loadedPaths.clear();
        this.loadedFileIdentities.clear();
        const paths = await this.discoverMemoryPaths();
        const contentsMap = await this.loadMemoryContents(paths);
        this.categorizeMemoryContents(paths, contentsMap);
        this.emitMemoryChanged();
    }
    async discoverMemoryPaths() {
        const [global, extension, project, userProjectMemory] = await Promise.all([
            getGlobalMemoryPaths(),
            Promise.resolve(getExtensionMemoryPaths(this.config.getExtensionLoader())),
            this.config.isTrustedFolder()
                ? getEnvironmentMemoryPaths([...this.config.getWorkspaceContext().getDirectories()], this.config.getMemoryBoundaryMarkers())
                : Promise.resolve([]),
            getUserProjectMemoryPaths(this.config.storage.getProjectMemoryDir()),
        ]);
        return { global, extension, project, userProjectMemory };
    }
    async loadMemoryContents(paths) {
        const allPathsStringDeduped = Array.from(new Set([
            ...paths.global,
            ...paths.extension,
            ...paths.project,
            ...paths.userProjectMemory,
        ]));
        // deduplicate by file identity to handle case-insensitive filesystems
        const { paths: allPaths, identityMap: pathIdentityMap } = await deduplicatePathsByFileIdentity(allPathsStringDeduped);
        const allContents = await readGeminiMdFiles(allPaths, this.config.getImportFormat(), this.config.getMemoryBoundaryMarkers());
        const loadedFilePaths = allContents
            .filter((c) => c.content !== null)
            .map((c) => c.filePath);
        this.markAsLoaded(loadedFilePaths);
        // Cache file identities for performance optimization
        for (const filePath of loadedFilePaths) {
            const identity = pathIdentityMap.get(filePath);
            if (identity) {
                this.loadedFileIdentities.add(identity);
            }
        }
        return new Map(allContents.map((c) => [c.filePath, c]));
    }
    categorizeMemoryContents(paths, contentsMap) {
        const hierarchicalMemory = categorizeAndConcatenate(paths, contentsMap);
        this.globalMemory = hierarchicalMemory.global || '';
        this.extensionMemory = hierarchicalMemory.extension || '';
        this.userProjectMemoryContent = hierarchicalMemory.userProjectMemory || '';
        const mcpInstructions = this.config.getMcpClientManager()?.getMcpInstructions() || '';
        const projectMemoryWithMcp = [
            hierarchicalMemory.project,
            mcpInstructions.trimStart(),
        ]
            .filter(Boolean)
            .join('\n\n');
        this.projectMemory = this.config.isTrustedFolder()
            ? projectMemoryWithMcp
            : '';
    }
    /**
     * Discovers and loads context for a specific accessed path (Tier 3 - JIT).
     * Traverses upwards from the accessed path to the project root.
     */
    async discoverContext(accessedPath, trustedRoots) {
        if (!this.config.isTrustedFolder()) {
            return '';
        }
        const result = await loadJitSubdirectoryMemory(accessedPath, trustedRoots, this.loadedPaths, this.loadedFileIdentities, this.config.getMemoryBoundaryMarkers());
        if (result.files.length === 0) {
            return '';
        }
        const newFilePaths = result.files.map((f) => f.path);
        this.markAsLoaded(newFilePaths);
        // Cache identities for newly loaded files
        if (result.fileIdentities) {
            for (const identity of result.fileIdentities) {
                this.loadedFileIdentities.add(identity);
            }
        }
        return concatenateInstructions(result.files.map((f) => ({ filePath: f.path, content: f.content })));
    }
    emitMemoryChanged() {
        coreEvents.emit(CoreEvent.MemoryChanged, {
            fileCount: this.loadedPaths.size,
        });
    }
    getGlobalMemory() {
        return this.globalMemory;
    }
    getExtensionMemory() {
        return this.extensionMemory;
    }
    getEnvironmentMemory() {
        return this.projectMemory;
    }
    getUserProjectMemory() {
        return this.userProjectMemoryContent;
    }
    markAsLoaded(paths) {
        paths.forEach((p) => this.loadedPaths.add(p));
    }
    getLoadedPaths() {
        return this.loadedPaths;
    }
}
//# sourceMappingURL=memoryContextManager.js.map