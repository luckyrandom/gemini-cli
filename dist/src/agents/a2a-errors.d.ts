/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Custom error types for A2A remote agent operations.
 * Provides structured, user-friendly error messages for common failure modes
 * during agent card fetching, authentication, and communication.
 */
/**
 * Base class for all A2A agent errors.
 * Provides a `userMessage` field with a human-readable description.
 */
export declare class A2AAgentError extends Error {
    /** A user-friendly message suitable for display in the CLI. */
    readonly userMessage: string;
    /** The agent name associated with this error. */
    readonly agentName: string;
    constructor(agentName: string, message: string, userMessage: string, options?: ErrorOptions);
}
/**
 * Thrown when the agent card URL returns a 404 Not Found response.
 */
export declare class AgentCardNotFoundError extends A2AAgentError {
    constructor(agentName: string, agentCardUrl: string);
}
/**
 * Thrown when the agent card URL returns a 401/403 response,
 * indicating an authentication or authorization failure.
 */
export declare class AgentCardAuthError extends A2AAgentError {
    readonly statusCode: number;
    constructor(agentName: string, agentCardUrl: string, statusCode: 401 | 403);
}
/**
 * Thrown when the agent card's security schemes require authentication
 * but the agent definition does not include the necessary auth configuration.
 */
export declare class AgentAuthConfigMissingError extends A2AAgentError {
    /** Human-readable description of required authentication schemes. */
    readonly requiredAuth: string;
    /** Specific fields or config entries that are missing. */
    readonly missingFields: string[];
    constructor(agentName: string, requiredAuth: string, missingFields: string[]);
}
/**
 * Thrown when a generic/unexpected network or server error occurs
 * while fetching the agent card or communicating with the remote agent.
 */
export declare class AgentConnectionError extends A2AAgentError {
    constructor(agentName: string, agentCardUrl: string, cause: unknown);
}
/**
 * Attempts to classify a raw error from the A2A SDK into a typed A2AAgentError.
 *
 * Inspects the error message and full cause chain for HTTP status codes and
 * well-known patterns to produce a structured, user-friendly error.
 *
 * @param agentName The name of the agent being loaded.
 * @param agentCardUrl The URL of the agent card.
 * @param error The raw error caught during agent loading.
 * @returns A classified A2AAgentError subclass.
 */
export declare function classifyAgentError(agentName: string, agentCardUrl: string, error: unknown): A2AAgentError;
