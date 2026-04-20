/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Normalizes a file path to be relative to the project root and formatted for the 'ignore' library.
 *
 * @returns The normalized relative path, or null if the path is invalid or outside the root.
 */
export declare function getNormalizedRelativePath(projectRoot: string, filePath: string, isDirectory: boolean): string | null;
