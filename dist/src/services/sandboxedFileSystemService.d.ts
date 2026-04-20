/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type FileSystemService } from './fileSystemService.js';
import { type SandboxManager } from './sandboxManager.js';
/**
 * A FileSystemService implementation that performs operations through a sandbox.
 */
export declare class SandboxedFileSystemService implements FileSystemService {
    private sandboxManager;
    private cwd;
    constructor(sandboxManager: SandboxManager, cwd: string);
    private sanitizeAndValidatePath;
    readTextFile(filePath: string): Promise<string>;
    writeTextFile(filePath: string, content: string): Promise<void>;
}
