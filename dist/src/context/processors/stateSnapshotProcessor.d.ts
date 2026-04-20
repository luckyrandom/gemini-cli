import type { JSONSchemaType } from 'ajv';
import type { ContextProcessor, BackstopTargetOptions } from '../pipeline.js';
import type { ContextEnvironment } from '../pipeline/environment.js';
export interface StateSnapshotProcessorOptions extends BackstopTargetOptions {
    model?: string;
    systemInstruction?: string;
}
export declare const StateSnapshotProcessorOptionsSchema: JSONSchemaType<StateSnapshotProcessorOptions>;
export declare function createStateSnapshotProcessor(id: string, env: ContextEnvironment, options: StateSnapshotProcessorOptions): ContextProcessor;
