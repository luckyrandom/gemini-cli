/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Content } from '@google/genai';
export type HistoryEventType = 'PUSH' | 'SYNC_FULL' | 'CLEAR';
export interface HistoryEvent {
    type: HistoryEventType;
    payload: readonly Content[];
}
export type HistoryListener = (event: HistoryEvent) => void;
export declare class AgentChatHistory {
    private history;
    private listeners;
    constructor(initialHistory?: Content[]);
    subscribe(listener: HistoryListener): () => void;
    private notify;
    push(content: Content): void;
    set(history: readonly Content[]): void;
    clear(): void;
    get(): readonly Content[];
    map(callback: (value: Content, index: number, array: Content[]) => Content): void;
    flatMap<U>(callback: (value: Content, index: number, array: Content[]) => U | readonly U[]): U[];
    get length(): number;
}
