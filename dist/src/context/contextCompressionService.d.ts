/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type Config } from '../config/config.js';
import type { Content } from '@google/genai';
export type FileLevel = 'FULL' | 'PARTIAL' | 'SUMMARY' | 'EXCLUDED';
export interface FileRecord {
    level: FileLevel;
    cachedSummary?: string;
    contentHash?: string;
    startLine?: number;
    endLine?: number;
}
export declare class ContextCompressionService {
    private config;
    private state;
    private stateFilePath;
    constructor(config: Config);
    loadState(): Promise<void>;
    getState(): Record<string, FileRecord>;
    setState(stateData: Record<string, FileRecord>): void;
    saveState(): Promise<void>;
    compressHistory(history: Content[], userPrompt: string, abortSignal?: AbortSignal): Promise<Content[]>;
    private applyCompressionDecision;
    getFileState(filepath: string): FileRecord | undefined;
    private batchQueryModel;
    private generateSummary;
}
