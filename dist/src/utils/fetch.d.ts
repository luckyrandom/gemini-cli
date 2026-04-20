/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { ProxyAgent } from 'undici';
export declare class FetchError extends Error {
    code?: string | undefined;
    constructor(message: string, code?: string | undefined, options?: ErrorOptions);
}
export declare class PrivateIpError extends Error {
    constructor(message?: string);
}
export declare function updateGlobalFetchTimeouts(timeoutMs: number): void;
/**
 * Sanitizes a hostname by stripping IPv6 brackets if present.
 */
export declare function sanitizeHostname(hostname: string): string;
/**
 * Checks if a hostname is a local loopback address allowed for development/testing.
 */
export declare function isLoopbackHost(hostname: string): boolean;
export declare function isPrivateIp(url: string): boolean;
/**
 * Internal helper to check if an IP address string is in a private or reserved range.
 */
export declare function isAddressPrivate(address: string): boolean;
/**
 * Checks if a URL resolves to a private IP address.
 */
export declare function isPrivateIpAsync(url: string): Promise<boolean>;
/**
 * Creates an undici ProxyAgent that incorporates safe DNS lookup.
 */
export declare function createSafeProxyAgent(proxyUrl: string): ProxyAgent;
export declare function fetchWithTimeout(url: string, timeout: number, options?: RequestInit): Promise<Response>;
export declare function setGlobalProxy(proxy: string): void;
