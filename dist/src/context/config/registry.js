/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Registry for validating declarative sidecar configuration schemas.
 * (Dynamic instantiation has been replaced by static ContextProfiles)
 */
export class ContextProcessorRegistry {
    processors = new Map();
    registerProcessor(def) {
        // Erasing the type.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        this.processors.set(def.id, def);
    }
    getSchema(id) {
        return this.processors.get(id)?.schema;
    }
    getSchemaDefs() {
        const defs = [];
        for (const def of this.processors.values()) {
            if (def.schema)
                defs.push({ id: def.id, schema: def.schema });
        }
        return defs;
    }
    clear() {
        this.processors.clear();
    }
}
//# sourceMappingURL=registry.js.map