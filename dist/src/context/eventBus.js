/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { EventEmitter } from 'node:events';
export class ContextEventBus extends EventEmitter {
    emitPristineHistoryUpdated(event) {
        this.emit('PRISTINE_HISTORY_UPDATED', event);
    }
    onPristineHistoryUpdated(listener) {
        this.on('PRISTINE_HISTORY_UPDATED', listener);
    }
    emitChunkReceived(event) {
        this.emit('IR_CHUNK_RECEIVED', event);
    }
    onChunkReceived(listener) {
        this.on('IR_CHUNK_RECEIVED', listener);
    }
    emitConsolidationNeeded(event) {
        this.emit('BUDGET_RETAINED_CROSSED', event);
    }
    onConsolidationNeeded(listener) {
        this.on('BUDGET_RETAINED_CROSSED', listener);
    }
}
//# sourceMappingURL=eventBus.js.map