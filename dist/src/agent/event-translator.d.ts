/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Pure, stateless-per-call translation functions that convert
 * ServerGeminiStreamEvent objects into AgentEvent objects.
 *
 * No side effects, no generators. Each call to `translateEvent` takes an event
 * and mutable TranslationState, returning zero or more AgentEvents.
 */
import type { FinishReason } from '@google/genai';
import type { ServerGeminiStreamEvent } from '../core/turn.js';
import type { AgentEvent, StreamEndReason, ErrorData, Usage } from './types.js';
export interface TranslationState {
    streamId: string;
    streamStartEmitted: boolean;
    model: string | undefined;
    eventCounter: number;
    /** Tracks callId → tool name from requests so responses can reference the name. */
    pendingToolNames: Map<string, string>;
}
export declare function createTranslationState(streamId?: string): TranslationState;
/**
 * Translates a single ServerGeminiStreamEvent into zero or more AgentEvents.
 * Mutates `state` (counter, flags) as a side effect.
 */
export declare function translateEvent(event: ServerGeminiStreamEvent, state: TranslationState): AgentEvent[];
/**
 * Maps a Gemini FinishReason to an AgentEnd reason.
 */
export declare function mapFinishReason(reason: FinishReason | undefined): StreamEndReason;
/**
 * Maps an HTTP status code to a gRPC-style status string.
 */
export declare function mapHttpToGrpcStatus(httpStatus: number | undefined): ErrorData['status'];
/**
 * Maps a StructuredError (or unknown error value) to an ErrorData payload.
 * Preserves selected error metadata in _meta and includes raw structured
 * errors for lossless debugging.
 */
export declare function mapError(error: unknown): ErrorData & {
    _meta?: Record<string, unknown>;
};
/**
 * Maps Gemini usageMetadata to Usage.
 */
export declare function mapUsage(metadata: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    cachedContentTokenCount?: number;
}, model?: string): Usage;
