/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { JSONSchemaType } from 'ajv';
export interface ContextProcessorDef<T = unknown> {
    readonly id: string;
    readonly schema: JSONSchemaType<T>;
}
/**
 * Registry for validating declarative sidecar configuration schemas.
 * (Dynamic instantiation has been replaced by static ContextProfiles)
 */
export declare class ContextProcessorRegistry {
    private readonly processors;
    registerProcessor<T>(def: ContextProcessorDef<T>): void;
    getSchema(id: string): object | undefined;
    getSchemaDefs(): ContextProcessorDef[];
    clear(): void;
}
