/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Content } from '@google/genai';
import type { ConcreteNode } from './types.js';
import type { NodeBehaviorRegistry } from './behaviorRegistry.js';
export declare function fromGraph(nodes: readonly ConcreteNode[], registry: NodeBehaviorRegistry): Content[];
