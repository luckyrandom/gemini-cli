/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { InjectionService } from '../config/injectionService.js';
import type { AnsiOutput } from '../utils/terminalSerializer.js';
export type ExecutionMethod = 'lydell-node-pty' | 'node-pty' | 'child_process' | 'remote_agent' | 'none';
export interface ExecutionResult {
    rawOutput?: Buffer;
    output: string;
    ansiOutput?: AnsiOutput;
    exitCode: number | null;
    signal: number | null;
    error: Error | null;
    aborted: boolean;
    pid: number | undefined;
    executionMethod: ExecutionMethod;
    backgrounded?: boolean;
}
export interface ExecutionHandle {
    pid: number | undefined;
    result: Promise<ExecutionResult>;
}
export type ExecutionOutputEvent = {
    type: 'data';
    chunk: string | AnsiOutput;
} | {
    type: 'binary_detected';
} | {
    type: 'binary_progress';
    bytesReceived: number;
} | {
    type: 'exit';
    exitCode: number | null;
    signal: number | null;
};
export interface ExecutionCompletionOptions {
    exitCode?: number | null;
    signal?: number | null;
    error?: Error | null;
    aborted?: boolean;
}
export interface ExternalExecutionRegistration {
    executionMethod: ExecutionMethod;
    /** Human-readable label for the background task UI (e.g. the command string). */
    label?: string;
    initialOutput?: string;
    getBackgroundOutput?: () => string;
    getSubscriptionSnapshot?: () => string | AnsiOutput | undefined;
    writeInput?: (input: string) => void;
    kill?: () => void;
    isActive?: () => boolean;
    formatInjection?: FormatInjectionFn;
    completionBehavior?: CompletionBehavior;
}
/**
 * Callback that an execution creator provides to control how its output
 * is formatted when reinjected into the model conversation after backgrounding.
 * Return `null` to skip injection entirely.
 */
export type FormatInjectionFn = (output: string, error: Error | null) => string | null;
/**
 * Controls what happens when a backgrounded execution completes:
 * - `'inject'`  — full formatted output is injected into the conversation; task auto-dismisses from UI.
 * - `'notify'`  — a short pointer (e.g. "output saved to /tmp/...") is injected; task auto-dismisses from UI.
 * - `'silent'`  — nothing is injected; task stays in the UI until manually dismissed.
 *
 * The distinction between `inject` and `notify` is semantic for now (both inject + dismiss),
 * but enables the system to treat them differently in the future (e.g. LLM-decided injection).
 */
export type CompletionBehavior = 'inject' | 'notify' | 'silent';
/**
 * Payload emitted when an execution is moved to the background.
 */
export interface BackgroundStartInfo {
    executionId: number;
    executionMethod: ExecutionMethod;
    label: string;
    output: string;
    completionBehavior: CompletionBehavior;
}
export type BackgroundStartListener = (info: BackgroundStartInfo) => void;
/**
 * Payload emitted when a previously-backgrounded execution settles.
 */
export interface BackgroundCompletionInfo {
    executionId: number;
    executionMethod: ExecutionMethod;
    output: string;
    error: Error | null;
    /** Pre-formatted injection text from the execution creator, or `null` if skipped. */
    injectionText: string | null;
    completionBehavior: CompletionBehavior;
}
export type BackgroundCompletionListener = (info: BackgroundCompletionInfo) => void;
/**
 * Central owner for execution backgrounding lifecycle across shell and tools.
 */
export declare class ExecutionLifecycleService {
    private static readonly EXIT_INFO_TTL_MS;
    private static nextExecutionId;
    private static injectionService;
    /**
     * Connects the lifecycle service to the injection service so that
     * backgrounded executions are reinjected into the model conversation
     * directly from the backend — no UI hop needed.
     */
    static setInjectionService(service: InjectionService): void;
    private static activeExecutions;
    private static activeResolvers;
    private static activeListeners;
    private static exitedExecutionInfo;
    private static backgroundCompletionListeners;
    private static backgroundStartListeners;
    /**
     * Registers a listener that fires when any execution is moved to the background.
     * This is the hook for the UI to automatically discover backgrounded executions.
     */
    static onBackground(listener: BackgroundStartListener): void;
    /**
     * Unregisters a background start listener.
     */
    static offBackground(listener: BackgroundStartListener): void;
    /**
     * Registers a listener that fires when a previously-backgrounded
     * execution settles (completes or errors).
     */
    static onBackgroundComplete(listener: BackgroundCompletionListener): void;
    /**
     * Unregisters a background completion listener.
     */
    static offBackgroundComplete(listener: BackgroundCompletionListener): void;
    private static storeExitInfo;
    private static allocateExecutionId;
    private static createPendingResult;
    private static createAbortedResult;
    /**
     * Resets lifecycle state for isolated unit tests.
     */
    static resetForTest(): void;
    static attachExecution(executionId: number, registration: ExternalExecutionRegistration): ExecutionHandle;
    static createExecution(initialOutput?: string, onKill?: () => void, executionMethod?: ExecutionMethod, formatInjection?: FormatInjectionFn, label?: string, completionBehavior?: CompletionBehavior): ExecutionHandle;
    static appendOutput(executionId: number, chunk: string): void;
    static emitEvent(executionId: number, event: ExecutionOutputEvent): void;
    private static resolvePending;
    private static settleExecution;
    static completeExecution(executionId: number, options?: ExecutionCompletionOptions): void;
    static completeWithResult(executionId: number, result: ExecutionResult): void;
    static background(executionId: number): void;
    static subscribe(executionId: number, listener: (event: ExecutionOutputEvent) => void): () => void;
    static onExit(executionId: number, callback: (exitCode: number, signal?: number) => void): () => void;
    static kill(executionId: number): void;
    static isActive(executionId: number): boolean;
    static writeInput(executionId: number, input: string): void;
}
