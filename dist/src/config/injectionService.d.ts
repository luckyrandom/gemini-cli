/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export type InjectionSource = 'user_steering' | 'background_completion';
/**
 * Typed listener that receives both the injection text and its source.
 */
export type InjectionListener = (text: string, source: InjectionSource) => void;
/**
 * Service for managing injections into the model conversation.
 *
 * Multiple sources (user steering, background execution completions, etc.)
 * can feed into this service. Consumers register listeners via
 * {@link onInjection} to receive injections with source information.
 */
export declare class InjectionService {
    private readonly isEnabled;
    private readonly injections;
    private readonly injectionListeners;
    constructor(isEnabled: () => boolean);
    /**
     * Adds an injection from any source.
     *
     * `user_steering` injections are gated on model steering being enabled.
     * Other sources (e.g. `background_completion`) are always accepted.
     */
    addInjection(text: string, source: InjectionSource): void;
    /**
     * Registers a listener for injections from any source.
     */
    onInjection(listener: InjectionListener): void;
    /**
     * Unregisters an injection listener.
     */
    offInjection(listener: InjectionListener): void;
    /**
     * Returns collected injection texts, optionally filtered by source.
     */
    getInjections(source?: InjectionSource): string[];
    /**
     * Returns injection texts added after a specific index, optionally filtered by source.
     */
    getInjectionsAfter(index: number, source?: InjectionSource): string[];
    /**
     * Returns the index of the latest injection.
     */
    getLatestInjectionIndex(): number;
    /**
     * Clears all collected injections.
     */
    clear(): void;
}
