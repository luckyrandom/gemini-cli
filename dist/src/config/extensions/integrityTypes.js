/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { z } from 'zod';
import {} from '../config.js';
/**
 * Zod schema for a single extension's integrity data.
 */
export const ExtensionIntegrityDataSchema = z.object({
    hash: z.string(),
    signature: z.string(),
});
/**
 * Zod schema for the map of extension names to integrity data.
 */
export const ExtensionIntegrityMapSchema = z.record(z.string(), ExtensionIntegrityDataSchema);
/**
 * Zod schema for the full integrity store file structure.
 */
export const IntegrityStoreSchema = z.object({
    store: ExtensionIntegrityMapSchema,
    signature: z.string(),
});
/**
 * Result status of an extension integrity verification.
 */
export var IntegrityDataStatus;
(function (IntegrityDataStatus) {
    IntegrityDataStatus["VERIFIED"] = "verified";
    IntegrityDataStatus["MISSING"] = "missing";
    IntegrityDataStatus["INVALID"] = "invalid";
})(IntegrityDataStatus || (IntegrityDataStatus = {}));
//# sourceMappingURL=integrityTypes.js.map