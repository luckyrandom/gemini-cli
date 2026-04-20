/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Escapes a string for use in a regular expression.
 */
export declare function escapeRegex(text: string): string;
/**
 * Basic validation for regular expressions to prevent common ReDoS patterns.
 * This is a heuristic check and not a substitute for a full ReDoS scanner.
 */
export declare function isSafeRegExp(pattern: string): boolean;
/**
 * Builds a list of args patterns for policy matching.
 *
 * This function handles the transformation of command prefixes and regexes into
 * the internal argsPattern representation used by the PolicyEngine.
 *
 * @param argsPattern An optional raw regex string for arguments.
 * @param commandPrefix An optional command prefix (or list of prefixes) to allow.
 * @param commandRegex An optional command regex string to allow.
 * @returns An array of string patterns (or undefined) for the PolicyEngine.
 */
export declare function buildArgsPatterns(argsPattern?: string, commandPrefix?: string | string[], commandRegex?: string): Array<string | undefined>;
/**
 * Builds a regex pattern to match a specific parameter and value in tool arguments.
 * This is used to narrow tool approvals to specific parameters.
 *
 * @param paramName The name of the parameter.
 * @param value The value to match.
 * @returns A regex string that matches "<paramName>":<value> in a JSON string.
 */
export declare function buildParamArgsPattern(paramName: string, value: unknown): string;
/**
 * Builds a regex pattern to match a specific file path in tool arguments.
 * This is used to narrow tool approvals for edit tools to specific files.
 *
 * @param filePath The relative path to the file.
 * @returns A regex string that matches "file_path":"<path>" in a JSON string.
 */
export declare function buildFilePathArgsPattern(filePath: string): string;
/**
 * Builds a regex pattern to match a specific directory path in tool arguments.
 * This is used to narrow tool approvals for list_directory tool.
 *
 * @param dirPath The path to the directory.
 * @returns A regex string that matches "dir_path":"<path>" in a JSON string.
 */
export declare function buildDirPathArgsPattern(dirPath: string): string;
/**
 * Builds a regex pattern to match a specific "pattern" in tool arguments.
 * This is used to narrow tool approvals for search tools like glob/grep to specific patterns.
 *
 * @param pattern The pattern to match.
 * @returns A regex string that matches "pattern":"<pattern>" in a JSON string.
 */
export declare function buildPatternArgsPattern(pattern: string): string;
