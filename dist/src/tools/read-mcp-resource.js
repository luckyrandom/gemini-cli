/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseDeclarativeTool, BaseToolInvocation, Kind, } from './tools.js';
import { READ_MCP_RESOURCE_TOOL_NAME } from './tool-names.js';
import { READ_MCP_RESOURCE_DEFINITION } from './definitions/coreTools.js';
import { ToolErrorType } from './tool-error.js';
export class ReadMcpResourceTool extends BaseDeclarativeTool {
    context;
    static Name = READ_MCP_RESOURCE_TOOL_NAME;
    constructor(context, messageBus) {
        super(ReadMcpResourceTool.Name, 'Read MCP Resource', READ_MCP_RESOURCE_DEFINITION.base.description, Kind.Read, READ_MCP_RESOURCE_DEFINITION.base.parametersJsonSchema, messageBus, true, false);
        this.context = context;
    }
    createInvocation(params) {
        return new ReadMcpResourceToolInvocation(this.context, params, this.messageBus);
    }
}
class ReadMcpResourceToolInvocation extends BaseToolInvocation {
    context;
    resource;
    constructor(context, params, messageBus) {
        super(params, messageBus, ReadMcpResourceTool.Name, 'Read MCP Resource');
        this.context = context;
        const mcpManager = this.context.config.getMcpClientManager();
        this.resource = mcpManager?.findResourceByUri(params.uri);
    }
    getDescription() {
        if (this.resource) {
            return `Read MCP resource "${this.resource.name}" from server "${this.resource.serverName}"`;
        }
        return `Read MCP resource: ${this.params.uri}`;
    }
    async execute({ abortSignal: _abortSignal, }) {
        const mcpManager = this.context.config.getMcpClientManager();
        if (!mcpManager) {
            return {
                llmContent: 'Error: MCP Client Manager not available.',
                returnDisplay: 'Error: MCP Client Manager not available.',
                error: {
                    message: 'MCP Client Manager not available.',
                    type: ToolErrorType.EXECUTION_FAILED,
                },
            };
        }
        const uri = this.params.uri;
        if (!uri) {
            return {
                llmContent: 'Error: No URI provided.',
                returnDisplay: 'Error: No URI provided.',
                error: {
                    message: 'No URI provided.',
                    type: ToolErrorType.INVALID_TOOL_PARAMS,
                },
            };
        }
        const resource = mcpManager.findResourceByUri(uri);
        if (!resource) {
            const errorMessage = `Resource not found for URI: ${uri}`;
            return {
                llmContent: `Error: ${errorMessage}`,
                returnDisplay: `Error: ${errorMessage}`,
                error: {
                    message: errorMessage,
                    type: ToolErrorType.MCP_RESOURCE_NOT_FOUND,
                },
            };
        }
        const client = mcpManager.getClient(resource.serverName);
        if (!client) {
            const errorMessage = `MCP Client not found for server: ${resource.serverName}`;
            return {
                llmContent: `Error: ${errorMessage}`,
                returnDisplay: `Error: ${errorMessage}`,
                error: {
                    message: errorMessage,
                    type: ToolErrorType.EXECUTION_FAILED,
                },
            };
        }
        try {
            const result = await client.readResource(resource.uri);
            // The result should contain contents.
            // Let's assume it returns a string or an object with contents.
            // According to MCP spec, it returns { contents: [...] }.
            // We should format it nicely.
            let contentText = '';
            if (result && result.contents) {
                for (const content of result.contents) {
                    if ('text' in content && content.text) {
                        contentText += content.text + '\n';
                    }
                    else if ('blob' in content && content.blob) {
                        contentText += `[Binary Data (${content.mimeType})]` + '\n';
                    }
                }
            }
            return {
                llmContent: contentText || 'No content returned from resource.',
                returnDisplay: this.resource
                    ? `Successfully read resource "${this.resource.name}" from server "${this.resource.serverName}"`
                    : `Successfully read resource: ${uri}`,
            };
        }
        catch (e) {
            const errorMessage = `Failed to read resource: ${e instanceof Error ? e.message : String(e)}`;
            return {
                llmContent: `Error: ${errorMessage}`,
                returnDisplay: `Error: ${errorMessage}`,
                error: {
                    message: errorMessage,
                    type: ToolErrorType.MCP_TOOL_ERROR,
                },
            };
        }
    }
}
//# sourceMappingURL=read-mcp-resource.js.map