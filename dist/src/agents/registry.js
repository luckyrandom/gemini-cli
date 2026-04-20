/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as crypto from 'node:crypto';
import { Storage } from '../config/storage.js';
import { CoreEvent, coreEvents } from '../utils/events.js';
import { getAgentCardLoadOptions, getRemoteAgentTargetUrl } from './types.js';
import { loadAgentsFromDirectory } from './agentLoader.js';
import { CodebaseInvestigatorAgent } from './codebase-investigator.js';
import { CliHelpAgent } from './cli-help-agent.js';
import { GeneralistAgent } from './generalist-agent.js';
import { BrowserAgentDefinition } from './browser/browserAgentDefinition.js';
import { MemoryManagerAgent } from './memory-manager-agent.js';
import { AgentTool } from './agent-tool.js';
import { A2AAuthProviderFactory } from './auth-provider/factory.js';
import {} from 'zod';
import { debugLogger } from '../utils/debugLogger.js';
import { isAutoModel } from '../config/models.js';
import { ModelConfigService, } from '../services/modelConfigService.js';
import { PolicyDecision, PRIORITY_SUBAGENT_TOOL } from '../policy/types.js';
import { A2AAgentError, AgentAuthConfigMissingError } from './a2a-errors.js';
/**
 * Returns the model config alias for a given agent definition.
 */
export function getModelConfigAlias(definition) {
    return `${definition.name}-config`;
}
export const DYNAMIC_RULE_SOURCE = 'AgentRegistry (Dynamic)';
/**
 * Manages the discovery, loading, validation, and registration of
 * AgentDefinitions.
 */
export class AgentRegistry {
    config;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agents = new Map();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allDefinitions = new Map();
    initialized = false;
    constructor(config) {
        this.config = config;
    }
    /**
     * Discovers and loads agents.
     */
    async initialize() {
        if (this.initialized) {
            await this.loadAgents();
            return;
        }
        this.initialized = true;
        coreEvents.on(CoreEvent.ModelChanged, this.onModelChanged);
        await this.loadAgents();
    }
    onModelChanged = () => {
        this.refreshAgents('local').catch((e) => {
            debugLogger.error('[AgentRegistry] Failed to refresh agents on model change:', e);
        });
    };
    /**
     * Clears the current registry and re-scans for agents.
     */
    async reload() {
        this.config.getA2AClientManager()?.clearCache();
        await this.config.reloadAgents();
        this.agents.clear();
        this.allDefinitions.clear();
        await this.loadAgents();
        coreEvents.emitAgentsRefreshed();
    }
    /**
     * Acknowledges and registers a previously unacknowledged agent.
     */
    async acknowledgeAgent(agent) {
        const ackService = this.config.getAcknowledgedAgentsService();
        const projectRoot = this.config.getProjectRoot();
        if (agent.metadata?.hash) {
            await ackService.acknowledge(projectRoot, agent.name, agent.metadata.hash);
            await this.registerAgent(agent);
            coreEvents.emitAgentsRefreshed();
        }
    }
    /**
     * Disposes of resources and removes event listeners.
     */
    dispose() {
        coreEvents.off(CoreEvent.ModelChanged, this.onModelChanged);
    }
    async loadAgents() {
        this.agents.clear();
        this.allDefinitions.clear();
        this.loadBuiltInAgents();
        // Clear old dynamic rules before reloading
        this.config.getPolicyEngine()?.removeRulesBySource(DYNAMIC_RULE_SOURCE);
        if (!this.config.isAgentsEnabled()) {
            return;
        }
        // Load user-level agents: ~/.gemini/agents/
        const userAgentsDir = Storage.getUserAgentsDir();
        const userAgents = await loadAgentsFromDirectory(userAgentsDir);
        for (const error of userAgents.errors) {
            debugLogger.warn(`[AgentRegistry] Error loading user agent: ${error.message}`);
            coreEvents.emitFeedback('error', `Agent loading error: ${error.message}`);
        }
        await Promise.allSettled(userAgents.agents.map(async (agent) => {
            try {
                await this.registerAgent(agent);
            }
            catch (e) {
                debugLogger.warn(`[AgentRegistry] Error registering user agent "${agent.name}":`, e);
                coreEvents.emitFeedback('error', `Error registering user agent "${agent.name}": ${e instanceof Error ? e.message : String(e)}`);
            }
        }));
        // Load project-level agents: .gemini/agents/ (relative to Project Root)
        const folderTrustEnabled = this.config.getFolderTrust();
        const isTrustedFolder = this.config.isTrustedFolder();
        if (!folderTrustEnabled || isTrustedFolder) {
            const projectAgentsDir = this.config.storage.getProjectAgentsDir();
            const projectAgents = await loadAgentsFromDirectory(projectAgentsDir);
            for (const error of projectAgents.errors) {
                coreEvents.emitFeedback('error', `Agent loading error: ${error.message}`);
            }
            const ackService = this.config.getAcknowledgedAgentsService();
            const projectRoot = this.config.getProjectRoot();
            const unacknowledgedAgents = [];
            const agentsToRegister = [];
            for (const agent of projectAgents.agents) {
                // If it's a remote agent, use the agentCardUrl as the hash.
                // This allows multiple remote agents in a single file to be tracked independently.
                if (agent.kind === 'remote') {
                    if (!agent.metadata) {
                        agent.metadata = {};
                    }
                    agent.metadata.hash =
                        agent.agentCardUrl ??
                            (agent.agentCardJson
                                ? crypto
                                    .createHash('sha256')
                                    .update(agent.agentCardJson)
                                    .digest('hex')
                                : undefined);
                }
                if (!agent.metadata?.hash) {
                    agentsToRegister.push(agent);
                    continue;
                }
                const isAcknowledged = await ackService.isAcknowledged(projectRoot, agent.name, agent.metadata.hash);
                if (isAcknowledged) {
                    agentsToRegister.push(agent);
                }
                else {
                    unacknowledgedAgents.push(agent);
                }
            }
            if (unacknowledgedAgents.length > 0) {
                coreEvents.emitAgentsDiscovered(unacknowledgedAgents);
            }
            await Promise.allSettled(agentsToRegister.map(async (agent) => {
                try {
                    await this.registerAgent(agent);
                }
                catch (e) {
                    debugLogger.warn(`[AgentRegistry] Error registering project agent "${agent.name}":`, e);
                    coreEvents.emitFeedback('error', `Error registering project agent "${agent.name}": ${e instanceof Error ? e.message : String(e)}`);
                }
            }));
        }
        else {
            coreEvents.emitFeedback('info', 'Skipping project agents due to untrusted folder. To enable, ensure that the project root is trusted.');
        }
        // Load agents from extensions
        for (const extension of this.config.getExtensions()) {
            if (extension.isActive && extension.agents) {
                await Promise.allSettled(extension.agents.map(async (agent) => {
                    try {
                        await this.registerAgent(agent);
                    }
                    catch (e) {
                        debugLogger.warn(`[AgentRegistry] Error registering extension agent "${agent.name}":`, e);
                        coreEvents.emitFeedback('error', `Error registering extension agent "${agent.name}": ${e instanceof Error ? e.message : String(e)}`);
                    }
                }));
            }
        }
        if (this.config.getDebugMode()) {
            debugLogger.log(`[AgentRegistry] Loaded with ${this.agents.size} agents.`);
        }
    }
    loadBuiltInAgents() {
        this.registerLocalAgent(CodebaseInvestigatorAgent(this.config));
        this.registerLocalAgent(CliHelpAgent(this.config));
        this.registerLocalAgent(GeneralistAgent(this.config));
        // Register the browser agent if enabled in settings.
        // Tools are configured dynamically at invocation time via browserAgentFactory.
        const browserConfig = this.config.getBrowserAgentConfig();
        if (browserConfig.enabled) {
            // In container sandboxes (Docker/Podman/gVisor/LXC), Chrome is not
            // available inside the container. The browser agent can only work with
            // sessionMode "existing" (connecting to a host Chrome instance).
            const sandboxType = process.env['SANDBOX'];
            const isContainerSandbox = !!sandboxType &&
                sandboxType !== 'sandbox-exec' &&
                sandboxType !== 'sandbox:none';
            const sessionMode = browserConfig.customConfig.sessionMode ?? 'persistent';
            if (isContainerSandbox && sessionMode !== 'existing') {
                coreEvents.emitFeedback('info', 'Browser agent disabled in container sandbox. ' +
                    'To use it, set sessionMode to "existing" in settings and start Chrome ' +
                    'with --remote-debugging-port=9222 on the host.');
            }
            else {
                this.registerLocalAgent(BrowserAgentDefinition(this.config));
            }
        }
        // Register the memory manager agent as a replacement for the save_memory tool.
        // The agent declares its own workspaceDirectories (e.g. ~/.gemini) which are
        // scoped to its execution via runWithScopedWorkspaceContext in LocalAgentExecutor,
        // keeping the main agent's workspace context clean.
        if (this.config.isMemoryManagerEnabled()) {
            this.registerLocalAgent(MemoryManagerAgent(this.config));
        }
    }
    async refreshAgents(scope = 'all') {
        this.loadBuiltInAgents();
        await Promise.allSettled(Array.from(this.agents.values()).map(async (agent) => {
            if (scope === 'all' || agent.kind === scope) {
                await this.registerAgent(agent);
            }
        }));
    }
    /**
     * Registers an agent definition. If an agent with the same name exists,
     * it will be overwritten, respecting the precedence established by the
     * initialization order.
     */
    async registerAgent(definition) {
        if (definition.kind === 'local') {
            this.registerLocalAgent(definition);
        }
        else if (definition.kind === 'remote') {
            await this.registerRemoteAgent(definition);
        }
    }
    /**
     * Registers a local agent definition synchronously.
     */
    registerLocalAgent(definition) {
        if (definition.kind !== 'local') {
            return;
        }
        // Basic validation
        if (!definition.name || !definition.description) {
            debugLogger.warn(`[AgentRegistry] Skipping invalid agent definition. Missing name or description.`);
            return;
        }
        this.allDefinitions.set(definition.name, definition);
        const settingsOverrides = this.config.getAgentsSettings().overrides?.[definition.name];
        if (!this.isAgentEnabled(definition, settingsOverrides)) {
            if (this.config.getDebugMode()) {
                debugLogger.log(`[AgentRegistry] Skipping disabled agent '${definition.name}'`);
            }
            return;
        }
        if (this.agents.has(definition.name) && this.config.getDebugMode()) {
            debugLogger.log(`[AgentRegistry] Overriding agent '${definition.name}'`);
        }
        const mergedDefinition = this.applyOverrides(definition, settingsOverrides);
        this.agents.set(mergedDefinition.name, mergedDefinition);
        this.registerModelConfigs(mergedDefinition);
        this.addAgentPolicy(mergedDefinition);
    }
    addAgentPolicy(definition) {
        const policyEngine = this.config.getPolicyEngine();
        if (!policyEngine) {
            return;
        }
        // If the user has explicitly defined a policy for this tool, respect it.
        // ignoreDynamic=true means we only check for rules NOT added by this registry.
        if (policyEngine.hasRuleForTool(definition.name, true)) {
            if (this.config.getDebugMode()) {
                debugLogger.log(`[AgentRegistry] User policy exists for '${definition.name}', skipping dynamic registration.`);
            }
            return;
        }
        // Only add override for remote agents. Local agents are handled by blanket allow.
        if (definition.kind === 'remote') {
            policyEngine.addRule({
                toolName: AgentTool.Name,
                argsPattern: new RegExp(`"agent_name":\\s*"${definition.name}"`),
                decision: PolicyDecision.ASK_USER,
                priority: PRIORITY_SUBAGENT_TOOL + 0.1, // Higher priority to override blanket allow
                source: DYNAMIC_RULE_SOURCE,
            });
        }
    }
    isAgentEnabled(definition, overrides) {
        const isExperimental = definition.experimental === true;
        let isEnabled = !isExperimental;
        if (overrides && overrides.enabled !== undefined) {
            isEnabled = overrides.enabled;
        }
        return isEnabled;
    }
    /**
     * Registers a remote agent definition asynchronously.
     * Provides robust error handling with user-friendly messages for:
     * - Agent card fetch failures (404, 401/403, network errors)
     * - Missing authentication configuration
     */
    async registerRemoteAgent(definition) {
        if (definition.kind !== 'remote') {
            return;
        }
        // Basic validation
        // Remote agents can have an empty description initially as it will be populated from the AgentCard
        if (!definition.name) {
            debugLogger.warn(`[AgentRegistry] Skipping invalid agent definition. Missing name.`);
            return;
        }
        this.allDefinitions.set(definition.name, definition);
        const overrides = this.config.getAgentsSettings().overrides?.[definition.name];
        if (!this.isAgentEnabled(definition, overrides)) {
            if (this.config.getDebugMode()) {
                debugLogger.log(`[AgentRegistry] Skipping disabled remote agent '${definition.name}'`);
            }
            return;
        }
        if (this.agents.has(definition.name) && this.config.getDebugMode()) {
            debugLogger.log(`[AgentRegistry] Overriding agent '${definition.name}'`);
        }
        const remoteDef = definition;
        // Capture the original description from the first registration
        if (remoteDef.originalDescription === undefined) {
            remoteDef.originalDescription = remoteDef.description;
        }
        // Load the remote A2A agent card and register.
        try {
            const clientManager = this.config.getA2AClientManager();
            if (!clientManager) {
                debugLogger.warn(`[AgentRegistry] Skipping remote agent '${definition.name}': A2AClientManager is not available.`);
                return;
            }
            const targetUrl = getRemoteAgentTargetUrl(remoteDef);
            let authHandler;
            if (definition.auth) {
                const provider = await A2AAuthProviderFactory.create({
                    authConfig: definition.auth,
                    agentName: definition.name,
                    targetUrl,
                    agentCardUrl: remoteDef.agentCardUrl,
                });
                if (!provider) {
                    throw new Error(`Failed to create auth provider for agent '${definition.name}'`);
                }
                authHandler = provider;
            }
            const agentCard = await clientManager.loadAgent(remoteDef.name, getAgentCardLoadOptions(remoteDef), authHandler);
            // Validate auth configuration against the agent card's security schemes.
            if (agentCard.securitySchemes) {
                const validation = A2AAuthProviderFactory.validateAuthConfig(definition.auth, agentCard.securitySchemes);
                if (!validation.valid && validation.diff) {
                    const requiredAuth = A2AAuthProviderFactory.describeRequiredAuth(agentCard.securitySchemes);
                    const authError = new AgentAuthConfigMissingError(definition.name, requiredAuth, validation.diff.missingConfig);
                    coreEvents.emitFeedback('warning', `[${definition.name}] Agent requires authentication: ${requiredAuth}`);
                    debugLogger.warn(`[AgentRegistry] ${authError.message}`);
                    // Still register the agent — the user can fix config and retry.
                }
            }
            const userDescription = remoteDef.originalDescription;
            const agentDescription = agentCard.description;
            const descriptions = [];
            if (userDescription?.trim()) {
                descriptions.push(`User Description: ${userDescription.trim()}`);
            }
            if (agentDescription?.trim()) {
                descriptions.push(`Agent Description: ${agentDescription.trim()}`);
            }
            if (agentCard.skills && agentCard.skills.length > 0) {
                const skillsList = agentCard.skills
                    .map((skill) => `${skill.name}: ${skill.description || 'No description provided'}`)
                    .join('\n');
                descriptions.push(`Skills:\n${skillsList}`);
            }
            if (descriptions.length > 0) {
                definition.description = descriptions.join('\n');
            }
            if (this.config.getDebugMode()) {
                debugLogger.log(`[AgentRegistry] Registered remote agent '${definition.name}' with card: ${definition.agentCardUrl ?? 'inline JSON'}`);
            }
            this.agents.set(definition.name, definition);
            this.addAgentPolicy(definition);
        }
        catch (e) {
            // Surface structured, user-friendly error messages for known failure modes.
            if (e instanceof A2AAgentError) {
                coreEvents.emitFeedback('error', `[${definition.name}] ${e.userMessage}`);
            }
            else {
                coreEvents.emitFeedback('error', `[${definition.name}] Failed to load remote agent: ${e instanceof Error ? e.message : String(e)}`);
            }
            debugLogger.warn(`[AgentRegistry] Error loading A2A agent "${definition.name}":`, e);
        }
    }
    applyOverrides(definition, overrides) {
        if (definition.kind !== 'local' || !overrides) {
            return definition;
        }
        // Preserve lazy getters on the definition object by wrapping in a new object with getters
        const merged = {
            get kind() {
                return definition.kind;
            },
            get name() {
                return definition.name;
            },
            get displayName() {
                return definition.displayName;
            },
            get description() {
                return definition.description;
            },
            get experimental() {
                return definition.experimental;
            },
            get metadata() {
                return definition.metadata;
            },
            get inputConfig() {
                return definition.inputConfig;
            },
            get outputConfig() {
                return definition.outputConfig;
            },
            get promptConfig() {
                return definition.promptConfig;
            },
            get toolConfig() {
                return definition.toolConfig;
            },
            get processOutput() {
                return definition.processOutput;
            },
            get runConfig() {
                return overrides.runConfig
                    ? { ...definition.runConfig, ...overrides.runConfig }
                    : definition.runConfig;
            },
            get modelConfig() {
                return overrides.modelConfig
                    ? ModelConfigService.merge(definition.modelConfig, overrides.modelConfig)
                    : definition.modelConfig;
            },
        };
        if (overrides.tools) {
            merged.toolConfig = {
                tools: overrides.tools,
            };
        }
        if (overrides.mcpServers) {
            merged.mcpServers = {
                ...definition.mcpServers,
                ...overrides.mcpServers,
            };
        }
        return merged;
    }
    registerModelConfigs(definition) {
        const modelConfig = definition.modelConfig;
        let model = modelConfig.model;
        if (model === 'inherit') {
            model = this.config.getModel();
        }
        const agentModelConfig = {
            ...modelConfig,
            model,
        };
        this.config.modelConfigService.registerRuntimeModelConfig(getModelConfigAlias(definition), {
            modelConfig: agentModelConfig,
        });
        if (agentModelConfig.model && isAutoModel(agentModelConfig.model)) {
            this.config.modelConfigService.registerRuntimeModelOverride({
                match: {
                    overrideScope: definition.name,
                },
                modelConfig: {
                    generateContentConfig: agentModelConfig.generateContentConfig,
                },
            });
        }
    }
    /**
     * Retrieves an agent definition by name.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getDefinition(name) {
        return this.agents.get(name);
    }
    /**
     * Returns all active agent definitions.
     */
    getAllDefinitions() {
        return Array.from(this.agents.values());
    }
    /**
     * Returns a list of all registered agent names.
     */
    getAllAgentNames() {
        return Array.from(this.agents.keys());
    }
    /**
     * Returns a list of all discovered agent names, regardless of whether they are enabled.
     */
    getAllDiscoveredAgentNames() {
        return Array.from(this.allDefinitions.keys());
    }
    /**
     * Retrieves a discovered agent definition by name.
     */
    getDiscoveredDefinition(name) {
        return this.allDefinitions.get(name);
    }
}
//# sourceMappingURL=registry.js.map