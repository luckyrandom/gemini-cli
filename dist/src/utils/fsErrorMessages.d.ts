/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Converts a Node.js filesystem error to a user-friendly message.
 *
 * @param error - The error to convert
 * @param defaultMessage - Optional default message if error cannot be interpreted
 * @returns A user-friendly error message
 */
export declare function getFsErrorMessage(error: unknown, defaultMessage?: string): string;
