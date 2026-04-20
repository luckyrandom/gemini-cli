import type { JSONSchemaType } from 'ajv';
import type { ContextProcessor } from '../pipeline.js';
import type { ContextEnvironment } from '../pipeline/environment.js';
export interface NodeTruncationProcessorOptions {
    maxTokensPerNode: number;
}
export declare const NodeTruncationProcessorOptionsSchema: JSONSchemaType<NodeTruncationProcessorOptions>;
export declare function createNodeTruncationProcessor(id: string, env: ContextEnvironment, options: NodeTruncationProcessorOptions): ContextProcessor;
