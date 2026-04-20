/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { z } from 'zod';
/**
 * Zod schema to validate that a module satisfies the Keychain interface.
 */
export const KeychainSchema = z.object({
    getPassword: z.function(),
    setPassword: z.function(),
    deletePassword: z.function(),
    findCredentials: z.function(),
});
export const KEYCHAIN_TEST_PREFIX = '__keychain_test__';
export const SECRET_PREFIX = '__secret__';
//# sourceMappingURL=keychainTypes.js.map