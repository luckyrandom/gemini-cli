/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { IPty } from '@lydell/node-pty';
import { type EnvironmentSanitizationConfig } from './environmentSanitization.js';
import { type SandboxManager, type SandboxPermissions } from './sandboxManager.js';
import type { SandboxConfig } from '../config/config.js';
import { type ExecutionHandle, type ExecutionOutputEvent, type ExecutionResult } from './executionLifecycleService.js';
/**
 * An environment variable that is set for shell executions. This can be used
 * by downstream executables and scripts to identify that they were executed
 * from within Gemini CLI.
 */
export declare const GEMINI_CLI_IDENTIFICATION_ENV_VAR = "GEMINI_CLI";
/**
 * The value of {@link GEMINI_CLI_IDENTIFICATION_ENV_VAR}
 */
export declare const GEMINI_CLI_IDENTIFICATION_ENV_VAR_VALUE = "1";
export declare const SCROLLBACK_LIMIT = 300000;
/** A structured result from a shell command execution. */
export type ShellExecutionResult = ExecutionResult;
/** A handle for an ongoing shell execution. */
export type ShellExecutionHandle = ExecutionHandle;
export interface ShellExecutionConfig {
    additionalPermissions?: SandboxPermissions;
    terminalWidth?: number;
    terminalHeight?: number;
    pager?: string;
    showColor?: boolean;
    defaultFg?: string;
    defaultBg?: string;
    sanitizationConfig: EnvironmentSanitizationConfig;
    sandboxManager: SandboxManager;
    disableDynamicLineTrimming?: boolean;
    scrollback?: number;
    maxSerializedLines?: number;
    sandboxConfig?: SandboxConfig;
    backgroundCompletionBehavior?: 'inject' | 'notify' | 'silent';
    originalCommand?: string;
    sessionId?: string;
}
/**
 * Describes a structured event emitted during shell command execution.
 */
export type ShellOutputEvent = ExecutionOutputEvent;
export type DestroyablePty = IPty & {
    destroy?: () => void;
};
/**
 * A centralized service for executing shell commands with robust process
 * management, cross-platform compatibility, and streaming output capabilities.
 *
 */
export type BackgroundProcess = {
    pid: number;
    command: string;
    status: 'running' | 'exited';
    exitCode?: number | null;
    signal?: number | null;
};
export type BackgroundProcessRecord = Omit<BackgroundProcess, 'pid'> & {
    startTime: number;
    endTime?: number;
};
export declare class ShellExecutionService {
    private static activePtys;
    private static activeChildProcesses;
    private static backgroundLogPids;
    private static backgroundLogStreams;
    private static backgroundProcessHistory;
    static getLogDir(): string;
    private static formatShellBackgroundCompletion;
    static getLogFilePath(pid: number): string;
    private static syncBackgroundLog;
    private static cleanupLogStream;
    /**
     * Executes a shell command using `node-pty`, capturing all output and lifecycle events.
     *
     * @param commandToExecute The exact command string to run.
     * @param cwd The working directory to execute the command in.
     * @param onOutputEvent A callback for streaming structured events about the execution, including data chunks and status updates.
     * @param abortSignal An AbortSignal to terminate the process and its children.
     * @returns An object containing the process ID (pid) and a promise that
     *          resolves with the complete execution result.
     */
    static execute(commandToExecute: string, cwd: string, onOutputEvent: (event: ShellOutputEvent) => void, abortSignal: AbortSignal, shouldUseNodePty: boolean, shellExecutionConfig: ShellExecutionConfig): Promise<ShellExecutionHandle>;
    private static appendAndTruncate;
    private static prepareExecution;
    private static childProcessFallback;
    /**
     * Destroys a PTY process to release its file descriptors.
     * This is critical to prevent system-wide PTY exhaustion (see #15945).
     */
    private static destroyPtyProcess;
    /**
     * Cleans up all resources associated with a PTY entry:
     * the PTY process (file descriptors) and the headless terminal (memory buffers).
     */
    private static cleanupPtyEntry;
    private static executeWithPty;
    /**
     * Writes a string to the pseudo-terminal (PTY) of a running process.
     *
     * @param pid The process ID of the target PTY.
     * @param input The string to write to the terminal.
     */
    static writeToPty(pid: number, input: string): void;
    static isPtyActive(pid: number): boolean;
    /**
     * Registers a callback to be invoked when the process with the given PID exits.
     * This attaches directly to the PTY's exit event.
     *
     * @param pid The process ID to watch.
     * @param callback The function to call on exit.
     * @returns An unsubscribe function.
     */
    static onExit(pid: number, callback: (exitCode: number, signal?: number) => void): () => void;
    /**
     * Kills a process by its PID.
     *
     * @param pid The process ID to kill.
     */
    static kill(pid: number): Promise<void>;
    /**
     * Moves a running shell command to the background.
     * This resolves the execution promise but keeps the PTY active.
     *
     * @param pid The process ID of the target PTY.
     */
    static background(pid: number, sessionId?: string, command?: string): void;
    static subscribe(pid: number, listener: (event: ShellOutputEvent) => void): () => void;
    /**
     * Resizes the pseudo-terminal (PTY) of a running process.
     *
     * @param pid The process ID of the target PTY.
     * @param cols The new number of columns.
     * @param rows The new number of rows.
     */
    static resizePty(pid: number, cols: number, rows: number): void;
    /**
     * Scrolls the pseudo-terminal (PTY) of a running process.
     *
     * @param pid The process ID of the target PTY.
     * @param lines The number of lines to scroll.
     */
    static scrollPty(pid: number, lines: number): void;
    static listBackgroundProcesses(sessionId: string): BackgroundProcess[];
    /**
     * Resets the internal state of the ShellExecutionService.
     * This is intended for use in tests to ensure isolation.
     */
    static resetForTest(): void;
}
