/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseDeclarativeTool, Kind, BaseToolInvocation, } from '../tools/tools.js';
import {} from '../config/agent-loop-context.js';
import { LocalSubagentInvocation } from './local-invocation.js';
import { RemoteAgentInvocation } from './remote-invocation.js';
import { BROWSER_AGENT_NAME } from './browser/browserAgentDefinition.js';
import { BrowserAgentInvocation } from './browser/browserAgentInvocation.js';
import { formatUserHintsForModel } from '../utils/fastAckHelper.js';
import { isRecord } from '../utils/markdownUtils.js';
import { runInDevTraceSpan } from '../telemetry/trace.js';
import { GeminiCliOperation, GEN_AI_AGENT_DESCRIPTION, GEN_AI_AGENT_NAME, } from '../telemetry/constants.js';
import { AGENT_TOOL_NAME } from '../tools/tool-names.js';
/**
 * A unified tool for invoking subagents.
 *
 * Handles looking up the subagent, validating its eligibility,
 * mapping the general 'prompt' parameter to the agent's specific schema,
 * and delegating execution.
 */
export class AgentTool extends BaseDeclarativeTool {
    context;
    static Name = AGENT_TOOL_NAME;
    constructor(context, messageBus) {
        super(AGENT_TOOL_NAME, 'Invoke Subagent', 'Invoke a subagent to perform a specific task or investigation.', Kind.Agent, {
            type: 'object',
            properties: {
                agent_name: {
                    type: 'string',
                    description: 'Name of the subagent to invoke',
                },
                prompt: {
                    type: 'string',
                    description: 'The COMPLETE query to send the subagent. MUST be comprehensive and detailed. Include all context, background, questions, and expected output format. Do NOT send brief or incomplete instructions.',
                },
            },
            required: ['agent_name', 'prompt'],
        }, messageBus, 
        /* isOutputMarkdown */ true, 
        /* canUpdateOutput */ true);
        this.context = context;
    }
    createInvocation(params, messageBus, _toolName, _toolDisplayName) {
        const registry = this.context.config.getAgentRegistry();
        const definition = registry.getDefinition(params.agent_name);
        if (!definition) {
            throw new Error(`Subagent '${params.agent_name}' not found.`);
        }
        // Smart Parameter Mapping
        const mappedInputs = this.mapParams(params.prompt, definition.inputConfig.inputSchema);
        return new DelegateInvocation(params, mappedInputs, messageBus, definition, this.context, _toolName, _toolDisplayName);
    }
    mapParams(prompt, schema) {
        const schemaObj = schema;
        if (!isRecord(schemaObj)) {
            return { prompt };
        }
        const properties = schemaObj['properties'];
        if (isRecord(properties)) {
            const keys = Object.keys(properties);
            if (keys.length === 1) {
                return { [keys[0]]: prompt };
            }
        }
        return { prompt };
    }
}
class DelegateInvocation extends BaseToolInvocation {
    mappedInputs;
    definition;
    context;
    startIndex;
    constructor(params, mappedInputs, messageBus, definition, context, _toolName, _toolDisplayName) {
        super(params, messageBus, _toolName ?? AGENT_TOOL_NAME, _toolDisplayName ?? `Invoke ${definition.displayName ?? definition.name}`);
        this.mappedInputs = mappedInputs;
        this.definition = definition;
        this.context = context;
        this.startIndex = context.config.injectionService.getLatestInjectionIndex();
    }
    getDescription() {
        return `Delegating to agent '${this.definition.name}'`;
    }
    buildChildInvocation(agentArgs) {
        if (this.definition.name === BROWSER_AGENT_NAME) {
            return new BrowserAgentInvocation(this.context, agentArgs, this.messageBus, this._toolName, this._toolDisplayName);
        }
        if (this.definition.kind === 'remote') {
            return new RemoteAgentInvocation(this.definition, this.context, agentArgs, this.messageBus);
        }
        else {
            return new LocalSubagentInvocation(this.definition, this.context, agentArgs, this.messageBus);
        }
    }
    async shouldConfirmExecute(abortSignal) {
        const hintedParams = this.withUserHints(this.mappedInputs);
        const invocation = this.buildChildInvocation(hintedParams);
        return invocation.shouldConfirmExecute(abortSignal);
    }
    async execute(options) {
        const { abortSignal: signal, updateOutput } = options;
        const hintedParams = this.withUserHints(this.mappedInputs);
        const invocation = this.buildChildInvocation(hintedParams);
        return runInDevTraceSpan({
            operation: GeminiCliOperation.AgentCall,
            logPrompts: this.context.config.getTelemetryLogPromptsEnabled(),
            sessionId: this.context.config.getSessionId(),
            attributes: {
                [GEN_AI_AGENT_NAME]: this.definition.name,
                [GEN_AI_AGENT_DESCRIPTION]: this.definition.description,
            },
        }, async ({ metadata }) => {
            metadata.input = this.params;
            const result = await invocation.execute({
                abortSignal: signal,
                updateOutput,
            });
            metadata.output = result;
            return result;
        });
    }
    withUserHints(agentArgs) {
        if (this.definition.kind !== 'remote') {
            return agentArgs;
        }
        const userHints = this.context.config.injectionService.getInjectionsAfter(this.startIndex, 'user_steering');
        const formattedHints = formatUserHintsForModel(userHints);
        if (!formattedHints) {
            return agentArgs;
        }
        // Find the primary key to append hints to
        const schemaObj = this.definition.inputConfig.inputSchema;
        if (!isRecord(schemaObj)) {
            return agentArgs;
        }
        const properties = schemaObj['properties'];
        if (isRecord(properties)) {
            const keys = Object.keys(properties);
            const primaryKey = keys.length === 1 ? keys[0] : 'prompt';
            const value = agentArgs[primaryKey];
            if (typeof value !== 'string' || value.trim().length === 0) {
                return agentArgs;
            }
            return {
                ...agentArgs,
                [primaryKey]: `${formattedHints}\n\n${value}`,
            };
        }
        return agentArgs;
    }
}
//# sourceMappingURL=agent-tool.js.map