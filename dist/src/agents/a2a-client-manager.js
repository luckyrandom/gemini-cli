/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { ClientFactory, ClientFactoryOptions, DefaultAgentCardResolver, JsonRpcTransportFactory, RestTransportFactory, createAuthenticatingFetchWithRetry, } from '@a2a-js/sdk/client';
import { GrpcTransportFactory } from '@a2a-js/sdk/client/grpc';
import * as grpc from '@grpc/grpc-js';
import { v4 as uuidv4 } from 'uuid';
import { Agent as UndiciAgent, ProxyAgent } from 'undici';
import { normalizeAgentCard } from './a2aUtils.js';
import { debugLogger } from '../utils/debugLogger.js';
import { classifyAgentError } from './a2a-errors.js';
// Remote agents can take 10+ minutes (e.g. Deep Research).
// Use a dedicated dispatcher so the global 5-min timeout isn't affected.
const A2A_TIMEOUT = 1800000; // 30 minutes
/**
 * Orchestrates communication with remote A2A agents.
 * Manages protocol negotiation, authentication, and transport selection.
 */
export class A2AClientManager {
    config;
    // Each agent should manage their own context/taskIds/card/etc
    clients = new Map();
    agentCards = new Map();
    a2aDispatcher;
    a2aFetch;
    constructor(config) {
        this.config = config;
        const proxyUrl = this.config.getProxy();
        const agentOptions = {
            headersTimeout: A2A_TIMEOUT,
            bodyTimeout: A2A_TIMEOUT,
        };
        if (proxyUrl) {
            this.a2aDispatcher = new ProxyAgent({
                uri: proxyUrl,
                ...agentOptions,
            });
        }
        else {
            this.a2aDispatcher = new UndiciAgent(agentOptions);
        }
        this.a2aFetch = (input, init) => fetch(input, { ...init, dispatcher: this.a2aDispatcher });
    }
    /**
     * Loads an agent by fetching its AgentCard and caches the client.
     * @param name The name to assign to the agent.
     * @param agentCardUrl The full URL to the agent's card.
     * @param authHandler Optional authentication handler to use for this agent.
     * @returns The loaded AgentCard.
     */
    async loadAgent(name, options, authHandler) {
        if (this.clients.has(name) && this.agentCards.has(name)) {
            throw new Error(`Agent with name '${name}' is already loaded.`);
        }
        // Authenticated fetch for API calls (transports).
        let authFetch = this.a2aFetch;
        if (authHandler) {
            authFetch = createAuthenticatingFetchWithRetry(this.a2aFetch, authHandler);
        }
        // Use unauthenticated fetch for the agent card unless explicitly required.
        // Some servers reject unexpected auth headers on the card endpoint (e.g. 400).
        const cardFetch = async (input, init) => {
            // Try without auth first
            const response = await this.a2aFetch(input, init);
            // Retry with auth if we hit a 401/403
            if ((response.status === 401 || response.status === 403) && authFetch) {
                return authFetch(input, init);
            }
            return response;
        };
        const resolver = new DefaultAgentCardResolver({ fetchImpl: cardFetch });
        let rawCard;
        let urlIdentifier = 'inline JSON';
        if (options.type === 'json') {
            try {
                rawCard = JSON.parse(options.json);
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to parse inline agent card JSON for agent '${name}': ${msg}`);
            }
        }
        else {
            urlIdentifier = options.url;
            rawCard = await resolver.resolve(options.url, '');
        }
        // TODO: Remove normalizeAgentCard once @a2a-js/sdk handles
        // proto field name aliases (supportedInterfaces → additionalInterfaces,
        // protocolBinding → transport).
        const agentCard = normalizeAgentCard(rawCard);
        const grpcUrl = agentCard.additionalInterfaces?.find((i) => i.transport === 'GRPC')
            ?.url ?? agentCard.url;
        const clientOptions = ClientFactoryOptions.createFrom(ClientFactoryOptions.default, {
            transports: [
                new RestTransportFactory({ fetchImpl: authFetch }),
                new JsonRpcTransportFactory({ fetchImpl: authFetch }),
                new GrpcTransportFactory({
                    grpcChannelCredentials: grpcUrl.startsWith('https://')
                        ? grpc.credentials.createSsl()
                        : grpc.credentials.createInsecure(),
                }),
            ],
            cardResolver: resolver,
        });
        try {
            const factory = new ClientFactory(clientOptions);
            const client = await factory.createFromAgentCard(agentCard);
            this.clients.set(name, client);
            this.agentCards.set(name, agentCard);
            debugLogger.debug(`[A2AClientManager] Loaded agent '${name}' from ${urlIdentifier}`);
            return agentCard;
        }
        catch (error) {
            throw classifyAgentError(name, urlIdentifier, error);
        }
    }
    /**
     * Invalidates all cached clients and agent cards.
     */
    clearCache() {
        this.clients.clear();
        this.agentCards.clear();
        debugLogger.debug('[A2AClientManager] Cache cleared.');
    }
    /**
     * Sends a message to a loaded agent and returns a stream of responses.
     * @param agentName The name of the agent to send the message to.
     * @param message The message content.
     * @param options Optional context and task IDs to maintain conversation state.
     * @returns An async iterable of responses from the agent (Message or Task).
     * @throws Error if the agent returns an error response.
     */
    async *sendMessageStream(agentName, message, options) {
        const client = this.clients.get(agentName);
        if (!client)
            throw new Error(`Agent '${agentName}' not found.`);
        const messageParams = {
            message: {
                kind: 'message',
                role: 'user',
                messageId: uuidv4(),
                parts: [{ kind: 'text', text: message }],
                contextId: options?.contextId,
                taskId: options?.taskId,
            },
        };
        try {
            yield* client.sendMessageStream(messageParams, {
                signal: options?.signal,
            });
        }
        catch (error) {
            const prefix = `[A2AClientManager] sendMessageStream Error [${agentName}]`;
            if (error instanceof Error) {
                throw new Error(`${prefix}: ${error.message}`, { cause: error });
            }
            throw new Error(`${prefix}: Unexpected error during sendMessageStream: ${String(error)}`);
        }
    }
    /**
     * Retrieves a loaded agent card.
     * @param name The name of the agent.
     * @returns The agent card, or undefined if not found.
     */
    getAgentCard(name) {
        return this.agentCards.get(name);
    }
    /**
     * Retrieves a loaded client.
     * @param name The name of the agent.
     * @returns The client, or undefined if not found.
     */
    getClient(name) {
        return this.clients.get(name);
    }
    /**
     * Retrieves a task from an agent.
     * @param agentName The name of the agent.
     * @param taskId The ID of the task to retrieve.
     * @returns The task details.
     */
    async getTask(agentName, taskId) {
        const client = this.clients.get(agentName);
        if (!client)
            throw new Error(`Agent '${agentName}' not found.`);
        try {
            return await client.getTask({ id: taskId });
        }
        catch (error) {
            const prefix = `A2AClient getTask Error [${agentName}]`;
            if (error instanceof Error) {
                throw new Error(`${prefix}: ${error.message}`, { cause: error });
            }
            throw new Error(`${prefix}: Unexpected error: ${String(error)}`);
        }
    }
    /**
     * Cancels a task on an agent.
     * @param agentName The name of the agent.
     * @param taskId The ID of the task to cancel.
     * @returns The cancellation response.
     */
    async cancelTask(agentName, taskId) {
        const client = this.clients.get(agentName);
        if (!client)
            throw new Error(`Agent '${agentName}' not found.`);
        try {
            return await client.cancelTask({ id: taskId });
        }
        catch (error) {
            const prefix = `A2AClient cancelTask Error [${agentName}]`;
            if (error instanceof Error) {
                throw new Error(`${prefix}: ${error.message}`, { cause: error });
            }
            throw new Error(`${prefix}: Unexpected error: ${String(error)}`);
        }
    }
}
//# sourceMappingURL=a2a-client-manager.js.map