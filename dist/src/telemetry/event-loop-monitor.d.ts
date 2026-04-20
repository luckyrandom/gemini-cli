/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
export declare class EventLoopMonitor {
    private eventLoopHistogram;
    private intervalId;
    private isRunning;
    start(config: Config, intervalMs?: number): void;
    stop(): void;
    private takeSnapshot;
}
export declare function startGlobalEventLoopMonitoring(config: Config, intervalMs?: number): void;
export declare function stopGlobalEventLoopMonitoring(): void;
export declare function getEventLoopMonitor(): EventLoopMonitor | null;
