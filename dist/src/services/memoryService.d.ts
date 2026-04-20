/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
/**
 * Metadata for a single extraction run.
 */
export interface ExtractionRun {
    runAt: string;
    sessionIds: string[];
    skillsCreated: string[];
}
/**
 * Tracks extraction history with per-run metadata.
 */
export interface ExtractionState {
    runs: ExtractionRun[];
}
/**
 * Returns all session IDs that have been processed across all runs.
 */
export declare function getProcessedSessionIds(state: ExtractionState): Set<string>;
/**
 * Attempts to acquire an exclusive lock file using O_CREAT | O_EXCL.
 * Returns true if the lock was acquired, false if another instance owns it.
 */
export declare function tryAcquireLock(lockPath: string, retries?: number): Promise<boolean>;
/**
 * Checks if a lock file is stale (owner PID is dead or lock is too old).
 */
export declare function isLockStale(lockPath: string): Promise<boolean>;
/**
 * Releases the lock file.
 */
export declare function releaseLock(lockPath: string): Promise<void>;
/**
 * Reads the extraction state file, or returns a default state.
 */
export declare function readExtractionState(statePath: string): Promise<ExtractionState>;
/**
 * Writes the extraction state atomically (temp file + rename).
 */
export declare function writeExtractionState(statePath: string, state: ExtractionState): Promise<void>;
/**
 * Builds a session index for the extraction agent: a compact listing of all
 * eligible sessions with their summary, file path, and new/previously-processed status.
 * The agent can use read_file on paths to inspect sessions that look promising.
 *
 * Returns the index text and the list of new (unprocessed) session IDs.
 */
export declare function buildSessionIndex(chatsDir: string, state: ExtractionState): Promise<{
    sessionIndex: string;
    newSessionIds: string[];
}>;
/**
 * Validates all .patch files in the skills directory using the `diff` library.
 * Parses each patch, reads the target file(s), and attempts a dry-run apply.
 * Removes patches that fail validation. Returns the filenames of valid patches.
 */
export declare function validatePatches(skillsDir: string, config: Config): Promise<string[]>;
/**
 * Main entry point for the skill extraction background task.
 * Designed to be called fire-and-forget on session startup.
 *
 * Coordinates across multiple CLI instances via a lock file,
 * scans past sessions for reusable patterns, and runs a sub-agent
 * to extract and write SKILL.md files.
 */
export declare function startMemoryService(config: Config): Promise<void>;
