import { type SandboxPermissions, type SandboxRequest } from '../../services/sandboxManager.js';
export declare function handleReadWriteCommands(req: SandboxRequest, mergedAdditional: SandboxPermissions, workspace: string, allowedPaths?: string[]): {
    command: string;
    args: string[];
};
