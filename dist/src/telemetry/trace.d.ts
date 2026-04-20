/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type AttributeValue, type SpanOptions } from '@opentelemetry/api';
import { type GeminiCliOperation } from './constants.js';
/**
 * Registry used to ensure that spans are properly ended when their associated
 * async objects are garbage collected.
 */
export declare const spanRegistry: FinalizationRegistry<() => void>;
/**
 * Truncates a value for inclusion in telemetry attributes.
 *
 * @param value The value to truncate.
 * @param maxLength The maximum length of the stringified value.
 * @returns The truncated value, or undefined if the value type is not supported.
 */
export declare function truncateForTelemetry(value: unknown, maxLength?: number): AttributeValue | undefined;
/**
 * Metadata for a span.
 */
export interface SpanMetadata {
    /** The name of the span. */
    name: string;
    /** The input to the span. */
    input?: unknown;
    /** The output of the span. */
    output?: unknown;
    error?: unknown;
    /** Additional attributes for the span. */
    attributes: Record<string, AttributeValue>;
}
/**
 * Runs a function in a new OpenTelemetry span.
 *
 * The `meta` object will be automatically used to set the span's status and attributes upon completion.
 *
 * @example
 * ```typescript
 * await runInDevTraceSpan(
 *   { operation: GeminiCliOperation.LLMCall, sessionId: 'my-session' },
 *   async ({ metadata }) => {
 *     metadata.input = { foo: 'bar' };
 *     // ... do work ...
 *     metadata.output = { result: 'baz' };
 *     metadata.attributes['my.custom.attribute'] = 'some-value';
 *   }
 * );
 * ```
 *
 * @param opts The options for the span.
 * @param fn The function to run in the span.
 * @returns The result of the function.
 */
export declare function runInDevTraceSpan<R>(opts: SpanOptions & {
    operation: GeminiCliOperation;
    logPrompts?: boolean;
    sessionId: string;
}, fn: ({ metadata }: {
    metadata: SpanMetadata;
}) => Promise<R>): Promise<R>;
