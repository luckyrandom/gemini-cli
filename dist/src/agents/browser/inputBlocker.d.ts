/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Input blocker utility for browser agent.
 *
 * Injects a transparent overlay that captures all user input events
 * and displays an informational banner during automation.
 *
 * The overlay is PERSISTENT — it stays in the DOM for the entire
 * browser agent session.  To allow CDP tool calls to interact with
 * page elements, we temporarily set `pointer-events: none` on the
 * overlay (via {@link suspendInputBlocker}) which makes it invisible
 * to hit-testing / interactability checks without any DOM mutation
 * or visual change.  After the tool call, {@link resumeInputBlocker}
 * restores `pointer-events: auto`.
 *
 * IMPORTANT: chrome-devtools-mcp's evaluate_script tool expects:
 *   { function: "() => { ... }" }
 * It takes a function declaration string, NOT raw code.
 * The parameter name is "function", not "code" or "expression".
 */
import type { BrowserManager } from './browserManager.js';
/**
 * Injects the input blocker overlay into the current page.
 *
 * @param browserManager The browser manager to use for script execution
 * @returns Promise that resolves when the blocker is injected
 */
export declare function injectInputBlocker(browserManager: BrowserManager, signal?: AbortSignal): Promise<void>;
/**
 * Removes the input blocker overlay from the current page entirely.
 * Used only during final cleanup.
 *
 * @param browserManager The browser manager to use for script execution
 * @returns Promise that resolves when the blocker is removed
 */
export declare function removeInputBlocker(browserManager: BrowserManager, signal?: AbortSignal): Promise<void>;
/**
 * Temporarily suspends the input blocker so CDP tool calls can
 * interact with page elements.  The overlay stays in the DOM
 * (no visual change) — only pointer-events is toggled.
 */
export declare function suspendInputBlocker(browserManager: BrowserManager, signal?: AbortSignal): Promise<void>;
/**
 * Resumes the input blocker after a tool call completes.
 * Restores pointer-events so user clicks are blocked again.
 */
export declare function resumeInputBlocker(browserManager: BrowserManager, signal?: AbortSignal): Promise<void>;
