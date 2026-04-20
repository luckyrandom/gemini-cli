/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../../config/config.js';
import { type ContextProfile } from './profiles.js';
import type { ContextProcessorRegistry } from './registry.js';
/**
 * Generates a Sidecar JSON graph from the experimental config file path or defaults.
 * If a config file is present but invalid, this will THROW to prevent silent misconfiguration.
 */
export declare function loadContextManagementConfig(config: Config, registry: ContextProcessorRegistry): Promise<ContextProfile>;
