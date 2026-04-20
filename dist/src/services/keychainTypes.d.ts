/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { z } from 'zod';
/**
 * Interface for OS-level secure storage operations.
 * Note: Method names must match the underlying library (e.g. @github/keytar)
 * to support correct dynamic loading and schema validation.
 */
export interface Keychain {
    getPassword(service: string, account: string): Promise<string | null>;
    setPassword(service: string, account: string, password: string): Promise<void>;
    deletePassword(service: string, account: string): Promise<boolean>;
    findCredentials(service: string): Promise<Array<{
        account: string;
        password: string;
    }>>;
}
/**
 * Zod schema to validate that a module satisfies the Keychain interface.
 */
export declare const KeychainSchema: z.ZodObject<{
    getPassword: z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>;
    setPassword: z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>;
    deletePassword: z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>;
    findCredentials: z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    getPassword: (...args: unknown[]) => unknown;
    setPassword: (...args: unknown[]) => unknown;
    deletePassword: (...args: unknown[]) => unknown;
    findCredentials: (...args: unknown[]) => unknown;
}, {
    getPassword: (...args: unknown[]) => unknown;
    setPassword: (...args: unknown[]) => unknown;
    deletePassword: (...args: unknown[]) => unknown;
    findCredentials: (...args: unknown[]) => unknown;
}>;
export declare const KEYCHAIN_TEST_PREFIX = "__keychain_test__";
export declare const SECRET_PREFIX = "__secret__";
