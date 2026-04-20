/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs';
import { BaseDeclarativeTool, BaseToolInvocation, Kind, ToolConfirmationOutcome, } from './tools.js';
import { ENTER_PLAN_MODE_TOOL_NAME } from './tool-names.js';
import { ApprovalMode } from '../policy/types.js';
import { ENTER_PLAN_MODE_DEFINITION } from './definitions/coreTools.js';
import { resolveToolDeclaration } from './definitions/resolver.js';
import { debugLogger } from '../utils/debugLogger.js';
export class EnterPlanModeTool extends BaseDeclarativeTool {
    config;
    static Name = ENTER_PLAN_MODE_TOOL_NAME;
    constructor(config, messageBus) {
        super(EnterPlanModeTool.Name, 'Enter Plan Mode', ENTER_PLAN_MODE_DEFINITION.base.description, Kind.Plan, ENTER_PLAN_MODE_DEFINITION.base.parametersJsonSchema, messageBus);
        this.config = config;
    }
    createInvocation(params, messageBus, toolName, toolDisplayName) {
        return new EnterPlanModeInvocation(params, messageBus, toolName, toolDisplayName, this.config);
    }
    getSchema(modelId) {
        return resolveToolDeclaration(ENTER_PLAN_MODE_DEFINITION, modelId);
    }
}
export class EnterPlanModeInvocation extends BaseToolInvocation {
    config;
    confirmationOutcome = null;
    constructor(params, messageBus, toolName, toolDisplayName, config) {
        super(params, messageBus, toolName, toolDisplayName);
        this.config = config;
    }
    getDescription() {
        return this.params.reason || 'Initiating Plan Mode';
    }
    async shouldConfirmExecute(abortSignal) {
        const decision = await this.getMessageBusDecision(abortSignal);
        if (decision === 'allow') {
            return false;
        }
        if (decision === 'deny') {
            throw new Error(`Tool execution for "${this._toolDisplayName || this._toolName}" denied by policy.`);
        }
        // ask_user
        return {
            type: 'info',
            title: 'Enter Plan Mode',
            prompt: 'This will restrict the agent to read-only tools to allow for safe planning.',
            onConfirm: async (outcome) => {
                this.confirmationOutcome = outcome;
                // Policy updates are now handled centrally by the scheduler
            },
        };
    }
    async execute({ abortSignal: _signal }) {
        if (this.confirmationOutcome === ToolConfirmationOutcome.Cancel) {
            return {
                llmContent: 'User cancelled entering Plan Mode.',
                returnDisplay: 'Cancelled',
            };
        }
        this.config.setApprovalMode(ApprovalMode.PLAN);
        // Ensure plans directory exists so that the agent can write the plan file.
        // In sandboxed environments, the plans directory must exist on the host
        // before it can be bound/allowed in the sandbox.
        const plansDir = this.config.storage.getPlansDir();
        if (!fs.existsSync(plansDir)) {
            try {
                fs.mkdirSync(plansDir, { recursive: true });
            }
            catch (e) {
                // Log error but don't fail; write_file will try again later
                debugLogger.error(`Failed to create plans directory: ${plansDir}`, e);
            }
        }
        return {
            llmContent: 'Switching to Plan mode.',
            returnDisplay: this.params.reason
                ? `Switching to Plan mode: ${this.params.reason}`
                : 'Switching to Plan mode',
        };
    }
}
//# sourceMappingURL=enter-plan-mode.js.map