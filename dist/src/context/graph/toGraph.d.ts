/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Content } from '@google/genai';
import type { Episode } from './types.js';
import type { ContextTokenCalculator } from '../utils/contextTokenCalculator.js';
export declare function getStableId(obj: object, nodeIdentityMap: WeakMap<object, string>): string;
export declare function toGraph(history: readonly Content[], tokenCalculator: ContextTokenCalculator, nodeIdentityMap: WeakMap<object, string>): Episode[];
