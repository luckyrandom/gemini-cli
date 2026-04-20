/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type SandboxRequest } from '../../services/sandboxManager.js';
export declare function isStrictlyApproved(req: SandboxRequest, approvedTools?: string[]): Promise<boolean>;
export declare function getCommandName(req: SandboxRequest): Promise<string>;
export declare function verifySandboxOverrides(allowOverrides: boolean, policy: SandboxRequest['policy']): void;
