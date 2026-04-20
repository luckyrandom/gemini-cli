/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import process from 'node:process';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { recordEventLoopDelay, isPerformanceMonitoringActive, } from './metrics.js';
export class EventLoopMonitor {
    eventLoopHistogram = null;
    intervalId = null;
    isRunning = false;
    start(config, intervalMs = 10000) {
        const isEnabled = process.env['GEMINI_EVENT_LOOP_MONITOR_ENABLED'] === 'true';
        if (!isEnabled || !isPerformanceMonitoringActive() || this.isRunning) {
            return;
        }
        this.isRunning = true;
        this.eventLoopHistogram = monitorEventLoopDelay({ resolution: 10 });
        this.eventLoopHistogram.enable();
        this.intervalId = setInterval(() => {
            this.takeSnapshot(config);
        }, intervalMs).unref();
    }
    stop() {
        if (!this.isRunning) {
            return;
        }
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.eventLoopHistogram) {
            this.eventLoopHistogram.disable();
            this.eventLoopHistogram = null;
        }
        this.isRunning = false;
    }
    takeSnapshot(config) {
        if (!this.eventLoopHistogram) {
            return;
        }
        const p50 = this.eventLoopHistogram.percentile(50) / 1e6;
        const p95 = this.eventLoopHistogram.percentile(95) / 1e6;
        const max = this.eventLoopHistogram.max / 1e6;
        recordEventLoopDelay(config, p50, {
            percentile: 'p50',
            component: 'event_loop_monitor',
        });
        recordEventLoopDelay(config, p95, {
            percentile: 'p95',
            component: 'event_loop_monitor',
        });
        recordEventLoopDelay(config, max, {
            percentile: 'max',
            component: 'event_loop_monitor',
        });
    }
}
let globalEventLoopMonitor = null;
export function startGlobalEventLoopMonitoring(config, intervalMs) {
    if (!globalEventLoopMonitor) {
        globalEventLoopMonitor = new EventLoopMonitor();
    }
    globalEventLoopMonitor.start(config, intervalMs);
}
export function stopGlobalEventLoopMonitoring() {
    if (globalEventLoopMonitor) {
        globalEventLoopMonitor.stop();
        globalEventLoopMonitor = null;
    }
}
export function getEventLoopMonitor() {
    return globalEventLoopMonitor;
}
//# sourceMappingURL=event-loop-monitor.js.map