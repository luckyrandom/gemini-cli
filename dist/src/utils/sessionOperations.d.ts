/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Validates a sessionId and returns a sanitized version.
 * Throws an error if the ID is dangerous (e.g., ".", "..", or empty).
 */
export declare function validateAndSanitizeSessionId(sessionId: string): string;
/**
 * Asynchronously deletes activity logs and tool outputs for a specific session ID.
 */
export declare function deleteSessionArtifactsAsync(sessionId: string, tempDir: string): Promise<void>;
/**
 * Iterates through subagent files in a parent's directory and deletes their artifacts
 * before deleting the directory itself.
 */
export declare function deleteSubagentSessionDirAndArtifactsAsync(parentSessionId: string, chatsDir: string, tempDir: string): Promise<void>;
