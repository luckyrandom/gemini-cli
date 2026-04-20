/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export type EnvironmentSanitizationConfig = {
    allowedEnvironmentVariables: string[];
    blockedEnvironmentVariables: string[];
    enableEnvironmentVariableRedaction: boolean;
};
export declare function sanitizeEnvironment(processEnv: NodeJS.ProcessEnv, config: EnvironmentSanitizationConfig): NodeJS.ProcessEnv;
export declare const ALWAYS_ALLOWED_ENVIRONMENT_VARIABLES: ReadonlySet<string>;
export declare const NEVER_ALLOWED_ENVIRONMENT_VARIABLES: ReadonlySet<string>;
export declare const NEVER_ALLOWED_NAME_PATTERNS: readonly [RegExp, RegExp, RegExp, RegExp, RegExp, RegExp, RegExp, RegExp, RegExp, RegExp];
export declare const NEVER_ALLOWED_VALUE_PATTERNS: readonly [RegExp, RegExp, RegExp, RegExp, RegExp, RegExp, RegExp, RegExp, RegExp];
/**
 * Merges a partial sanitization config with secure defaults and validates it.
 * This ensures that sensitive environment variables cannot be bypassed by
 * request-provided configurations.
 */
export declare function getSecureSanitizationConfig(requestedConfig?: Partial<EnvironmentSanitizationConfig>, baseConfig?: EnvironmentSanitizationConfig): EnvironmentSanitizationConfig;
