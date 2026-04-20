/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export class AgentChatHistory {
    history;
    listeners = new Set();
    constructor(initialHistory = []) {
        this.history = [...initialHistory];
    }
    subscribe(listener) {
        this.listeners.add(listener);
        // Emit initial state to new subscriber
        listener({ type: 'SYNC_FULL', payload: this.history });
        return () => this.listeners.delete(listener);
    }
    notify(type, payload) {
        const event = { type, payload };
        for (const listener of this.listeners) {
            listener(event);
        }
    }
    push(content) {
        this.history.push(content);
        this.notify('PUSH', [content]);
    }
    set(history) {
        this.history = [...history];
        this.notify('SYNC_FULL', this.history);
    }
    clear() {
        this.history = [];
        this.notify('CLEAR', []);
    }
    get() {
        return this.history;
    }
    map(callback) {
        this.history = this.history.map(callback);
        this.notify('SYNC_FULL', this.history);
    }
    flatMap(callback) {
        return this.history.flatMap(callback);
    }
    get length() {
        return this.history.length;
    }
}
//# sourceMappingURL=agentChatHistory.js.map