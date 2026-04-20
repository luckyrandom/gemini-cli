/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Part } from '@google/genai';
import type { ConcreteNode } from '../graph/types.js';
import type { NodeBehaviorRegistry } from '../graph/behaviorRegistry.js';
/**
 * The flat token cost assigned to a single multi-modal asset (like an image tile)
 * by the Gemini API. We use this as a baseline heuristic for inlineData/fileData.
 */
export declare class ContextTokenCalculator {
    private readonly charsPerToken;
    private readonly registry;
    private readonly tokenCache;
    constructor(charsPerToken: number, registry: NodeBehaviorRegistry);
    /**
     * Estimates tokens for a simple string based on character count.
     * Fast, but inherently inaccurate compared to real model tokenization.
     */
    estimateTokensForString(text: string): number;
    /**
     * Fast, simple heuristic conversion from tokens to expected character length.
     * Useful for calculating truncation thresholds.
     */
    tokensToChars(tokens: number): number;
    /**
     * Pre-calculates and caches the token cost of a newly minted node.
     * Because nodes are immutable, this cost never changes for this node ID.
     */
    /**
     * Removes cached token counts for any nodes that are no longer in the given live set.
     * This prevents unbounded memory growth during long sessions.
     */
    garbageCollectCache(liveNodeIds: ReadonlySet<string>): void;
    cacheNodeTokens(node: ConcreteNode): number;
    /**
     * Retrieves the token cost of a single node from the cache.
     * If it misses the cache, it computes it and caches it.
     */
    getTokenCost(node: ConcreteNode): number;
    /**
     * Fast calculation for a flat array of ConcreteNodes (The Nodes).
     * It relies entirely on the O(1) sidecar token cache.
     */
    calculateConcreteListTokens(nodes: readonly ConcreteNode[]): number;
    /**
     * Slower, precise estimation for a Gemini Content/Part graph.
     * Deeply inspects the nested structure and uses the base tokenization math.
     */
    estimateTokensForParts(parts: Part[], depth?: number): number;
}
