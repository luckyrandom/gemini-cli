import type { JSONSchemaType } from 'ajv';
import type { AsyncContextProcessor } from '../pipeline.js';
import type { ContextEnvironment } from '../pipeline/environment.js';
export interface StateSnapshotAsyncProcessorOptions {
    type?: 'accumulate' | 'point-in-time';
    systemInstruction?: string;
}
export declare const StateSnapshotAsyncProcessorOptionsSchema: JSONSchemaType<StateSnapshotAsyncProcessorOptions>;
export declare function createStateSnapshotAsyncProcessor(id: string, env: ContextEnvironment, options: StateSnapshotAsyncProcessorOptions): AsyncContextProcessor;
