/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ContextProcessor, BackstopTargetOptions } from '../pipeline.js';
import type { JSONSchemaType } from 'ajv';
import type { ContextEnvironment } from '../pipeline/environment.js';
export type HistoryTruncationProcessorOptions = BackstopTargetOptions;
export declare const HistoryTruncationProcessorOptionsSchema: JSONSchemaType<HistoryTruncationProcessorOptions>;
export declare function createHistoryTruncationProcessor(id: string, env: ContextEnvironment, options: HistoryTruncationProcessorOptions): ContextProcessor;
