/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { AsyncPipelineDef, ContextManagementConfig, PipelineDef } from './types.js';
import type { ContextEnvironment } from '../pipeline/environment.js';
export interface ContextProfile {
    config: ContextManagementConfig;
    buildPipelines: (env: ContextEnvironment, config?: ContextManagementConfig) => PipelineDef[];
    buildAsyncPipelines: (env: ContextEnvironment, config?: ContextManagementConfig) => AsyncPipelineDef[];
}
/**
 * The standard default context management profile.
 * Optimized for safety, precision, and reliable summarization.
 */
export declare const defaultContextProfile: ContextProfile;
