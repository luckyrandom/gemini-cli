/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import { defaultContextProfile } from './profiles.js';
import { SchemaValidator } from '../../utils/schemaValidator.js';
import { getContextManagementConfigSchema } from './schema.js';
import { getErrorMessage } from '../../utils/errors.js';
/**
 * Loads and validates a sidecar config from a specific file path.
 * Throws an error if the file cannot be read, parsed, or fails schema validation.
 */
async function loadConfigFromFile(sidecarPath, registry) {
    const fileContent = await fs.readFile(sidecarPath, 'utf8');
    let parsed;
    try {
        parsed = JSON.parse(fileContent);
    }
    catch (error) {
        throw new Error(`Failed to parse Sidecar configuration file at ${sidecarPath}: ${getErrorMessage(error)}`);
    }
    // Validate the complete structure, including deep options
    const validationError = SchemaValidator.validate(getContextManagementConfigSchema(registry), parsed);
    if (validationError) {
        throw new Error(`Invalid sidecar configuration in ${sidecarPath}. Validation error: ${validationError}`);
    }
    // Extract strictly what we need.
    // Why this unsafe cast is acceptable:
    // SchemaValidator just ran \`getSidecarConfigSchema(registry)\` against \`parsed\`.
    // That function dynamically maps the \`processorOptions\` to strict JSON schema definitions,
    // so we know with absolute certainty at runtime that \`parsed\` conforms to this shape.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const validConfig = parsed;
    return {
        ...defaultContextProfile,
        config: {
            ...defaultContextProfile.config,
            ...(validConfig.budget ? { budget: validConfig.budget } : {}),
            ...(validConfig.processorOptions
                ? { processorOptions: validConfig.processorOptions }
                : {}),
        },
    };
}
/**
 * Generates a Sidecar JSON graph from the experimental config file path or defaults.
 * If a config file is present but invalid, this will THROW to prevent silent misconfiguration.
 */
export async function loadContextManagementConfig(config, registry) {
    const sidecarPath = config.getExperimentalContextManagementConfig();
    if (sidecarPath && fsSync.existsSync(sidecarPath)) {
        const size = fsSync.statSync(sidecarPath).size;
        // If the file exists but is completely empty (0 bytes), it's safe to fallback.
        if (size === 0) {
            return defaultContextProfile;
        }
        // If the file has content, enforce strict validation and throw on failure.
        return loadConfigFromFile(sidecarPath, registry);
    }
    return defaultContextProfile;
}
//# sourceMappingURL=configLoader.js.map