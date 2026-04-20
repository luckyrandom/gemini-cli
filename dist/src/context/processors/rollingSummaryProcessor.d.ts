import type { JSONSchemaType } from 'ajv';
import type { ContextProcessor, BackstopTargetOptions } from '../pipeline.js';
import type { ContextEnvironment } from '../pipeline/environment.js';
export interface RollingSummaryProcessorOptions extends BackstopTargetOptions {
    systemInstruction?: string;
}
export declare const RollingSummaryProcessorOptionsSchema: JSONSchemaType<RollingSummaryProcessorOptions>;
export declare function createRollingSummaryProcessor(id: string, env: ContextEnvironment, options: RollingSummaryProcessorOptions): ContextProcessor;
