/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface CacheEntry<V> {
    value: V;
    timestamp: number;
    ttl?: number;
}
export interface CacheOptions {
    /**
     * Default Time To Live in milliseconds.
     */
    defaultTtl?: number;
    /**
     * If true, and V is a Promise, the entry will be removed from the cache
     * if the promise rejects.
     */
    deleteOnPromiseFailure?: boolean;
    /**
     * The underlying storage mechanism.
     * Use 'weakmap' (default) for object keys to allow garbage collection.
     * Use 'map' if you need to use strings as keys or need the clear() method.
     */
    storage?: 'map' | 'weakmap';
}
/**
 * A generic caching service with TTL support.
 */
export declare class CacheService<K extends object | string | undefined, V> {
    private readonly storage;
    private readonly defaultTtl?;
    private readonly deleteOnPromiseFailure;
    constructor(options?: CacheOptions);
    /**
     * Retrieves a value from the cache. Returns undefined if missing or expired.
     */
    get(key: K): V | undefined;
    /**
     * Stores a value in the cache.
     */
    set(key: K, value: V, ttl?: number): void;
    /**
     * Helper to retrieve a value or create it if missing/expired.
     */
    getOrCreate(key: K, creator: () => V, ttl?: number): V;
    /**
     * Removes an entry from the cache.
     */
    delete(key: K): void;
    /**
     * Clears all entries. Only supported if using Map storage.
     */
    clear(): void;
}
/**
 * Factory function to create a new cache.
 */
export declare function createCache<K extends string | undefined, V>(options: CacheOptions & {
    storage: 'map';
}): CacheService<K, V>;
export declare function createCache<K extends object, V>(options?: CacheOptions): CacheService<K, V>;
