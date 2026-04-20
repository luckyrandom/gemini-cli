/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type ResolvedSandboxPaths } from '../../services/sandboxManager.js';
/**
 * Options for building macOS Seatbelt profile.
 */
export interface SeatbeltArgsOptions {
    /** Fully resolved paths for the sandbox execution. */
    resolvedPaths: ResolvedSandboxPaths;
    /** Whether to allow network access. */
    networkAccess?: boolean;
    /** Whether to allow write access to the workspace. */
    workspaceWrite?: boolean;
}
/**
 * Escapes a string for use within a Scheme string literal "..."
 */
export declare function escapeSchemeString(str: string): string;
/**
 * Builds a complete macOS Seatbelt profile string using a strict allowlist.
 * It embeds paths directly into the profile, properly escaped for Scheme.
 */
export declare function buildSeatbeltProfile(options: SeatbeltArgsOptions): string;
