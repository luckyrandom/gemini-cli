import type { JSONSchemaType } from 'ajv';
import type { ContextProcessor } from '../pipeline.js';
import type { ContextEnvironment } from '../pipeline/environment.js';
export type BlobDegradationProcessorOptions = Record<string, never>;
export declare const BlobDegradationProcessorOptionsSchema: JSONSchemaType<BlobDegradationProcessorOptions>;
export declare function createBlobDegradationProcessor(id: string, env: ContextEnvironment): ContextProcessor;
