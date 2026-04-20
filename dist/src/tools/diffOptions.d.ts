/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Diff from 'diff';
import type { DiffStat } from './tools.js';
export declare const DEFAULT_DIFF_OPTIONS: Diff.CreatePatchOptionsNonabortable;
export declare function getDiffStat(fileName: string, oldStr: string, aiStr: string, userStr: string): DiffStat;
/**
 * Extracts line and character stats from a unified diff patch string.
 * This is useful for reconstructing stats for rejected or errored operations
 * where the full strings may no longer be easily accessible.
 */
export declare function getDiffStatFromPatch(patch: string): DiffStat;
