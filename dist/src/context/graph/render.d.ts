/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Content } from '@google/genai';
import type { ConcreteNode } from './types.js';
import type { ContextEnvironment, ContextTracer } from '../pipeline/environment.js';
import type { PipelineOrchestrator } from '../pipeline/orchestrator.js';
import type { ContextProfile } from '../config/profiles.js';
/**
 * Orchestrates the final render: takes a working buffer view (The Nodes),
 * applies the Immediate Sanitization pipeline, and enforces token boundaries.
 */
export declare function render(nodes: readonly ConcreteNode[], orchestrator: PipelineOrchestrator, sidecar: ContextProfile, tracer: ContextTracer, env: ContextEnvironment, protectedIds: Set<string>): Promise<Content[]>;
