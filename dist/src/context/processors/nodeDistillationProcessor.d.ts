import type { JSONSchemaType } from 'ajv';
import type { ContextProcessor } from '../pipeline.js';
import type { ContextEnvironment } from '../pipeline/environment.js';
export interface NodeDistillationProcessorOptions {
    nodeThresholdTokens: number;
}
export declare const NodeDistillationProcessorOptionsSchema: JSONSchemaType<NodeDistillationProcessorOptions>;
export declare function createNodeDistillationProcessor(id: string, env: ContextEnvironment, options: NodeDistillationProcessorOptions): ContextProcessor;
