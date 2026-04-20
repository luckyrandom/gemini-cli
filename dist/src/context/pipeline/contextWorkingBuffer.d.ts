/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ContextWorkingBuffer, GraphMutation } from '../pipeline.js';
import type { ConcreteNode } from '../graph/types.js';
export declare class ContextWorkingBufferImpl implements ContextWorkingBuffer {
    readonly nodes: readonly ConcreteNode[];
    private readonly provenanceMap;
    private readonly pristineNodesMap;
    private readonly history;
    private constructor();
    /**
     * Initializes a brand new ContextWorkingBuffer from a pristine graph.
     * Every node's provenance points to itself.
     */
    static initialize(pristineNodes: readonly ConcreteNode[]): ContextWorkingBufferImpl;
    /**
     * Appends newly observed pristine nodes (e.g. from a user message) to the working buffer.
     * Ensures they are tracked in the pristine map and point to themselves in provenance.
     */
    appendPristineNodes(newNodes: readonly ConcreteNode[]): ContextWorkingBufferImpl;
    /**
     * Generates an entirely new buffer instance by calculating the delta between the processor's input and output.
     */
    applyProcessorResult(processorId: string, inputTargets: readonly ConcreteNode[], outputNodes: readonly ConcreteNode[]): ContextWorkingBufferImpl;
    /** Removes nodes from the working buffer that were completely dropped from the upstream pristine history */
    prunePristineNodes(retainedIds: ReadonlySet<string>): ContextWorkingBufferImpl;
    getPristineNodes(id: string): readonly ConcreteNode[];
    getAuditLog(): readonly GraphMutation[];
    getLineage(id: string): readonly ConcreteNode[];
}
