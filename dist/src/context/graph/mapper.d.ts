/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Content } from '@google/genai';
import type { Episode, ConcreteNode } from './types.js';
import type { ContextTokenCalculator } from '../utils/contextTokenCalculator.js';
import type { NodeBehaviorRegistry } from './behaviorRegistry.js';
export declare class ContextGraphMapper {
    private readonly registry;
    private readonly nodeIdentityMap;
    constructor(registry: NodeBehaviorRegistry);
    toGraph(history: readonly Content[], tokenCalculator: ContextTokenCalculator): Episode[];
    fromGraph(nodes: readonly ConcreteNode[]): Content[];
}
