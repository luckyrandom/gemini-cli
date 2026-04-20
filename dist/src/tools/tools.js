/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { ToolErrorType } from './tool-error.js';
import { SchemaValidator } from '../utils/schemaValidator.js';
import { isRecord } from '../utils/markdownUtils.js';
import { randomUUID } from 'node:crypto';
import { MessageBusType, } from '../confirmation-bus/types.js';
import { ApprovalMode } from '../policy/types.js';
export function isBackgroundExecutionData(data) {
    if (typeof data !== 'object' || data === null) {
        return false;
    }
    const pid = 'pid' in data ? data.pid : undefined;
    const command = 'command' in data ? data.command : undefined;
    const initialOutput = 'initialOutput' in data ? data.initialOutput : undefined;
    return ((pid === undefined || typeof pid === 'number') &&
        (command === undefined || typeof command === 'string') &&
        (initialOutput === undefined || typeof initialOutput === 'string'));
}
/**
 * A convenience base class for ToolInvocation.
 */
export class BaseToolInvocation {
    params;
    messageBus;
    _toolName;
    _toolDisplayName;
    _serverName;
    _toolAnnotations;
    respectsAutoEdit;
    getApprovalMode;
    constructor(params, messageBus, _toolName, _toolDisplayName, _serverName, _toolAnnotations, respectsAutoEdit = false, getApprovalMode = () => ApprovalMode.DEFAULT) {
        this.params = params;
        this.messageBus = messageBus;
        this._toolName = _toolName;
        this._toolDisplayName = _toolDisplayName;
        this._serverName = _serverName;
        this._toolAnnotations = _toolAnnotations;
        this.respectsAutoEdit = respectsAutoEdit;
        this.getApprovalMode = getApprovalMode;
    }
    getDisplayTitle() {
        return this.getDescription();
    }
    getExplanation() {
        return '';
    }
    toolLocations() {
        return [];
    }
    async shouldConfirmExecute(abortSignal, forcedDecision) {
        if (this.respectsAutoEdit &&
            this.getApprovalMode() === ApprovalMode.AUTO_EDIT &&
            forcedDecision !== 'ask_user') {
            return false;
        }
        const decision = forcedDecision ?? (await this.getMessageBusDecision(abortSignal));
        if (decision === 'allow') {
            return false;
        }
        if (decision === 'deny') {
            throw new Error(`Tool execution for "${this._toolDisplayName || this._toolName}" denied by policy.`);
        }
        if (decision === 'ask_user') {
            return this.getConfirmationDetails(abortSignal);
        }
        // Default to confirmation details if decision is unknown (should not happen with exhaustive policy)
        return this.getConfirmationDetails(abortSignal);
    }
    /**
     * Returns tool-specific options for policy updates.
     * Subclasses can override this to provide additional options like
     * commandPrefix (for shell) or mcpName (for MCP tools).
     */
    getPolicyUpdateOptions(_outcome) {
        return undefined;
    }
    /**
     * Helper method to publish a policy update when user selects
     * ProceedAlways or ProceedAlwaysAndSave.
     */
    async publishPolicyUpdate(outcome) {
        if (outcome === ToolConfirmationOutcome.ProceedAlways ||
            outcome === ToolConfirmationOutcome.ProceedAlwaysAndSave) {
            if (this._toolName) {
                const options = this.getPolicyUpdateOptions(outcome);
                void this.messageBus.publish({
                    type: MessageBusType.UPDATE_POLICY,
                    toolName: this._toolName,
                    persist: outcome === ToolConfirmationOutcome.ProceedAlwaysAndSave,
                    ...options,
                });
            }
        }
    }
    /**
     * Subclasses should override this method to provide custom confirmation UI
     * when the policy engine's decision is 'ask_user'.
     * The base implementation provides a generic confirmation prompt.
     */
    async getConfirmationDetails(_abortSignal) {
        if (!this.messageBus) {
            return false;
        }
        const confirmationDetails = {
            type: 'info',
            title: `Confirm: ${this._toolDisplayName || this._toolName}`,
            prompt: this.getDescription(),
            onConfirm: async (_outcome) => {
                // Policy updates are now handled centrally by the scheduler
            },
        };
        return confirmationDetails;
    }
    getMessageBusDecision(abortSignal, forcedDecision) {
        if (!this.messageBus || !this._toolName) {
            // If there's no message bus, we can't make a decision, so we allow.
            // The legacy confirmation flow will still apply if the tool needs it.
            return Promise.resolve('allow');
        }
        const correlationId = randomUUID();
        const request = {
            type: MessageBusType.TOOL_CONFIRMATION_REQUEST,
            correlationId,
            toolCall: {
                name: this._toolName,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
                args: this.params,
            },
            serverName: this._serverName,
            toolAnnotations: this._toolAnnotations,
            forcedDecision,
        };
        return new Promise((resolve) => {
            if (!this.messageBus) {
                resolve('allow');
                return;
            }
            let timeoutId = null;
            let unsubscribe = null;
            const cleanup = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                if (unsubscribe) {
                    unsubscribe();
                    unsubscribe = null;
                }
                abortSignal.removeEventListener('abort', abortHandler);
            };
            const abortHandler = () => {
                cleanup();
                resolve('deny');
            };
            if (abortSignal.aborted) {
                resolve('deny');
                return;
            }
            const responseHandler = (response) => {
                if (response.correlationId === correlationId) {
                    cleanup();
                    if (response.requiresUserConfirmation) {
                        resolve('ask_user');
                    }
                    else if (response.confirmed) {
                        resolve('allow');
                    }
                    else {
                        resolve('deny');
                    }
                }
            };
            abortSignal.addEventListener('abort', abortHandler, { once: true });
            timeoutId = setTimeout(() => {
                cleanup();
                resolve('ask_user'); // Default to ask_user on timeout
            }, 30000);
            this.messageBus.subscribe(MessageBusType.TOOL_CONFIRMATION_RESPONSE, responseHandler);
            unsubscribe = () => {
                this.messageBus?.unsubscribe(MessageBusType.TOOL_CONFIRMATION_RESPONSE, responseHandler);
            };
            try {
                void this.messageBus.publish(request);
            }
            catch {
                cleanup();
                resolve('allow');
            }
        });
    }
    toJSON() {
        return {
            params: this.params,
        };
    }
}
/**
 * New base class for tools that separates validation from execution.
 * New tools should extend this class.
 */
export class DeclarativeTool {
    name;
    displayName;
    description;
    kind;
    parameterSchema;
    messageBus;
    isOutputMarkdown;
    canUpdateOutput;
    extensionName;
    extensionId;
    constructor(name, displayName, description, kind, parameterSchema, messageBus, isOutputMarkdown = true, canUpdateOutput = false, extensionName, extensionId) {
        this.name = name;
        this.displayName = displayName;
        this.description = description;
        this.kind = kind;
        this.parameterSchema = parameterSchema;
        this.messageBus = messageBus;
        this.isOutputMarkdown = isOutputMarkdown;
        this.canUpdateOutput = canUpdateOutput;
        this.extensionName = extensionName;
        this.extensionId = extensionId;
    }
    clone(messageBus) {
        // Note: we cannot use structuredClone() here because it does not preserve
        // prototype chains or handle non-serializable properties (like functions).
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        const cloned = Object.assign(
        // eslint-disable-next-line no-restricted-syntax
        Object.create(Object.getPrototypeOf(this)), this);
        if (messageBus) {
            Object.defineProperty(cloned, 'messageBus', {
                value: messageBus,
                writable: false,
                configurable: true,
            });
        }
        return cloned;
    }
    toJSON() {
        return {
            name: this.name,
            displayName: this.displayName,
            description: this.description,
            kind: this.kind,
            parameterSchema: this.parameterSchema,
        };
    }
    get isReadOnly() {
        return READ_ONLY_KINDS.includes(this.kind);
    }
    get toolAnnotations() {
        return undefined;
    }
    getSchema(_modelId) {
        return {
            name: this.name,
            description: this.description,
            parametersJsonSchema: this.addWaitForPreviousParameter(this.parameterSchema),
        };
    }
    /**
     * Type guard to check if an unknown value represents a ToolParameterSchema object.
     */
    isParameterSchema(obj) {
        return isRecord(obj) && 'type' in obj;
    }
    /**
     * Adds the `wait_for_previous` parameter to the tool's schema.
     * This allows the model to explicitly control parallel vs sequential execution.
     */
    addWaitForPreviousParameter(schema) {
        if (!this.isParameterSchema(schema) || schema.type !== 'object') {
            return schema;
        }
        const props = schema.properties;
        let propertiesObj = {};
        if (props !== undefined) {
            if (!isRecord(props)) {
                // properties exists but is not an object, so it's a malformed schema.
                return schema;
            }
            propertiesObj = props;
        }
        return {
            ...schema,
            properties: {
                ...propertiesObj,
                wait_for_previous: {
                    type: 'boolean',
                    description: 'Set to true to wait for all previously requested tools in this turn to complete before starting. Set to false (or omit) to run in parallel. Use true when this tool depends on the output of previous tools.',
                },
            },
        };
    }
    get schema() {
        return this.getSchema();
    }
    /**
     * Validates the raw tool parameters.
     * Subclasses should override this to add custom validation logic
     * beyond the JSON schema check.
     * @param params The raw parameters from the model.
     * @returns An error message string if invalid, null otherwise.
     */
    validateToolParams(_params) {
        // Base implementation can be extended by subclasses.
        return null;
    }
    /**
     * A convenience method that builds and executes the tool in one step.
     * Throws an error if validation fails.
     * @param params The raw, untrusted parameters from the model.
     * @param signal AbortSignal for tool cancellation.
     * @param updateOutput Optional callback to stream output.
     * @returns The result of the tool execution.
     */
    async buildAndExecute(params, signal, updateOutput, options) {
        const invocation = this.build(params);
        return invocation.execute({
            ...options,
            abortSignal: signal,
            updateOutput,
        });
    }
    /**
     * Similar to `build` but never throws.
     * @param params The raw, untrusted parameters from the model.
     * @returns A `ToolInvocation` instance.
     */
    silentBuild(params) {
        try {
            return this.build(params);
        }
        catch (e) {
            if (e instanceof Error) {
                return e;
            }
            return new Error(String(e));
        }
    }
    /**
     * A convenience method that builds and executes the tool in one step.
     * Never throws.
     * @param params The raw, untrusted parameters from the model.
     * @param abortSignal a signal to abort.
     * @returns The result of the tool execution.
     */
    async validateBuildAndExecute(params, abortSignal) {
        const invocationOrError = this.silentBuild(params);
        if (invocationOrError instanceof Error) {
            const errorMessage = invocationOrError.message;
            return {
                llmContent: `Error: Invalid parameters provided. Reason: ${errorMessage}`,
                returnDisplay: errorMessage,
                error: {
                    message: errorMessage,
                    type: ToolErrorType.INVALID_TOOL_PARAMS,
                },
            };
        }
        try {
            return await invocationOrError.execute({ abortSignal });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                llmContent: `Error: Tool call execution failed. Reason: ${errorMessage}`,
                returnDisplay: errorMessage,
                error: {
                    message: errorMessage,
                    type: ToolErrorType.EXECUTION_FAILED,
                },
            };
        }
    }
}
/**
 * New base class for declarative tools that separates validation from execution.
 * New tools should extend this class, which provides a `build` method that
 * validates parameters before deferring to a `createInvocation` method for
 * the final `ToolInvocation` object instantiation.
 */
export class BaseDeclarativeTool extends DeclarativeTool {
    build(params) {
        const validationError = this.validateToolParams(params);
        if (validationError) {
            throw new Error(validationError);
        }
        return this.createInvocation(params, this.messageBus, this.name, this.displayName);
    }
    validateToolParams(params) {
        const errors = SchemaValidator.validate(this.schema.parametersJsonSchema, params);
        if (errors) {
            return errors;
        }
        return this.validateToolParamValues(params);
    }
    validateToolParamValues(_params) {
        // Base implementation can be extended by subclasses.
        return null;
    }
}
/**
 * Type guard to check if an object is a Tool.
 * @param obj The object to check.
 * @returns True if the object is a Tool, false otherwise.
 */
export function isTool(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'name' in obj &&
        'build' in obj &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        typeof obj.build === 'function');
}
/**
 * Detects cycles in a JSON schemas due to `$ref`s.
 * @param schema The root of the JSON schema.
 * @returns `true` if a cycle is detected, `false` otherwise.
 */
export function hasCycleInSchema(schema) {
    function resolveRef(ref) {
        if (!ref.startsWith('#/')) {
            return null;
        }
        const path = ref.substring(2).split('/');
        let current = schema;
        for (const segment of path) {
            if (typeof current !== 'object' ||
                current === null ||
                !Object.prototype.hasOwnProperty.call(current, segment)) {
                return null;
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
            current = current[segment];
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        return current;
    }
    function traverse(node, visitedRefs, pathRefs) {
        if (typeof node !== 'object' || node === null) {
            return false;
        }
        if (Array.isArray(node)) {
            for (const item of node) {
                if (traverse(item, visitedRefs, pathRefs)) {
                    return true;
                }
            }
            return false;
        }
        if ('$ref' in node && typeof node.$ref === 'string') {
            const ref = node.$ref;
            if (ref === '#' || ref === '#/' || pathRefs.has(ref)) {
                // A ref to just '#/' is always a cycle.
                return true; // Cycle detected!
            }
            if (visitedRefs.has(ref)) {
                return false; // Bail early, we have checked this ref before.
            }
            const resolvedNode = resolveRef(ref);
            if (resolvedNode) {
                // Add it to both visited and the current path
                visitedRefs.add(ref);
                pathRefs.add(ref);
                const hasCycle = traverse(resolvedNode, visitedRefs, pathRefs);
                pathRefs.delete(ref); // Backtrack, leaving it in visited
                return hasCycle;
            }
        }
        // Crawl all the properties of node
        for (const key in node) {
            if (Object.prototype.hasOwnProperty.call(node, key)) {
                if (traverse(
                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
                node[key], visitedRefs, pathRefs)) {
                    return true;
                }
            }
        }
        return false;
    }
    return traverse(schema, new Set(), new Set());
}
export function isStructuredToolResult(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'summary' in obj &&
        typeof obj.summary === 'string');
}
export const hasSummary = (res) => isStructuredToolResult(res);
export const isGrepResult = (res) => isStructuredToolResult(res) && 'matches' in res && Array.isArray(res.matches);
export const isListResult = (res) => isStructuredToolResult(res) && 'files' in res && Array.isArray(res.files);
export const isReadManyFilesResult = (res) => isListResult(res) && 'include' in res;
export const isFileDiff = (res) => typeof res === 'object' &&
    res !== null &&
    'fileDiff' in res &&
    'fileName' in res &&
    'filePath' in res;
export var ToolConfirmationOutcome;
(function (ToolConfirmationOutcome) {
    ToolConfirmationOutcome["ProceedOnce"] = "proceed_once";
    ToolConfirmationOutcome["ProceedAlways"] = "proceed_always";
    ToolConfirmationOutcome["ProceedAlwaysAndSave"] = "proceed_always_and_save";
    ToolConfirmationOutcome["ProceedAlwaysServer"] = "proceed_always_server";
    ToolConfirmationOutcome["ProceedAlwaysTool"] = "proceed_always_tool";
    ToolConfirmationOutcome["ModifyWithEditor"] = "modify_with_editor";
    ToolConfirmationOutcome["Cancel"] = "cancel";
})(ToolConfirmationOutcome || (ToolConfirmationOutcome = {}));
export var Kind;
(function (Kind) {
    Kind["Read"] = "read";
    Kind["Edit"] = "edit";
    Kind["Delete"] = "delete";
    Kind["Move"] = "move";
    Kind["Search"] = "search";
    Kind["Execute"] = "execute";
    Kind["Think"] = "think";
    Kind["Agent"] = "agent";
    Kind["Fetch"] = "fetch";
    Kind["Communicate"] = "communicate";
    Kind["Plan"] = "plan";
    Kind["SwitchMode"] = "switch_mode";
    Kind["Other"] = "other";
})(Kind || (Kind = {}));
// Function kinds that have side effects
export const MUTATOR_KINDS = [
    Kind.Edit,
    Kind.Delete,
    Kind.Move,
    Kind.Execute,
];
// Function kinds that are safe to run in parallel
export const READ_ONLY_KINDS = [
    Kind.Read,
    Kind.Search,
    Kind.Fetch,
];
//# sourceMappingURL=tools.js.map