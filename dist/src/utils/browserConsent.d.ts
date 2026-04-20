/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Ensures the user has acknowledged the browser agent privacy notice.
 *
 * On first invocation (per profile), an interactive consent dialog is shown
 * describing chrome-devtools-mcp's data collection and the fact that browser
 * content is exposed to the AI model. A sentinel file is written to the
 * browser profile directory once the user accepts.
 *
 * @returns `true` if consent was already given or the user accepted,
 *          `false` if the user declined.
 */
export declare function getBrowserConsentIfNeeded(): Promise<boolean>;
