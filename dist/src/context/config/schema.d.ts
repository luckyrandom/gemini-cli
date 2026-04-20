/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ContextProcessorRegistry } from './registry.js';
export declare function getContextManagementConfigSchema(registry: ContextProcessorRegistry): {
    $schema: string;
    title: string;
    description: string;
    type: string;
    properties: {
        budget: {
            type: string;
            description: string;
            required: string[];
            properties: {
                retainedTokens: {
                    type: string;
                    description: string;
                };
                maxTokens: {
                    type: string;
                    description: string;
                };
            };
        };
        processorOptions: {
            type: string;
            description: string;
            additionalProperties: {
                oneOf: {
                    type: string;
                    required: string[];
                    properties: {
                        type: {
                            const: string;
                        };
                        options: import("ajv").JSONSchemaType<unknown>;
                    };
                }[];
            };
        };
    };
};
