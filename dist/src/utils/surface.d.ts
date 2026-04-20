/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/** Default surface value when no IDE/environment is detected. */
export declare const SURFACE_NOT_SET = "terminal";
/**
 * Determines the surface/distribution channel the CLI is running in.
 *
 * Priority:
 * 1. `GEMINI_CLI_SURFACE` env var (first-class override for enterprise customers)
 * 2. `SURFACE` env var (legacy override, kept for backward compatibility)
 * 3. Auto-detection via environment variables (Cloud Shell, GitHub Actions, IDE, etc.)
 *
 * @returns A human-readable surface identifier (e.g., "vscode", "cursor", "terminal").
 */
export declare function determineSurface(): string;
