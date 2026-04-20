/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface ContextTracerOptions {
    enabled?: boolean;
    targetDir: string;
    sessionId: string;
}
export declare class ContextTracer {
    private traceDir;
    private assetsDir;
    private enabled;
    private readonly MAX_INLINE_SIZE;
    constructor(options: ContextTracerOptions);
    logEvent(component: string, action: string, details?: Record<string, unknown>): void;
    private saveAsset;
}
