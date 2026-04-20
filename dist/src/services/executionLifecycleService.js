/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { debugLogger } from '../utils/debugLogger.js';
import { sanitizeOutput } from '../utils/textUtils.js';
const NON_PROCESS_EXECUTION_ID_START = 2_000_000_000;
/**
 * Central owner for execution backgrounding lifecycle across shell and tools.
 */
export class ExecutionLifecycleService {
    static EXIT_INFO_TTL_MS = 5 * 60 * 1000;
    static nextExecutionId = NON_PROCESS_EXECUTION_ID_START;
    static injectionService = null;
    /**
     * Connects the lifecycle service to the injection service so that
     * backgrounded executions are reinjected into the model conversation
     * directly from the backend — no UI hop needed.
     */
    static setInjectionService(service) {
        this.injectionService = service;
    }
    static activeExecutions = new Map();
    static activeResolvers = new Map();
    static activeListeners = new Map();
    static exitedExecutionInfo = new Map();
    static backgroundCompletionListeners = new Set();
    static backgroundStartListeners = new Set();
    /**
     * Registers a listener that fires when any execution is moved to the background.
     * This is the hook for the UI to automatically discover backgrounded executions.
     */
    static onBackground(listener) {
        this.backgroundStartListeners.add(listener);
    }
    /**
     * Unregisters a background start listener.
     */
    static offBackground(listener) {
        this.backgroundStartListeners.delete(listener);
    }
    /**
     * Registers a listener that fires when a previously-backgrounded
     * execution settles (completes or errors).
     */
    static onBackgroundComplete(listener) {
        this.backgroundCompletionListeners.add(listener);
    }
    /**
     * Unregisters a background completion listener.
     */
    static offBackgroundComplete(listener) {
        this.backgroundCompletionListeners.delete(listener);
    }
    static storeExitInfo(executionId, exitCode, signal) {
        this.exitedExecutionInfo.set(executionId, {
            exitCode,
            signal,
        });
        setTimeout(() => {
            this.exitedExecutionInfo.delete(executionId);
        }, this.EXIT_INFO_TTL_MS).unref();
    }
    static allocateExecutionId() {
        let executionId = ++this.nextExecutionId;
        while (this.activeExecutions.has(executionId)) {
            executionId = ++this.nextExecutionId;
        }
        return executionId;
    }
    static createPendingResult(executionId) {
        return new Promise((resolve) => {
            this.activeResolvers.set(executionId, resolve);
        });
    }
    static createAbortedResult(executionId, execution) {
        const output = execution.getBackgroundOutput?.() ?? execution.output;
        return {
            rawOutput: Buffer.from(output, 'utf8'),
            output,
            exitCode: 130,
            signal: null,
            error: new Error('Operation cancelled by user.'),
            aborted: true,
            pid: executionId,
            executionMethod: execution.executionMethod,
        };
    }
    /**
     * Resets lifecycle state for isolated unit tests.
     */
    static resetForTest() {
        this.activeExecutions.clear();
        this.activeResolvers.clear();
        this.activeListeners.clear();
        this.exitedExecutionInfo.clear();
        this.backgroundCompletionListeners.clear();
        this.injectionService = null;
        this.backgroundStartListeners.clear();
        this.nextExecutionId = NON_PROCESS_EXECUTION_ID_START;
    }
    static attachExecution(executionId, registration) {
        if (this.activeExecutions.has(executionId) ||
            this.activeResolvers.has(executionId)) {
            throw new Error(`Execution ${executionId} is already attached.`);
        }
        this.exitedExecutionInfo.delete(executionId);
        this.activeExecutions.set(executionId, {
            executionMethod: registration.executionMethod,
            label: registration.label,
            output: registration.initialOutput ?? '',
            kind: 'external',
            getBackgroundOutput: registration.getBackgroundOutput,
            getSubscriptionSnapshot: registration.getSubscriptionSnapshot,
            writeInput: registration.writeInput,
            kill: registration.kill,
            isActive: registration.isActive,
            formatInjection: registration.formatInjection,
            completionBehavior: registration.completionBehavior,
        });
        return {
            pid: executionId,
            result: this.createPendingResult(executionId),
        };
    }
    static createExecution(initialOutput = '', onKill, executionMethod = 'none', formatInjection, label, completionBehavior) {
        const executionId = this.allocateExecutionId();
        this.activeExecutions.set(executionId, {
            executionMethod,
            label,
            output: initialOutput,
            kind: 'virtual',
            onKill,
            formatInjection,
            completionBehavior,
            getBackgroundOutput: () => {
                const state = this.activeExecutions.get(executionId);
                return state?.output ?? initialOutput;
            },
            getSubscriptionSnapshot: () => {
                const state = this.activeExecutions.get(executionId);
                return state?.output ?? initialOutput;
            },
        });
        return {
            pid: executionId,
            result: this.createPendingResult(executionId),
        };
    }
    static appendOutput(executionId, chunk) {
        const execution = this.activeExecutions.get(executionId);
        if (!execution || chunk.length === 0) {
            return;
        }
        execution.output += chunk;
        this.emitEvent(executionId, { type: 'data', chunk });
    }
    static emitEvent(executionId, event) {
        const listeners = this.activeListeners.get(executionId);
        if (listeners) {
            listeners.forEach((listener) => listener(event));
        }
    }
    static resolvePending(executionId, result) {
        const resolve = this.activeResolvers.get(executionId);
        if (!resolve) {
            return;
        }
        resolve(result);
        this.activeResolvers.delete(executionId);
    }
    static settleExecution(executionId, result) {
        const execution = this.activeExecutions.get(executionId);
        if (!execution) {
            return;
        }
        // Fire background completion listeners if this was a backgrounded execution.
        if (execution.backgrounded && !result.aborted) {
            const behavior = execution.completionBehavior ??
                (execution.formatInjection ? 'inject' : 'silent');
            const rawInjection = behavior !== 'silent' && execution.formatInjection
                ? execution.formatInjection(result.output, result.error)
                : null;
            const injectionText = rawInjection ? sanitizeOutput(rawInjection) : null;
            // Inject directly into the model conversation from the backend.
            if (injectionText && this.injectionService) {
                this.injectionService.addInjection(injectionText, 'background_completion');
            }
            const info = {
                executionId,
                executionMethod: execution.executionMethod,
                output: result.output,
                error: result.error,
                injectionText,
                completionBehavior: behavior,
            };
            for (const listener of this.backgroundCompletionListeners) {
                try {
                    listener(info);
                }
                catch (error) {
                    debugLogger.warn(`Background completion listener failed: ${error}`);
                }
            }
        }
        this.resolvePending(executionId, result);
        this.emitEvent(executionId, {
            type: 'exit',
            exitCode: result.exitCode,
            signal: result.signal,
        });
        this.activeListeners.delete(executionId);
        this.activeExecutions.delete(executionId);
        this.storeExitInfo(executionId, result.exitCode ?? 0, result.signal ?? undefined);
    }
    static completeExecution(executionId, options) {
        const execution = this.activeExecutions.get(executionId);
        if (!execution) {
            return;
        }
        const { error = null, aborted = false, exitCode = error ? 1 : 0, signal = null, } = options ?? {};
        const output = execution.getBackgroundOutput?.() ?? execution.output;
        const snapshot = execution.getSubscriptionSnapshot?.();
        const ansiOutput = Array.isArray(snapshot) ? snapshot : undefined;
        this.settleExecution(executionId, {
            rawOutput: Buffer.from(output, 'utf8'),
            output,
            ansiOutput,
            exitCode,
            signal,
            error,
            aborted,
            pid: executionId,
            executionMethod: execution.executionMethod,
        });
    }
    static completeWithResult(executionId, result) {
        this.settleExecution(executionId, result);
    }
    static background(executionId) {
        const resolve = this.activeResolvers.get(executionId);
        if (!resolve) {
            return;
        }
        const execution = this.activeExecutions.get(executionId);
        if (!execution) {
            return;
        }
        const output = execution.getBackgroundOutput?.() ?? execution.output;
        resolve({
            rawOutput: Buffer.from(''),
            output,
            exitCode: null,
            signal: null,
            error: null,
            aborted: false,
            pid: executionId,
            executionMethod: execution.executionMethod,
            backgrounded: true,
        });
        this.activeResolvers.delete(executionId);
        execution.backgrounded = true;
        // Notify listeners that an execution was moved to the background.
        const info = {
            executionId,
            executionMethod: execution.executionMethod,
            label: execution.label ?? `${execution.executionMethod} (ID: ${executionId})`,
            output,
            completionBehavior: execution.completionBehavior ??
                (execution.formatInjection ? 'inject' : 'silent'),
        };
        for (const listener of this.backgroundStartListeners) {
            listener(info);
        }
    }
    static subscribe(executionId, listener) {
        if (!this.activeListeners.has(executionId)) {
            this.activeListeners.set(executionId, new Set());
        }
        this.activeListeners.get(executionId)?.add(listener);
        const execution = this.activeExecutions.get(executionId);
        if (execution) {
            const snapshot = execution.getSubscriptionSnapshot?.() ??
                (execution.output.length > 0 ? execution.output : undefined);
            if (snapshot && (typeof snapshot !== 'string' || snapshot.length > 0)) {
                listener({ type: 'data', chunk: snapshot });
            }
        }
        return () => {
            this.activeListeners.get(executionId)?.delete(listener);
            if (this.activeListeners.get(executionId)?.size === 0) {
                this.activeListeners.delete(executionId);
            }
        };
    }
    static onExit(executionId, callback) {
        if (this.activeExecutions.has(executionId)) {
            const listener = (event) => {
                if (event.type === 'exit') {
                    callback(event.exitCode ?? 0, event.signal ?? undefined);
                    unsubscribe();
                }
            };
            const unsubscribe = this.subscribe(executionId, listener);
            return unsubscribe;
        }
        const exitedInfo = this.exitedExecutionInfo.get(executionId);
        if (exitedInfo) {
            callback(exitedInfo.exitCode, exitedInfo.signal);
        }
        return () => { };
    }
    static kill(executionId) {
        const execution = this.activeExecutions.get(executionId);
        if (!execution) {
            return;
        }
        if (execution.kind === 'virtual') {
            execution.onKill?.();
        }
        if (execution.kind === 'external') {
            execution.kill?.();
        }
        this.completeWithResult(executionId, this.createAbortedResult(executionId, execution));
    }
    static isActive(executionId) {
        const execution = this.activeExecutions.get(executionId);
        if (!execution) {
            if (executionId >= NON_PROCESS_EXECUTION_ID_START) {
                return false;
            }
            try {
                return process.kill(executionId, 0);
            }
            catch {
                return false;
            }
        }
        if (execution.kind === 'virtual') {
            return true;
        }
        if (execution.kind === 'external' && execution.isActive) {
            try {
                return execution.isActive();
            }
            catch {
                return false;
            }
        }
        try {
            return process.kill(executionId, 0);
        }
        catch {
            return false;
        }
    }
    static writeInput(executionId, input) {
        const execution = this.activeExecutions.get(executionId);
        if (execution?.kind === 'external') {
            execution.writeInput?.(input);
        }
    }
}
//# sourceMappingURL=executionLifecycleService.js.map