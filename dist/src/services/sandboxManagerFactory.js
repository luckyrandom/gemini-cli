/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import os from 'node:os';
import { NoopSandboxManager, LocalSandboxManager, } from './sandboxManager.js';
import { LinuxSandboxManager } from '../sandbox/linux/LinuxSandboxManager.js';
import { MacOsSandboxManager } from '../sandbox/macos/MacOsSandboxManager.js';
import { WindowsSandboxManager } from '../sandbox/windows/WindowsSandboxManager.js';
/**
 * Creates a sandbox manager based on the provided settings.
 */
export function createSandboxManager(sandbox, options, approvalMode) {
    if (!options.modeConfig && options.policyManager && approvalMode) {
        options.modeConfig = options.policyManager.getModeConfig(approvalMode);
    }
    if (sandbox?.enabled) {
        if (os.platform() === 'win32') {
            return new WindowsSandboxManager(options);
        }
        else if (os.platform() === 'linux') {
            return new LinuxSandboxManager(options);
        }
        else if (os.platform() === 'darwin') {
            return new MacOsSandboxManager(options);
        }
        return new LocalSandboxManager(options);
    }
    return new NoopSandboxManager(options);
}
//# sourceMappingURL=sandboxManagerFactory.js.map