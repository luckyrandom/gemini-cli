/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Supersedes stale `take_snapshot` outputs in the browser
 * subagent's conversation history. Each snapshot contains the full
 * accessibility tree and is only meaningful as the "current" page state;
 * prior snapshots are stale and waste context-window tokens.
 *
 * Called via the {@link LocalAgentDefinition.onBeforeTurn} hook before each
 * model call so the model only ever sees the most recent snapshot in full.
 */
import type { GeminiChat } from '../../core/geminiChat.js';
/**
 * Placeholder that replaces superseded snapshot outputs.
 * Kept short to minimise token cost while still being informative.
 */
export declare const SNAPSHOT_SUPERSEDED_PLACEHOLDER: string;
/**
 * Scans the chat history and replaces all but the most recent
 * `take_snapshot` `functionResponse` with a compact placeholder.
 *
 * No-ops when:
 * - There are fewer than 2 snapshots (nothing to supersede).
 * - All prior snapshots have already been superseded.
 *
 * Uses {@link GeminiChat.setHistory} to apply the modified history.
 */
export declare function supersedeStaleSnapshots(chat: GeminiChat): void;
