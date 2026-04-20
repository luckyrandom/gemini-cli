/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ConcreteNode } from '../graph/types.js';
import type { ContextEnvironment } from '../pipeline/environment.js';
export declare class SnapshotGenerator {
    private readonly env;
    constructor(env: ContextEnvironment);
    synthesizeSnapshot(nodes: readonly ConcreteNode[], systemInstruction?: string): Promise<string>;
}
