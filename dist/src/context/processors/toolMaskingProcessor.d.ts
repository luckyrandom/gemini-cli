import type { JSONSchemaType } from 'ajv';
import type { ContextProcessor } from '../pipeline.js';
import type { ContextEnvironment } from '../pipeline/environment.js';
export interface ToolMaskingProcessorOptions {
    stringLengthThresholdTokens: number;
}
export declare const ToolMaskingProcessorOptionsSchema: JSONSchemaType<ToolMaskingProcessorOptions>;
export declare function createToolMaskingProcessor(id: string, env: ContextEnvironment, options: ToolMaskingProcessorOptions): ContextProcessor;
