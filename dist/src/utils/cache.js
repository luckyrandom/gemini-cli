/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * A generic caching service with TTL support.
 */
export class CacheService {
    storage;
    defaultTtl;
    deleteOnPromiseFailure;
    constructor(options = {}) {
        // Default to map for safety unless weakmap is explicitly requested.
        this.storage =
            options.storage === 'weakmap'
                ? new WeakMap()
                : new Map();
        this.defaultTtl = options.defaultTtl;
        this.deleteOnPromiseFailure = options.deleteOnPromiseFailure ?? true;
    }
    /**
     * Retrieves a value from the cache. Returns undefined if missing or expired.
     */
    get(key) {
        // We have to cast to Map or WeakMap specifically to call get()
        // but since they have the same signature for object keys, we can
        // safely cast to 'any' internally for the dispatch.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-type-assertion
        const entry = this.storage.get(key);
        if (!entry) {
            return undefined;
        }
        const ttl = entry.ttl ?? this.defaultTtl;
        if (ttl !== undefined && Date.now() - entry.timestamp > ttl) {
            this.delete(key);
            return undefined;
        }
        return entry.value;
    }
    /**
     * Stores a value in the cache.
     */
    set(key, value, ttl) {
        const entry = {
            value,
            timestamp: Date.now(),
            ttl,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-type-assertion
        this.storage.set(key, entry);
        if (this.deleteOnPromiseFailure && value instanceof Promise) {
            value.catch(() => {
                // Only delete if this exact entry is still in the cache
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-type-assertion
                if (this.storage.get(key) === entry) {
                    this.delete(key);
                }
            });
        }
    }
    /**
     * Helper to retrieve a value or create it if missing/expired.
     */
    getOrCreate(key, creator, ttl) {
        let value = this.get(key);
        if (value === undefined) {
            value = creator();
            this.set(key, value, ttl);
        }
        return value;
    }
    /**
     * Removes an entry from the cache.
     */
    delete(key) {
        if (this.storage instanceof Map) {
            this.storage.delete(key);
        }
        else {
            // WeakMap.delete returns a boolean, we can ignore it.
            // Cast to any to bypass the WeakKey constraint since we've already
            // confirmed the storage type.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-type-assertion
            this.storage.delete(key);
        }
    }
    /**
     * Clears all entries. Only supported if using Map storage.
     */
    clear() {
        if (this.storage instanceof Map) {
            this.storage.clear();
        }
        else {
            throw new Error('clear() is not supported on WeakMap storage');
        }
    }
}
export function createCache(options = {}) {
    return new CacheService(options);
}
//# sourceMappingURL=cache.js.map