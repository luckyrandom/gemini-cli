/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Automation overlay utilities for visual indication during browser automation.
 *
 * Provides functions to inject and remove a pulsating blue border overlay
 * that indicates when the browser is under AI agent control.
 *
 * Uses the Web Animations API instead of injected <style> tags so the
 * animation works on sites with strict Content Security Policies (e.g. google.com).
 *
 * The script strings are passed to chrome-devtools-mcp's evaluate_script tool
 * which expects a plain function expression (NOT an IIFE).
 */
import type { BrowserManager } from './browserManager.js';
/**
 * Injects the automation overlay into the current page.
 */
export declare function injectAutomationOverlay(browserManager: BrowserManager, signal?: AbortSignal): Promise<void>;
/**
 * Removes the automation overlay from the current page.
 */
export declare function removeAutomationOverlay(browserManager: BrowserManager, signal?: AbortSignal): Promise<void>;
