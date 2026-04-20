/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseDeclarativeTool, BaseToolInvocation, Kind, } from './tools.js';
import { COMPLETE_TASK_TOOL_NAME, COMPLETE_TASK_DISPLAY_NAME, } from './definitions/base-declarations.js';
import {} from '../agents/types.js';
import {} from 'zod';
import {} from '../confirmation-bus/message-bus.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
/**
 * Tool for signaling task completion and optionally returning structured output.
 * This tool is specifically designed for use in subagent loops.
 */
export class CompleteTaskTool extends BaseDeclarativeTool {
    outputConfig;
    processOutput;
    static Name = COMPLETE_TASK_TOOL_NAME;
    constructor(messageBus, outputConfig, processOutput) {
        super(CompleteTaskTool.Name, COMPLETE_TASK_DISPLAY_NAME, outputConfig
            ? 'Call this tool to submit your final answer and complete the task. This is the ONLY way to finish.'
            : 'Call this tool to submit your final findings and complete the task. This is the ONLY way to finish.', Kind.Other, CompleteTaskTool.buildParameterSchema(outputConfig), messageBus);
        this.outputConfig = outputConfig;
        this.processOutput = processOutput;
    }
    static buildParameterSchema(outputConfig) {
        if (outputConfig) {
            const jsonSchema = zodToJsonSchema(outputConfig.schema);
            const { $schema: _$schema, definitions: _definitions, ...schema } = jsonSchema;
            return {
                type: 'object',
                properties: {
                    [outputConfig.outputName]: schema,
                },
                required: [outputConfig.outputName],
            };
        }
        return {
            type: 'object',
            properties: {
                result: {
                    type: 'string',
                    description: 'Your final results or findings to return to the orchestrator. ' +
                        'Ensure this is comprehensive and follows any formatting requested in your instructions.',
                },
            },
            required: ['result'],
        };
    }
    validateToolParamValues(params) {
        if (this.outputConfig) {
            const outputName = this.outputConfig.outputName;
            if (params[outputName] === undefined) {
                return `Missing required argument '${outputName}' for completion.`;
            }
            const validationResult = this.outputConfig.schema.safeParse(params[outputName]);
            if (!validationResult.success) {
                return `Output validation failed: ${JSON.stringify(validationResult.error.flatten())}`;
            }
        }
        else {
            const resultArg = params['result'];
            if (resultArg === undefined ||
                resultArg === null ||
                (typeof resultArg === 'string' && resultArg.trim() === '')) {
                return 'Missing required "result" argument. You must provide your findings when calling complete_task.';
            }
        }
        return null;
    }
    createInvocation(params, messageBus, toolName, toolDisplayName) {
        return new CompleteTaskInvocation(params, messageBus, toolName, toolDisplayName, this.outputConfig, this.processOutput);
    }
}
export class CompleteTaskInvocation extends BaseToolInvocation {
    outputConfig;
    processOutput;
    constructor(params, messageBus, toolName, toolDisplayName, outputConfig, processOutput) {
        super(params, messageBus, toolName, toolDisplayName);
        this.outputConfig = outputConfig;
        this.processOutput = processOutput;
    }
    getDescription() {
        return 'Completing task and submitting results.';
    }
    async execute({ abortSignal: _signal }) {
        let submittedOutput = null;
        let outputValue;
        if (this.outputConfig) {
            outputValue = this.params[this.outputConfig.outputName];
            if (this.processOutput) {
                // We validated the params in validateToolParamValues, so safe to cast
                submittedOutput = this.processOutput(outputValue);
            }
            else {
                submittedOutput =
                    typeof outputValue === 'string'
                        ? outputValue
                        : JSON.stringify(outputValue, null, 2);
            }
        }
        else {
            outputValue = this.params['result'];
            submittedOutput =
                typeof outputValue === 'string'
                    ? outputValue
                    : JSON.stringify(outputValue, null, 2);
        }
        const returnDisplay = this.outputConfig
            ? 'Output submitted and task completed.'
            : 'Result submitted and task completed.';
        return {
            llmContent: returnDisplay,
            returnDisplay,
            data: {
                taskCompleted: true,
                submittedOutput,
            },
        };
    }
}
//# sourceMappingURL=complete-task.js.map