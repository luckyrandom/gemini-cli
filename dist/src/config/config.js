/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SandboxPolicyManager } from '../policy/sandboxPolicyManager.js';
import { inspect } from 'node:util';
import process from 'node:process';
import { z } from 'zod';
import { AuthType, createContentGenerator, createContentGeneratorConfig, } from '../core/contentGenerator.js';
import { PromptRegistry } from '../prompts/prompt-registry.js';
import { ResourceRegistry } from '../resources/resource-registry.js';
import { ToolRegistry } from '../tools/tool-registry.js';
import { LSTool } from '../tools/ls.js';
import { ReadFileTool } from '../tools/read-file.js';
import { ReadMcpResourceTool } from '../tools/read-mcp-resource.js';
import { ListMcpResourcesTool } from '../tools/list-mcp-resources.js';
import { GrepTool } from '../tools/grep.js';
import { canUseRipgrep, RipGrepTool } from '../tools/ripGrep.js';
import { GlobTool } from '../tools/glob.js';
import { ActivateSkillTool } from '../tools/activate-skill.js';
import { EditTool } from '../tools/edit.js';
import { ShellTool } from '../tools/shell.js';
import { WriteFileTool } from '../tools/write-file.js';
import { WebFetchTool } from '../tools/web-fetch.js';
import { MemoryTool, setGeminiMdFilename } from '../tools/memoryTool.js';
import { WebSearchTool } from '../tools/web-search.js';
import { AskUserTool } from '../tools/ask-user.js';
import { UpdateTopicTool } from '../tools/topicTool.js';
import { TopicState } from './topicState.js';
import { AgentTool } from '../agents/agent-tool.js';
import { ExitPlanModeTool } from '../tools/exit-plan-mode.js';
import { EnterPlanModeTool } from '../tools/enter-plan-mode.js';
import { ListBackgroundProcessesTool, ReadBackgroundOutputTool, } from '../tools/shellBackgroundTools.js';
import { GeminiClient } from '../core/client.js';
import { BaseLlmClient } from '../core/baseLlmClient.js';
import { LocalLiteRtLmClient } from '../core/localLiteRtLmClient.js';
import { FileDiscoveryService } from '../services/fileDiscoveryService.js';
import { GitService } from '../services/gitService.js';
import { NoopSandboxManager, } from '../services/sandboxManager.js';
import { createSandboxManager } from '../services/sandboxManagerFactory.js';
import { SandboxedFileSystemService } from '../services/sandboxedFileSystemService.js';
import { initializeTelemetry, DEFAULT_TELEMETRY_TARGET, DEFAULT_OTLP_ENDPOINT, uiTelemetryService, } from '../telemetry/index.js';
import { coreEvents, CoreEvent } from '../utils/events.js';
import { tokenLimit } from '../core/tokenLimits.js';
import { DEFAULT_GEMINI_EMBEDDING_MODEL, DEFAULT_GEMINI_FLASH_MODEL, DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_MODEL_AUTO, isAutoModel, isPreviewModel, isGemini2Model, PREVIEW_GEMINI_FLASH_MODEL, PREVIEW_GEMINI_MODEL, PREVIEW_GEMINI_MODEL_AUTO, resolveModel, } from './models.js';
import { shouldAttemptBrowserLaunch } from '../utils/browser.js';
import { ideContextStore } from '../ide/ideContext.js';
import { WriteTodosTool } from '../tools/write-todos.js';
import { StandardFileSystemService, } from '../services/fileSystemService.js';
import { TrackerCreateTaskTool, TrackerUpdateTaskTool, TrackerGetTaskTool, TrackerListTasksTool, TrackerAddDependencyTool, TrackerVisualizeTool, } from '../tools/trackerTools.js';
import { logRipgrepFallback, logFlashFallback, logApprovalModeSwitch, logApprovalModeDuration, } from '../telemetry/loggers.js';
import { RipgrepFallbackEvent, FlashFallbackEvent, ApprovalModeSwitchEvent, ApprovalModeDurationEvent, } from '../telemetry/types.js';
import { ModelAvailabilityService } from '../availability/modelAvailabilityService.js';
import { ModelRouterService } from '../routing/modelRouterService.js';
import { OutputFormat } from '../output/types.js';
import { ModelConfigService, } from '../services/modelConfigService.js';
import { DEFAULT_MODEL_CONFIGS } from './defaultModelConfigs.js';
import { MemoryContextManager } from '../context/memoryContextManager.js';
import { TrackerService } from '../services/trackerService.js';
import { WorkspaceContext } from '../utils/workspaceContext.js';
import { getWorkspaceContextOverride } from './scoped-config.js';
import { Storage } from './storage.js';
import { FileExclusions } from '../utils/ignorePatterns.js';
import { MessageBus } from '../confirmation-bus/message-bus.js';
import { PolicyEngine } from '../policy/policy-engine.js';
import { ApprovalMode, } from '../policy/types.js';
import { HookSystem } from '../hooks/index.js';
import { getCodeAssistServer } from '../code_assist/codeAssist.js';
import { getExperiments, } from '../code_assist/experiments/experiments.js';
import { AgentRegistry } from '../agents/registry.js';
import { AcknowledgedAgentsService } from '../agents/acknowledgedAgents.js';
import { setGlobalProxy, updateGlobalFetchTimeouts } from '../utils/fetch.js';
import { ExperimentFlags } from '../code_assist/experiments/flagNames.js';
import { debugLogger } from '../utils/debugLogger.js';
import { SkillManager } from '../skills/skillManager.js';
import { startupProfiler } from '../telemetry/startupProfiler.js';
import { fetchAdminControls } from '../code_assist/admin/admin_controls.js';
import { isSubpath, resolveToRealPath } from '../utils/paths.js';
import { InjectionService } from './injectionService.js';
import { ExecutionLifecycleService } from '../services/executionLifecycleService.js';
import { WORKSPACE_POLICY_TIER } from '../policy/config.js';
import { loadPoliciesFromToml } from '../policy/toml-loader.js';
import { CheckerRunner } from '../safety/checker-runner.js';
import { ContextBuilder } from '../safety/context-builder.js';
import { CheckerRegistry } from '../safety/registry.js';
import { ConsecaSafetyChecker } from '../safety/conseca/conseca.js';
import { DEFAULT_MAX_ATTEMPTS } from '../utils/retry.js';
import { DEFAULT_FILE_FILTERING_OPTIONS, DEFAULT_MEMORY_FILE_FILTERING_OPTIONS, } from './constants.js';
import { DEFAULT_TOOL_PROTECTION_THRESHOLD, DEFAULT_MIN_PRUNABLE_TOKENS_THRESHOLD, DEFAULT_PROTECT_LATEST_TURN, } from '../context/toolOutputMaskingService.js';
import { SimpleExtensionLoader, } from '../utils/extensionLoader.js';
import { McpClientManager } from '../tools/mcp-client-manager.js';
import { A2AClientManager } from '../agents/a2a-client-manager.js';
import {} from '../tools/mcp-client.js';
export { DEFAULT_FILE_FILTERING_OPTIONS, DEFAULT_MEMORY_FILE_FILTERING_OPTIONS, };
export const DEFAULT_TRUNCATE_TOOL_OUTPUT_THRESHOLD = 40_000;
export class MCPServerConfig {
    command;
    args;
    env;
    cwd;
    url;
    httpUrl;
    headers;
    tcp;
    type;
    timeout;
    trust;
    description;
    includeTools;
    excludeTools;
    extension;
    oauth;
    authProviderType;
    targetAudience;
    targetServiceAccount;
    constructor(
    // For stdio transport
    command, args, env, cwd, 
    // For sse transport
    url, 
    // For streamable http transport
    httpUrl, headers, 
    // For websocket transport
    tcp, 
    // Transport type (optional, for use with 'url' field)
    // When set to 'http', uses StreamableHTTPClientTransport
    // When set to 'sse', uses SSEClientTransport
    // When omitted, auto-detects transport type
    // Note: 'httpUrl' is deprecated in favor of 'url' + 'type'
    type, 
    // Common
    timeout, trust, 
    // Metadata
    description, includeTools, excludeTools, extension, 
    // OAuth configuration
    oauth, authProviderType, 
    // Service Account Configuration
    /* targetAudience format: CLIENT_ID.apps.googleusercontent.com */
    targetAudience, 
    /* targetServiceAccount format: <service-account-name>@<project-num>.iam.gserviceaccount.com */
    targetServiceAccount) {
        this.command = command;
        this.args = args;
        this.env = env;
        this.cwd = cwd;
        this.url = url;
        this.httpUrl = httpUrl;
        this.headers = headers;
        this.tcp = tcp;
        this.type = type;
        this.timeout = timeout;
        this.trust = trust;
        this.description = description;
        this.includeTools = includeTools;
        this.excludeTools = excludeTools;
        this.extension = extension;
        this.oauth = oauth;
        this.authProviderType = authProviderType;
        this.targetAudience = targetAudience;
        this.targetServiceAccount = targetServiceAccount;
    }
}
export var AuthProviderType;
(function (AuthProviderType) {
    AuthProviderType["DYNAMIC_DISCOVERY"] = "dynamic_discovery";
    AuthProviderType["GOOGLE_CREDENTIALS"] = "google_credentials";
    AuthProviderType["SERVICE_ACCOUNT_IMPERSONATION"] = "service_account_impersonation";
})(AuthProviderType || (AuthProviderType = {}));
export const ConfigSchema = z.object({
    sandbox: z
        .object({
        enabled: z.boolean().default(false),
        allowedPaths: z.array(z.string()).default([]),
        includeDirectories: z.array(z.string()).default([]),
        networkAccess: z.boolean().default(false),
        command: z
            .enum([
            'docker',
            'podman',
            'sandbox-exec',
            'runsc',
            'lxc',
            'windows-native',
        ])
            .optional(),
        image: z.string().optional(),
    })
        .superRefine((data, ctx) => {
        if (data.enabled && !data.command) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Sandbox command is required when sandbox is enabled',
                path: ['command'],
            });
        }
    })
        .optional(),
});
export class Config {
    _toolRegistry;
    mcpClientManager;
    a2aClientManager;
    allowedMcpServers;
    blockedMcpServers;
    allowedEnvironmentVariables;
    blockedEnvironmentVariables;
    enableEnvironmentVariableRedaction;
    _promptRegistry;
    _resourceRegistry;
    agentRegistry;
    acknowledgedAgentsService;
    skillManager;
    _sessionId;
    clientName;
    clientVersion;
    fileSystemService;
    trackerService;
    topicState = new TopicState();
    contentGeneratorConfig;
    contentGenerator;
    modelConfigService;
    embeddingModel;
    sandbox;
    _sandboxForbiddenPaths;
    targetDir;
    workspaceContext;
    debugMode;
    question;
    worktreeSettings;
    enableConseca;
    coreTools;
    mainAgentTools;
    /** @deprecated Use Policy Engine instead */
    allowedTools;
    /** @deprecated Use Policy Engine instead */
    excludeTools;
    toolDiscoveryCommand;
    toolCallCommand;
    mcpServerCommand;
    mcpEnabled;
    extensionsEnabled;
    mcpServers;
    mcpEnablementCallbacks;
    userMemory;
    geminiMdFileCount;
    geminiMdFilePaths;
    showMemoryUsage;
    accessibility;
    telemetrySettings;
    usageStatisticsEnabled;
    _geminiClient;
    _sandboxManager;
    _sandboxPolicyManager;
    baseLlmClient;
    localLiteRtLmClient;
    modelRouterService;
    modelAvailabilityService;
    fileFiltering;
    fileDiscoveryService = null;
    gitService = undefined;
    checkpointing;
    proxy;
    cwd;
    bugCommand;
    model;
    disableLoopDetection;
    // null = unknown (quota not fetched); true = has access; false = definitively no access
    hasAccessToPreviewModel = null;
    noBrowser;
    folderTrust;
    ideMode;
    _activeModel;
    maxSessionTurns;
    listSessions;
    deleteSession;
    listExtensions;
    _extensionLoader;
    _enabledExtensions;
    enableExtensionReloading;
    fallbackModelHandler;
    validationHandler;
    quotaErrorOccurred = false;
    creditsNotificationShown = false;
    modelQuotas = new Map();
    lastRetrievedQuota;
    lastQuotaFetchTime = 0;
    lastEmittedQuotaRemaining;
    lastEmittedQuotaLimit;
    emitQuotaChangedEvent() {
        const remaining = this.getQuotaRemaining();
        const limit = this.getQuotaLimit();
        const resetTime = this.getQuotaResetTime();
        if (this.lastEmittedQuotaRemaining !== remaining ||
            this.lastEmittedQuotaLimit !== limit) {
            this.lastEmittedQuotaRemaining = remaining;
            this.lastEmittedQuotaLimit = limit;
            coreEvents.emitQuotaChanged(remaining, limit, resetTime);
        }
    }
    summarizeToolOutput;
    acpMode = false;
    loadMemoryFromIncludeDirectories = false;
    includeDirectoryTree = true;
    importFormat;
    discoveryMaxDirs;
    compressionThreshold;
    /** Public for testing only */
    interactive;
    ptyInfo;
    trustedFolder;
    directWebFetch;
    useRipgrep;
    enableInteractiveShell;
    shellBackgroundCompletionBehavior;
    skipNextSpeakerCheck;
    useBackgroundColor;
    useAlternateBuffer;
    useTerminalBuffer;
    useRenderProcess;
    shellExecutionConfig;
    extensionManagement = true;
    extensionRegistryURI;
    truncateToolOutputThreshold;
    compressionTruncationCounter = 0;
    initialized = false;
    initPromise;
    mcpInitializationPromise = null;
    storage;
    fileExclusions;
    eventEmitter;
    useWriteTodos;
    workspacePoliciesDir;
    _messageBus;
    policyEngine;
    policyUpdateConfirmationRequest;
    outputSettings;
    gemmaModelRouter;
    agentSessionNoninteractiveEnabled;
    agentSessionInteractiveEnabled;
    continueOnFailedApiCall;
    retryFetchErrors;
    maxAttempts;
    enableShellOutputEfficiency;
    shellToolInactivityTimeout;
    fakeResponses;
    recordResponses;
    disableYoloMode;
    disableAlwaysAllow;
    rawOutput;
    acceptRawOutputRisk;
    dynamicModelConfiguration;
    pendingIncludeDirectories;
    enableHooksUI;
    enableHooks;
    hooks;
    projectHooks;
    disabledHooks;
    experiments;
    experimentsPromise;
    hookSystem;
    onModelChange;
    onReload;
    billing;
    enableAgents;
    agents;
    enableEventDrivenScheduler;
    skillsSupport;
    disabledSkills;
    adminSkillsEnabled;
    experimentalJitContext;
    experimentalMemoryManager;
    experimentalAutoMemory;
    experimentalContextManagementConfig;
    memoryBoundaryMarkers;
    topicUpdateNarration;
    disableLLMCorrection;
    planEnabled;
    trackerEnabled;
    planModeRoutingEnabled;
    modelSteering;
    memoryContextManager;
    contextManagement;
    terminalBackground = undefined;
    remoteAdminSettings;
    latestApiRequest;
    lastModeSwitchTime = performance.now();
    injectionService;
    approvedPlanPath;
    constructor(params) {
        this._sessionId = params.sessionId;
        this.clientName = params.clientName;
        this.clientVersion = params.clientVersion ?? 'unknown';
        this.approvedPlanPath = undefined;
        this.embeddingModel =
            params.embeddingModel ?? DEFAULT_GEMINI_EMBEDDING_MODEL;
        this.sandbox = params.sandbox
            ? {
                enabled: params.sandbox.enabled || params.toolSandboxing || false,
                allowedPaths: params.sandbox.allowedPaths ?? [],
                includeDirectories: [
                    ...(params.sandbox.includeDirectories ?? []),
                    ...(params.sandbox.allowedPaths ?? []),
                    Storage.getGlobalTempDir(),
                ],
                networkAccess: params.sandbox.networkAccess ?? false,
                command: params.sandbox.command,
                image: params.sandbox.image,
            }
            : {
                enabled: params.toolSandboxing || false,
                allowedPaths: [],
                includeDirectories: [Storage.getGlobalTempDir()],
                networkAccess: false,
            };
        this.targetDir = path.resolve(params.targetDir);
        this.folderTrust = params.folderTrust ?? false;
        this.workspaceContext = new WorkspaceContext(this.targetDir, []);
        this.pendingIncludeDirectories = params.includeDirectories ?? [];
        this.debugMode = params.debugMode;
        this.question = params.question;
        this.worktreeSettings = params.worktreeSettings;
        this._sandboxPolicyManager = new SandboxPolicyManager();
        const initialApprovalMode = params.approvalMode ??
            params.policyEngineConfig?.approvalMode ??
            'default';
        this._sandboxManager = createSandboxManager(this.sandbox, {
            workspace: this.targetDir,
            forbiddenPaths: this.getSandboxForbiddenPaths.bind(this),
            includeDirectories: [
                ...this.pendingIncludeDirectories,
                Storage.getGlobalTempDir(),
            ],
            policyManager: this._sandboxPolicyManager,
        }, initialApprovalMode);
        if (!(this._sandboxManager instanceof NoopSandboxManager) &&
            this.sandbox?.enabled) {
            this.fileSystemService = new SandboxedFileSystemService(this._sandboxManager, params.targetDir);
        }
        else {
            this.fileSystemService = new StandardFileSystemService();
        }
        this.debugMode = params.debugMode;
        this.question = params.question;
        this.worktreeSettings = params.worktreeSettings;
        this.coreTools = params.coreTools;
        this.mainAgentTools = params.mainAgentTools;
        this.allowedTools = params.allowedTools;
        this.excludeTools = params.excludeTools;
        this.toolDiscoveryCommand = params.toolDiscoveryCommand;
        this.toolCallCommand = params.toolCallCommand;
        this.mcpServerCommand = params.mcpServerCommand;
        this.mcpServers = params.mcpServers;
        this.mcpEnablementCallbacks = params.mcpEnablementCallbacks;
        this.mcpEnabled = params.mcpEnabled ?? true;
        this.extensionsEnabled = params.extensionsEnabled ?? true;
        this.allowedMcpServers = params.allowedMcpServers ?? [];
        this.blockedMcpServers = params.blockedMcpServers ?? [];
        this.allowedEnvironmentVariables = params.allowedEnvironmentVariables ?? [];
        this.blockedEnvironmentVariables = params.blockedEnvironmentVariables ?? [];
        this.enableEnvironmentVariableRedaction =
            params.enableEnvironmentVariableRedaction ?? false;
        this.userMemory = params.userMemory ?? '';
        this.geminiMdFileCount = params.geminiMdFileCount ?? 0;
        this.geminiMdFilePaths = params.geminiMdFilePaths ?? [];
        this.showMemoryUsage = params.showMemoryUsage ?? false;
        this.accessibility = params.accessibility ?? {};
        this.telemetrySettings = {
            enabled: params.telemetry?.enabled ?? false,
            target: params.telemetry?.target ?? DEFAULT_TELEMETRY_TARGET,
            otlpEndpoint: params.telemetry?.otlpEndpoint ?? DEFAULT_OTLP_ENDPOINT,
            otlpProtocol: params.telemetry?.otlpProtocol,
            logPrompts: params.telemetry?.logPrompts ?? true,
            outfile: params.telemetry?.outfile,
            useCollector: params.telemetry?.useCollector,
            useCliAuth: params.telemetry?.useCliAuth,
        };
        this.usageStatisticsEnabled = params.usageStatisticsEnabled ?? true;
        this.fileFiltering = {
            respectGitIgnore: params.fileFiltering?.respectGitIgnore ??
                DEFAULT_FILE_FILTERING_OPTIONS.respectGitIgnore,
            respectGeminiIgnore: params.fileFiltering?.respectGeminiIgnore ??
                DEFAULT_FILE_FILTERING_OPTIONS.respectGeminiIgnore,
            enableRecursiveFileSearch: params.fileFiltering?.enableRecursiveFileSearch ?? true,
            enableFuzzySearch: params.fileFiltering?.enableFuzzySearch ?? true,
            maxFileCount: params.fileFiltering?.maxFileCount ??
                DEFAULT_FILE_FILTERING_OPTIONS.maxFileCount ??
                20000,
            searchTimeout: params.fileFiltering?.searchTimeout ??
                DEFAULT_FILE_FILTERING_OPTIONS.searchTimeout ??
                5000,
            customIgnoreFilePaths: params.fileFiltering?.customIgnoreFilePaths ?? [],
        };
        this.checkpointing = params.checkpointing ?? false;
        this.proxy = params.proxy;
        this.cwd = params.cwd ?? process.cwd();
        this.fileDiscoveryService = params.fileDiscoveryService ?? null;
        this.bugCommand = params.bugCommand;
        this.model = params.model;
        this.disableLoopDetection = params.disableLoopDetection ?? false;
        this._activeModel = params.model;
        this.enableAgents = params.enableAgents ?? true;
        this.agents = params.agents ?? {};
        this.disableLLMCorrection = params.disableLLMCorrection ?? true;
        this.planEnabled = params.plan ?? true;
        this.trackerEnabled = params.tracker ?? false;
        this.planModeRoutingEnabled = params.planSettings?.modelRouting ?? true;
        this.enableEventDrivenScheduler = params.enableEventDrivenScheduler ?? true;
        this.skillsSupport = params.skillsSupport ?? true;
        this.disabledSkills = params.disabledSkills ?? [];
        this.adminSkillsEnabled = params.adminSkillsEnabled ?? true;
        this.modelAvailabilityService = new ModelAvailabilityService();
        this.dynamicModelConfiguration = params.dynamicModelConfiguration ?? false;
        // HACK: The settings loading logic doesn't currently merge the default
        // generation config with the user's settings. This means if a user provides
        // any `generation` settings (e.g., just `overrides`), the default `aliases`
        // are lost. This hack manually merges the default aliases back in if they
        // are missing from the user's config.
        // TODO(12593): Fix the settings loading logic to properly merge defaults and
        // remove this hack.
        let modelConfigServiceConfig = params.modelConfigServiceConfig;
        if (modelConfigServiceConfig) {
            // Ensure user-defined model definitions augment, not replace, the defaults.
            const mergedModelDefinitions = {
                ...DEFAULT_MODEL_CONFIGS.modelDefinitions,
                ...modelConfigServiceConfig.modelDefinitions,
            };
            const mergedModelIdResolutions = {
                ...DEFAULT_MODEL_CONFIGS.modelIdResolutions,
                ...modelConfigServiceConfig.modelIdResolutions,
            };
            const mergedClassifierIdResolutions = {
                ...DEFAULT_MODEL_CONFIGS.classifierIdResolutions,
                ...modelConfigServiceConfig.classifierIdResolutions,
            };
            const mergedModelChains = {
                ...DEFAULT_MODEL_CONFIGS.modelChains,
                ...modelConfigServiceConfig.modelChains,
            };
            modelConfigServiceConfig = {
                // Preserve other user settings like customAliases
                ...modelConfigServiceConfig,
                // Apply defaults for aliases and overrides if they are not provided
                aliases: modelConfigServiceConfig.aliases ?? DEFAULT_MODEL_CONFIGS.aliases,
                overrides: modelConfigServiceConfig.overrides ?? DEFAULT_MODEL_CONFIGS.overrides,
                // Use the merged model definitions
                modelDefinitions: mergedModelDefinitions,
                modelIdResolutions: mergedModelIdResolutions,
                classifierIdResolutions: mergedClassifierIdResolutions,
                modelChains: mergedModelChains,
            };
        }
        this.modelConfigService = new ModelConfigService(modelConfigServiceConfig ?? DEFAULT_MODEL_CONFIGS);
        this.experimentalJitContext = params.experimentalJitContext ?? false;
        this.experimentalMemoryManager = params.experimentalMemoryManager ?? false;
        this.experimentalAutoMemory = params.experimentalAutoMemory ?? false;
        this.experimentalContextManagementConfig =
            params.experimentalContextManagementConfig;
        this.memoryBoundaryMarkers = params.memoryBoundaryMarkers ?? ['.git'];
        this.contextManagement = {
            enabled: params.contextManagement?.enabled ?? false,
            historyWindow: {
                maxTokens: params.contextManagement?.historyWindow?.maxTokens ?? 150000,
                retainedTokens: params.contextManagement?.historyWindow?.retainedTokens ?? 40000,
            },
            messageLimits: {
                normalMaxTokens: params.contextManagement?.messageLimits?.normalMaxTokens ?? 2500,
                retainedMaxTokens: params.contextManagement?.messageLimits?.retainedMaxTokens ?? 12000,
                normalizationHeadRatio: params.contextManagement?.messageLimits?.normalizationHeadRatio ??
                    0.25,
            },
            tools: {
                distillation: {
                    maxOutputTokens: params.contextManagement?.tools?.distillation?.maxOutputTokens ??
                        10000,
                    summarizationThresholdTokens: params.contextManagement?.tools?.distillation
                        ?.summarizationThresholdTokens ?? 20000,
                },
                outputMasking: {
                    protectionThresholdTokens: params.contextManagement?.tools?.outputMasking
                        ?.protectionThresholdTokens ?? DEFAULT_TOOL_PROTECTION_THRESHOLD,
                    minPrunableThresholdTokens: params.contextManagement?.tools?.outputMasking
                        ?.minPrunableThresholdTokens ??
                        DEFAULT_MIN_PRUNABLE_TOKENS_THRESHOLD,
                    protectLatestTurn: params.contextManagement?.tools?.outputMasking?.protectLatestTurn ??
                        DEFAULT_PROTECT_LATEST_TURN,
                },
            },
        };
        this.topicUpdateNarration = params.topicUpdateNarration ?? true;
        this.modelSteering = params.modelSteering ?? false;
        this.injectionService = new InjectionService(() => this.isModelSteeringEnabled());
        ExecutionLifecycleService.setInjectionService(this.injectionService);
        this.maxSessionTurns = params.maxSessionTurns ?? -1;
        this.acpMode = params.acpMode ?? false;
        this.listSessions = params.listSessions ?? false;
        this.deleteSession = params.deleteSession;
        this.listExtensions = params.listExtensions ?? false;
        this._extensionLoader =
            params.extensionLoader ?? new SimpleExtensionLoader([]);
        this._enabledExtensions = params.enabledExtensions ?? [];
        this.noBrowser = params.noBrowser ?? false;
        this.summarizeToolOutput = params.summarizeToolOutput;
        this.folderTrust = params.folderTrust ?? false;
        this.ideMode = params.ideMode ?? false;
        this.includeDirectoryTree = params.includeDirectoryTree ?? true;
        this.loadMemoryFromIncludeDirectories =
            params.loadMemoryFromIncludeDirectories ?? false;
        this.importFormat = params.importFormat ?? 'tree';
        this.discoveryMaxDirs = params.discoveryMaxDirs ?? 200;
        this.compressionThreshold = params.compressionThreshold;
        this.interactive = params.interactive ?? false;
        this.ptyInfo = params.ptyInfo ?? 'child_process';
        this.trustedFolder = params.trustedFolder;
        this.directWebFetch = params.directWebFetch ?? false;
        this.useRipgrep = params.useRipgrep ?? true;
        this.useBackgroundColor = params.useBackgroundColor ?? true;
        this.useAlternateBuffer = params.useAlternateBuffer ?? false;
        this.useTerminalBuffer = params.useTerminalBuffer ?? false;
        this.useRenderProcess = params.useRenderProcess ?? true;
        this.enableInteractiveShell = params.enableInteractiveShell ?? false;
        const requestedBehavior = params.shellBackgroundCompletionBehavior;
        if (requestedBehavior === 'inject' || requestedBehavior === 'notify') {
            this.shellBackgroundCompletionBehavior = requestedBehavior;
        }
        else {
            this.shellBackgroundCompletionBehavior = 'silent';
        }
        this.skipNextSpeakerCheck = params.skipNextSpeakerCheck ?? true;
        this.shellExecutionConfig = {
            terminalWidth: params.shellExecutionConfig?.terminalWidth ?? 80,
            terminalHeight: params.shellExecutionConfig?.terminalHeight ?? 24,
            showColor: params.shellExecutionConfig?.showColor ?? false,
            pager: params.shellExecutionConfig?.pager ?? 'cat',
            sanitizationConfig: this.sanitizationConfig,
            sandboxManager: this._sandboxManager,
            sandboxConfig: this.sandbox,
            backgroundCompletionBehavior: this.shellBackgroundCompletionBehavior,
        };
        this.truncateToolOutputThreshold =
            params.truncateToolOutputThreshold ??
                DEFAULT_TRUNCATE_TOOL_OUTPUT_THRESHOLD;
        const isGemini2 = isGemini2Model(this.model);
        this.useWriteTodos =
            isGemini2 && !isPreviewModel(this.model, this) && !this.trackerEnabled
                ? (params.useWriteTodos ?? true)
                : false;
        this.workspacePoliciesDir = params.workspacePoliciesDir;
        this.enableHooksUI = params.enableHooksUI ?? true;
        this.enableHooks = params.enableHooks ?? true;
        this.disabledHooks = params.disabledHooks ?? [];
        this.continueOnFailedApiCall = params.continueOnFailedApiCall ?? true;
        this.enableShellOutputEfficiency =
            params.enableShellOutputEfficiency ?? true;
        this.shellToolInactivityTimeout =
            (params.shellToolInactivityTimeout ?? 300) * 1000; // 5 minutes
        this.extensionManagement = params.extensionManagement ?? true;
        this.extensionRegistryURI = params.extensionRegistryURI;
        this.enableExtensionReloading = params.enableExtensionReloading ?? false;
        this.storage = new Storage(this.targetDir, this._sessionId);
        this.storage.setCustomPlansDir(params.planSettings?.directory);
        this.fakeResponses = params.fakeResponses;
        this.recordResponses = params.recordResponses;
        this.fileExclusions = new FileExclusions(this);
        this.eventEmitter = params.eventEmitter;
        this.enableConseca = params.enableConseca ?? false;
        // Initialize Safety Infrastructure
        const contextBuilder = new ContextBuilder(this);
        const checkersPath = this.targetDir;
        // The checkersPath  is used to resolve external checkers. Since we do not have any external checkers currently, it is set to the targetDir.
        const checkerRegistry = new CheckerRegistry(checkersPath);
        const checkerRunner = new CheckerRunner(contextBuilder, checkerRegistry, {
            checkersPath,
            timeout: 30000, // 30 seconds to allow for LLM-based checkers
        });
        this.policyUpdateConfirmationRequest =
            params.policyUpdateConfirmationRequest;
        this.disableAlwaysAllow = params.disableAlwaysAllow ?? false;
        const engineApprovalMode = params.approvalMode ??
            params.policyEngineConfig?.approvalMode ??
            ApprovalMode.DEFAULT;
        this.policyEngine = new PolicyEngine({
            ...params.policyEngineConfig,
            approvalMode: engineApprovalMode,
            disableAlwaysAllow: this.disableAlwaysAllow,
            sandboxManager: this._sandboxManager,
        }, checkerRunner);
        // Register Conseca if enabled
        if (this.enableConseca) {
            debugLogger.log('[SAFETY] Registering Conseca Safety Checker');
            ConsecaSafetyChecker.getInstance().setContext(this);
        }
        this._messageBus = new MessageBus(this.policyEngine, this.debugMode);
        this.acknowledgedAgentsService = new AcknowledgedAgentsService();
        this.skillManager = new SkillManager();
        this.outputSettings = {
            format: params.output?.format ?? OutputFormat.TEXT,
        };
        this.gemmaModelRouter = {
            enabled: params.gemmaModelRouter?.enabled ?? false,
            classifier: {
                host: params.gemmaModelRouter?.classifier?.host ?? 'http://localhost:9379',
                model: params.gemmaModelRouter?.classifier?.model ?? 'gemma3-1b-gpu-custom',
            },
        };
        this.agentSessionNoninteractiveEnabled =
            params.adk?.agentSessionNoninteractiveEnabled ?? false;
        this.agentSessionInteractiveEnabled =
            params.adk?.agentSessionInteractiveEnabled ?? false;
        this.retryFetchErrors = params.retryFetchErrors ?? true;
        this.maxAttempts = Math.min(params.maxAttempts ?? DEFAULT_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS);
        this.disableYoloMode = params.disableYoloMode ?? false;
        this.rawOutput = params.rawOutput ?? false;
        this.acceptRawOutputRisk = params.acceptRawOutputRisk ?? false;
        if (params.hooks) {
            this.hooks = params.hooks;
        }
        if (params.projectHooks) {
            this.projectHooks = params.projectHooks;
        }
        this.experiments = params.experiments;
        this.onModelChange = params.onModelChange;
        this.onReload = params.onReload;
        this.billing = {
            overageStrategy: params.billing?.overageStrategy ?? 'ask',
        };
        if (params.contextFileName) {
            setGeminiMdFilename(params.contextFileName);
        }
        if (this.telemetrySettings.enabled) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            initializeTelemetry(this);
        }
        const proxy = this.getProxy();
        if (proxy) {
            try {
                setGlobalProxy(proxy);
            }
            catch (error) {
                coreEvents.emitFeedback('error', 'Invalid proxy configuration detected. Check debug drawer for more details (F12)', error);
            }
        }
        this._geminiClient = new GeminiClient(this);
        this.a2aClientManager = new A2AClientManager(this);
        this.modelRouterService = new ModelRouterService(this);
    }
    get config() {
        return this;
    }
    isInitialized() {
        return this.initialized;
    }
    /**
     * Dedups initialization requests using a shared promise that is only resolved
     * once.
     */
    async initialize() {
        if (this.initPromise) {
            return this.initPromise;
        }
        this.initPromise = this._initialize();
        return this.initPromise;
    }
    async _initialize() {
        await this.storage.initialize();
        // Add pending directories to workspace context
        for (const dir of this.pendingIncludeDirectories) {
            this.workspaceContext.addDirectory(dir);
        }
        // Add plans directory to workspace context for plan file storage
        if (this.planEnabled) {
            const plansDir = this.storage.getPlansDir();
            try {
                await fs.promises.access(plansDir);
                this.workspaceContext.addDirectory(plansDir);
            }
            catch {
                // Directory does not exist yet, so we don't add it to the workspace context.
                // It will be created when the first plan is written. Since custom plan
                // directories must be within the project root, they are automatically
                // covered by the project-wide file discovery once created.
            }
        }
        // Initialize centralized FileDiscoveryService
        const discoverToolsHandle = startupProfiler.start('discover_tools');
        this.getFileService();
        if (this.getCheckpointingEnabled()) {
            await this.getGitService();
        }
        this._promptRegistry = new PromptRegistry();
        this._resourceRegistry = new ResourceRegistry();
        this.agentRegistry = new AgentRegistry(this);
        await this.agentRegistry.initialize();
        coreEvents.on(CoreEvent.AgentsRefreshed, this.onAgentsRefreshed);
        this._toolRegistry = await this.createToolRegistry();
        discoverToolsHandle?.end();
        this.mcpClientManager = new McpClientManager(this.clientVersion, this, this.eventEmitter);
        this.mcpClientManager.setMainRegistries({
            toolRegistry: this._toolRegistry,
            promptRegistry: this.promptRegistry,
            resourceRegistry: this.resourceRegistry,
        });
        // We do not await this promise so that the CLI can start up even if
        // MCP servers are slow to connect.
        this.mcpInitializationPromise = Promise.allSettled([
            this.mcpClientManager.startConfiguredMcpServers(),
            this.getExtensionLoader().start(this),
        ]).then((results) => {
            for (const result of results) {
                if (result.status === 'rejected') {
                    debugLogger.error('Error initializing MCP clients:', result.reason);
                }
            }
        });
        if (!this.interactive || this.acpMode) {
            await this.mcpInitializationPromise;
        }
        if (this.skillsSupport) {
            this.getSkillManager().setAdminSettings(this.adminSkillsEnabled);
            if (this.adminSkillsEnabled) {
                await this.getSkillManager().discoverSkills(this.storage, this.getExtensions(), this.isTrustedFolder());
                this.getSkillManager().setDisabledSkills(this.disabledSkills);
                // Re-register ActivateSkillTool to update its schema with the discovered enabled skill enums
                if (this.getSkillManager().getSkills().length > 0) {
                    this.toolRegistry.unregisterTool(ActivateSkillTool.Name);
                    this.toolRegistry.registerTool(new ActivateSkillTool(this, this.messageBus));
                }
            }
        }
        // Initialize hook system if enabled
        if (this.getEnableHooks()) {
            this.hookSystem = new HookSystem(this);
            await this.hookSystem.initialize();
        }
        if (this.experimentalJitContext) {
            this.memoryContextManager = new MemoryContextManager(this);
            await this.memoryContextManager.refresh();
        }
        await this._geminiClient.initialize();
        this.initialized = true;
    }
    getContentGenerator() {
        return this.contentGenerator;
    }
    async refreshAuth(authMethod, apiKey, baseUrl, customHeaders) {
        // Reset availability service when switching auth
        this.modelAvailabilityService.reset();
        // Vertex and Genai have incompatible encryption and sending history with
        // thoughtSignature from Genai to Vertex will fail, we need to strip them
        if (this.contentGeneratorConfig?.authType === AuthType.USE_GEMINI &&
            authMethod !== AuthType.USE_GEMINI) {
            // Restore the conversation history to the new client
            this._geminiClient.stripThoughtsFromHistory();
        }
        // Reset availability status when switching auth (e.g. from limited key to OAuth)
        this.modelAvailabilityService.reset();
        // Clear stale authType to ensure getGemini31LaunchedSync doesn't return stale results
        // during the transition.
        if (this.contentGeneratorConfig) {
            this.contentGeneratorConfig.authType = undefined;
        }
        const newContentGeneratorConfig = await createContentGeneratorConfig(this, authMethod, apiKey, baseUrl, customHeaders);
        this.contentGenerator = await createContentGenerator(newContentGeneratorConfig, this, this.getSessionId());
        // Only assign to instance properties after successful initialization
        this.contentGeneratorConfig = newContentGeneratorConfig;
        const codeAssistServer = getCodeAssistServer(this);
        const quotaPromise = codeAssistServer?.projectId
            ? this.refreshUserQuota()
            : Promise.resolve();
        this.experimentsPromise = getExperiments(codeAssistServer)
            .then((experiments) => {
            this.setExperiments(experiments);
            return experiments;
        })
            .catch((e) => {
            debugLogger.error('Failed to fetch experiments', e);
            return undefined;
        });
        // Fetch experiments and update timeouts before continuing initialization
        const experiments = await this.experimentsPromise;
        const requestTimeoutMs = this.getRequestTimeoutMs();
        if (requestTimeoutMs !== undefined) {
            updateGlobalFetchTimeouts(requestTimeoutMs);
        }
        // Initialize BaseLlmClient now that the ContentGenerator and experiments are available
        this.baseLlmClient = new BaseLlmClient(this.contentGenerator, this);
        await quotaPromise;
        const authType = this.contentGeneratorConfig.authType;
        if (authType === AuthType.USE_GEMINI ||
            authType === AuthType.USE_VERTEX_AI) {
            this.setHasAccessToPreviewModel(true);
        }
        // Only reset when we have explicit "no access" (hasAccessToPreviewModel === false).
        // When null (quota not fetched) or true, we preserve the saved model.
        if (isPreviewModel(this.model, this) &&
            this.hasAccessToPreviewModel === false) {
            this.setModel(DEFAULT_GEMINI_MODEL_AUTO);
        }
        const adminControlsEnabled = experiments?.flags[ExperimentFlags.ENABLE_ADMIN_CONTROLS]?.boolValue ??
            false;
        const adminControls = await fetchAdminControls(codeAssistServer, this.getRemoteAdminSettings(), adminControlsEnabled, (newSettings) => {
            this.setRemoteAdminSettings(newSettings);
            coreEvents.emitAdminSettingsChanged();
        });
        this.setRemoteAdminSettings(adminControls);
        if ((await this.getProModelNoAccess()) && isAutoModel(this.model)) {
            this.setModel(PREVIEW_GEMINI_FLASH_MODEL);
        }
    }
    async getExperimentsAsync() {
        if (this.experiments) {
            return this.experiments;
        }
        const codeAssistServer = getCodeAssistServer(this);
        return getExperiments(codeAssistServer);
    }
    getUserTier() {
        return this.contentGenerator?.userTier;
    }
    getUserTierName() {
        return this.contentGenerator?.userTierName;
    }
    getUserPaidTier() {
        return this.contentGenerator?.paidTier;
    }
    /**
     * Provides access to the BaseLlmClient for stateless LLM operations.
     */
    getBaseLlmClient() {
        if (!this.baseLlmClient) {
            // Handle cases where initialization might be deferred or authentication failed
            if (!this.experiments) {
                throw new Error('BaseLlmClient not initialized. Ensure experiments have been fetched and configuration is ready.');
            }
            if (this.contentGenerator) {
                this.baseLlmClient = new BaseLlmClient(this.getContentGenerator(), this);
            }
            else {
                throw new Error('BaseLlmClient not initialized. Ensure authentication has occurred and ContentGenerator is ready.');
            }
        }
        return this.baseLlmClient;
    }
    getLocalLiteRtLmClient() {
        if (!this.localLiteRtLmClient) {
            this.localLiteRtLmClient = new LocalLiteRtLmClient(this);
        }
        return this.localLiteRtLmClient;
    }
    get promptId() {
        return this._sessionId;
    }
    /**
     * @deprecated Do not access directly on Config.
     * Use the injected AgentLoopContext instead.
     */
    get toolRegistry() {
        return this._toolRegistry;
    }
    /**
     * @deprecated Do not access directly on Config.
     * Use the injected AgentLoopContext instead.
     */
    get promptRegistry() {
        return this._promptRegistry;
    }
    /**
     * @deprecated Do not access directly on Config.
     * Use the injected AgentLoopContext instead.
     */
    get resourceRegistry() {
        return this._resourceRegistry;
    }
    /**
     * @deprecated Do not access directly on Config.
     * Use the injected AgentLoopContext instead.
     */
    get messageBus() {
        return this._messageBus;
    }
    /**
     * @deprecated Do not access directly on Config.
     * Use the injected AgentLoopContext instead.
     */
    get geminiClient() {
        return this._geminiClient;
    }
    async getSandboxForbiddenPaths() {
        if (this._sandboxForbiddenPaths) {
            return this._sandboxForbiddenPaths;
        }
        this._sandboxForbiddenPaths = await this.getFileService().getIgnoredPaths({
            respectGitIgnore: false,
            respectGeminiIgnore: true,
        });
        return this._sandboxForbiddenPaths;
    }
    refreshSandboxManager() {
        this._sandboxManager = createSandboxManager(this.sandbox, {
            workspace: this.targetDir,
            forbiddenPaths: this.getSandboxForbiddenPaths.bind(this),
            includeDirectories: [
                ...this.pendingIncludeDirectories,
                Storage.getGlobalTempDir(),
            ],
            policyManager: this._sandboxPolicyManager,
        }, this.getApprovalMode());
        this.shellExecutionConfig.sandboxManager = this._sandboxManager;
    }
    get sandboxPolicyManager() {
        return this._sandboxPolicyManager;
    }
    get sandboxManager() {
        return this._sandboxManager;
    }
    getSessionId() {
        return this.promptId;
    }
    getWorktreeSettings() {
        return this.worktreeSettings;
    }
    getClientName() {
        return this.clientName;
    }
    setSessionId(sessionId) {
        const previousPlansDir = this.storage.isInitialized()
            ? this.storage.getPlansDir()
            : undefined;
        this._sessionId = sessionId;
        this.storage.setSessionId(sessionId);
        this.trackerService = undefined;
        if (previousPlansDir) {
            this.refreshSessionScopedPlansDirectory(previousPlansDir);
        }
    }
    resetNewSessionState(sessionId) {
        this.setSessionId(sessionId);
        this.approvedPlanPath = undefined;
    }
    setTerminalBackground(terminalBackground) {
        this.terminalBackground = terminalBackground;
    }
    getTerminalBackground() {
        return this.terminalBackground;
    }
    getLatestApiRequest() {
        return this.latestApiRequest;
    }
    setLatestApiRequest(req) {
        this.latestApiRequest = req;
    }
    getRemoteAdminSettings() {
        return this.remoteAdminSettings;
    }
    setRemoteAdminSettings(settings) {
        this.remoteAdminSettings = settings;
    }
    shouldLoadMemoryFromIncludeDirectories() {
        return this.loadMemoryFromIncludeDirectories;
    }
    getIncludeDirectoryTree() {
        return this.includeDirectoryTree;
    }
    getImportFormat() {
        return this.importFormat;
    }
    getDiscoveryMaxDirs() {
        return this.discoveryMaxDirs;
    }
    getContentGeneratorConfig() {
        return this.contentGeneratorConfig;
    }
    getModel() {
        return this.model;
    }
    getDisableLoopDetection() {
        return this.disableLoopDetection ?? false;
    }
    setModel(newModel, isTemporary = true) {
        if (this.model !== newModel || this._activeModel !== newModel) {
            this.model = newModel;
            // When the user explicitly sets a model, that becomes the active model.
            this._activeModel = newModel;
            coreEvents.emitModelChanged(newModel);
            this.lastEmittedQuotaRemaining = undefined;
            this.lastEmittedQuotaLimit = undefined;
            this.emitQuotaChangedEvent();
        }
        if (this.onModelChange && !isTemporary) {
            this.onModelChange(newModel);
        }
        this.modelAvailabilityService.reset();
    }
    activateFallbackMode(model) {
        this.setModel(model, true);
        const authType = this.getContentGeneratorConfig()?.authType;
        if (authType) {
            logFlashFallback(this, new FlashFallbackEvent(authType));
        }
    }
    getActiveModel() {
        return this._activeModel ?? this.model;
    }
    setActiveModel(model) {
        if (this._activeModel !== model) {
            this._activeModel = model;
        }
    }
    setFallbackModelHandler(handler) {
        this.fallbackModelHandler = handler;
    }
    getFallbackModelHandler() {
        return this.fallbackModelHandler;
    }
    setValidationHandler(handler) {
        this.validationHandler = handler;
    }
    getValidationHandler() {
        return this.validationHandler;
    }
    resetTurn() {
        this.modelAvailabilityService.resetTurn();
    }
    /** Resets billing state (overageStrategy, creditsNotificationShown) once per user prompt. */
    resetBillingTurnState(overageStrategy) {
        this.creditsNotificationShown = false;
        this.billing.overageStrategy = overageStrategy ?? 'ask';
    }
    getMaxSessionTurns() {
        return this.maxSessionTurns;
    }
    setQuotaErrorOccurred(value) {
        this.quotaErrorOccurred = value;
    }
    getQuotaErrorOccurred() {
        return this.quotaErrorOccurred;
    }
    setCreditsNotificationShown(value) {
        this.creditsNotificationShown = value;
    }
    getCreditsNotificationShown() {
        return this.creditsNotificationShown;
    }
    setQuota(remaining, limit, modelId) {
        const activeModel = modelId ?? this.getActiveModel();
        if (remaining !== undefined && limit !== undefined) {
            const current = this.modelQuotas.get(activeModel);
            if (!current ||
                current.remaining !== remaining ||
                current.limit !== limit) {
                this.modelQuotas.set(activeModel, { remaining, limit });
                this.emitQuotaChangedEvent();
            }
        }
    }
    getPooledQuota() {
        const model = this.getModel();
        if (!isAutoModel(model)) {
            return {};
        }
        const isPreview = model === PREVIEW_GEMINI_MODEL_AUTO ||
            isPreviewModel(this.getActiveModel(), this);
        const proModel = isPreview ? PREVIEW_GEMINI_MODEL : DEFAULT_GEMINI_MODEL;
        const flashModel = isPreview
            ? PREVIEW_GEMINI_FLASH_MODEL
            : DEFAULT_GEMINI_FLASH_MODEL;
        const proQuota = this.modelQuotas.get(proModel);
        const flashQuota = this.modelQuotas.get(flashModel);
        if (proQuota || flashQuota) {
            // For reset time, take the one that is furthest in the future (most conservative)
            const resetTime = [proQuota?.resetTime, flashQuota?.resetTime]
                .filter((t) => !!t)
                .sort()
                .reverse()[0];
            return {
                remaining: (proQuota?.remaining ?? 0) + (flashQuota?.remaining ?? 0),
                limit: (proQuota?.limit ?? 0) + (flashQuota?.limit ?? 0),
                resetTime,
            };
        }
        return {};
    }
    getQuotaRemaining() {
        const pooled = this.getPooledQuota();
        if (pooled.remaining !== undefined) {
            return pooled.remaining;
        }
        const primaryModel = resolveModel(this.getModel(), this.getGemini31LaunchedSync(), this.getGemini31FlashLiteLaunchedSync(), this.getUseCustomToolModelSync(), this.getHasAccessToPreviewModel(), this);
        return this.modelQuotas.get(primaryModel)?.remaining;
    }
    getQuotaLimit() {
        const pooled = this.getPooledQuota();
        if (pooled.limit !== undefined) {
            return pooled.limit;
        }
        const primaryModel = resolveModel(this.getModel(), this.getGemini31LaunchedSync(), this.getGemini31FlashLiteLaunchedSync(), this.getUseCustomToolModelSync(), this.getHasAccessToPreviewModel(), this);
        return this.modelQuotas.get(primaryModel)?.limit;
    }
    getQuotaResetTime() {
        const pooled = this.getPooledQuota();
        if (pooled.resetTime !== undefined) {
            return pooled.resetTime;
        }
        const primaryModel = resolveModel(this.getModel(), this.getGemini31LaunchedSync(), this.getGemini31FlashLiteLaunchedSync(), this.getUseCustomToolModelSync(), this.getHasAccessToPreviewModel(), this);
        return this.modelQuotas.get(primaryModel)?.resetTime;
    }
    getEmbeddingModel() {
        return this.embeddingModel;
    }
    getSandbox() {
        return this.sandbox;
    }
    getSandboxEnabled() {
        return this.sandbox?.enabled ?? false;
    }
    getSandboxAllowedPaths() {
        const paths = [...(this.sandbox?.allowedPaths ?? [])];
        const globalTempDir = Storage.getGlobalTempDir();
        if (!paths.includes(globalTempDir)) {
            paths.push(globalTempDir);
        }
        return paths;
    }
    getSandboxNetworkAccess() {
        return this.sandbox?.networkAccess ?? false;
    }
    isRestrictiveSandbox() {
        const sandboxConfig = this.getSandbox();
        const seatbeltProfile = process.env['SEATBELT_PROFILE'];
        return (!!sandboxConfig &&
            sandboxConfig.command === 'sandbox-exec' &&
            !!seatbeltProfile &&
            (seatbeltProfile.startsWith('restrictive-') ||
                seatbeltProfile.startsWith('strict-')));
    }
    getTargetDir() {
        return this.targetDir;
    }
    getProjectRoot() {
        return this.targetDir;
    }
    getWorkspaceContext() {
        return getWorkspaceContextOverride() ?? this.workspaceContext;
    }
    refreshSessionScopedPlansDirectory(previousPlansDir) {
        const nextPlansDir = this.storage.getPlansDir();
        if (previousPlansDir === nextPlansDir) {
            return;
        }
        const pathsToRemove = new Set([previousPlansDir]);
        try {
            pathsToRemove.add(resolveToRealPath(previousPlansDir));
        }
        catch {
            // The previous session's plans directory may never have been created.
            // In that case there is nothing to resolve or remove beyond the raw path.
        }
        const currentDirectories = this.workspaceContext
            .getDirectories()
            .filter((dir) => !pathsToRemove.has(dir));
        this.workspaceContext.setDirectories(currentDirectories);
        try {
            if (fs.existsSync(nextPlansDir)) {
                this.workspaceContext.addDirectory(nextPlansDir);
            }
        }
        catch {
            // Ignore invalid or unreadable plans directories here. This mirrors
            // initialization behavior, which only adds the plans directory when it
            // already exists and is readable.
        }
    }
    getAgentRegistry() {
        return this.agentRegistry;
    }
    getAcknowledgedAgentsService() {
        return this.acknowledgedAgentsService;
    }
    /** @deprecated Use toolRegistry getter */
    getToolRegistry() {
        return this.toolRegistry;
    }
    getPromptRegistry() {
        return this._promptRegistry;
    }
    getSkillManager() {
        return this.skillManager;
    }
    getResourceRegistry() {
        return this._resourceRegistry;
    }
    getDebugMode() {
        return this.debugMode;
    }
    getQuestion() {
        return this.question;
    }
    getHasAccessToPreviewModel() {
        return this.hasAccessToPreviewModel !== false;
    }
    setHasAccessToPreviewModel(hasAccess) {
        this.hasAccessToPreviewModel = hasAccess;
    }
    async refreshAvailableCredits() {
        const codeAssistServer = getCodeAssistServer(this);
        if (!codeAssistServer) {
            return;
        }
        try {
            await codeAssistServer.refreshAvailableCredits();
        }
        catch {
            // Non-fatal: proceed even if refresh fails.
            // The actual credit balance will be verified server-side.
        }
    }
    async refreshUserQuota() {
        const codeAssistServer = getCodeAssistServer(this);
        if (!codeAssistServer || !codeAssistServer.projectId) {
            return undefined;
        }
        try {
            const quota = await codeAssistServer.retrieveUserQuota({
                project: codeAssistServer.projectId,
            });
            if (quota.buckets) {
                this.lastRetrievedQuota = quota;
                this.lastQuotaFetchTime = Date.now();
                for (const bucket of quota.buckets) {
                    if (!bucket.modelId || bucket.remainingFraction == null) {
                        continue;
                    }
                    let remaining;
                    let limit;
                    if (bucket.remainingAmount) {
                        remaining = parseInt(bucket.remainingAmount, 10);
                        limit =
                            bucket.remainingFraction > 0
                                ? Math.round(remaining / bucket.remainingFraction)
                                : (this.modelQuotas.get(bucket.modelId)?.limit ?? 0);
                    }
                    else {
                        // Server only sent remainingFraction — use a normalized scale.
                        limit = 100;
                        remaining = Math.round(bucket.remainingFraction * limit);
                    }
                    if (!isNaN(remaining) && Number.isFinite(limit) && limit > 0) {
                        this.modelQuotas.set(bucket.modelId, {
                            remaining,
                            limit,
                            resetTime: bucket.resetTime,
                        });
                    }
                }
                this.emitQuotaChangedEvent();
            }
            const hasAccess = quota.buckets?.some((b) => b.modelId && isPreviewModel(b.modelId, this)) ?? false;
            this.setHasAccessToPreviewModel(hasAccess);
            return quota;
        }
        catch (e) {
            debugLogger.debug('Failed to retrieve user quota', e);
            return undefined;
        }
    }
    async refreshUserQuotaIfStale(staleMs = 30_000) {
        const now = Date.now();
        if (now - this.lastQuotaFetchTime > staleMs) {
            return this.refreshUserQuota();
        }
        return this.lastRetrievedQuota;
    }
    getLastRetrievedQuota() {
        return this.lastRetrievedQuota;
    }
    getRemainingQuotaForModel(modelId) {
        const bucket = this.lastRetrievedQuota?.buckets?.find((b) => b.modelId === modelId);
        if (!bucket)
            return undefined;
        return {
            remainingAmount: bucket.remainingAmount
                ? parseInt(bucket.remainingAmount, 10)
                : undefined,
            remainingFraction: bucket.remainingFraction,
            resetTime: bucket.resetTime,
        };
    }
    getCoreTools() {
        return this.coreTools;
    }
    getMainAgentTools() {
        return this.mainAgentTools;
    }
    getAllowedTools() {
        return this.allowedTools;
    }
    /**
     * All the excluded tools from static configuration, loaded extensions, or
     * other sources (like the Policy Engine).
     *
     * May change over time.
     */
    getExcludeTools(toolMetadata, allToolNames) {
        // Right now this is present for backward compatibility with settings.json exclude
        const excludeToolsSet = new Set([...(this.excludeTools ?? [])]);
        for (const extension of this.getExtensionLoader().getExtensions()) {
            if (!extension.isActive) {
                continue;
            }
            for (const tool of extension.excludeTools || []) {
                excludeToolsSet.add(tool);
            }
        }
        const policyExclusions = this.policyEngine.getExcludedTools(toolMetadata, allToolNames);
        for (const tool of policyExclusions) {
            excludeToolsSet.add(tool);
        }
        return excludeToolsSet;
    }
    getToolDiscoveryCommand() {
        return this.toolDiscoveryCommand;
    }
    getToolCallCommand() {
        return this.toolCallCommand;
    }
    getMcpServerCommand() {
        return this.mcpServerCommand;
    }
    /**
     * The user configured MCP servers (via gemini settings files).
     *
     * Does NOT include mcp servers configured by extensions.
     */
    getMcpServers() {
        return this.mcpServers;
    }
    getMcpEnabled() {
        return this.mcpEnabled;
    }
    getMcpEnablementCallbacks() {
        return this.mcpEnablementCallbacks;
    }
    getExtensionsEnabled() {
        return this.extensionsEnabled;
    }
    getExtensionRegistryURI() {
        return this.extensionRegistryURI;
    }
    getMcpClientManager() {
        return this.mcpClientManager;
    }
    getA2AClientManager() {
        return this.a2aClientManager;
    }
    setUserInteractedWithMcp() {
        this.mcpClientManager?.setUserInteractedWithMcp();
    }
    /** @deprecated Use getMcpClientManager().getLastError() directly */
    getLastMcpError(serverName) {
        return this.mcpClientManager?.getLastError(serverName);
    }
    emitMcpDiagnostic(severity, message, error, serverName) {
        if (this.mcpClientManager) {
            this.mcpClientManager.emitDiagnostic(severity, message, error, serverName);
        }
        else {
            coreEvents.emitFeedback(severity, message, error);
        }
    }
    getAllowedMcpServers() {
        return this.allowedMcpServers;
    }
    getBlockedMcpServers() {
        return this.blockedMcpServers;
    }
    get sanitizationConfig() {
        return {
            allowedEnvironmentVariables: this.allowedEnvironmentVariables,
            blockedEnvironmentVariables: this.blockedEnvironmentVariables,
            enableEnvironmentVariableRedaction: this.enableEnvironmentVariableRedaction,
        };
    }
    setMcpServers(mcpServers) {
        this.mcpServers = mcpServers;
    }
    getUserMemory() {
        if (this.experimentalJitContext && this.memoryContextManager) {
            return {
                global: this.memoryContextManager.getGlobalMemory(),
                extension: this.memoryContextManager.getExtensionMemory(),
                project: this.memoryContextManager.getEnvironmentMemory(),
                userProjectMemory: this.memoryContextManager.getUserProjectMemory(),
            };
        }
        return this.userMemory;
    }
    /**
     * Refreshes the MCP context, including memory, tools, and system instructions.
     */
    async refreshMcpContext() {
        if (this.experimentalJitContext && this.memoryContextManager) {
            await this.memoryContextManager.refresh();
        }
        else {
            const { refreshServerHierarchicalMemory } = await import('../utils/memoryDiscovery.js');
            await refreshServerHierarchicalMemory(this);
        }
        if (this._geminiClient?.isInitialized()) {
            await this._geminiClient.setTools();
            this._geminiClient.updateSystemInstruction();
        }
    }
    setUserMemory(newUserMemory) {
        this.userMemory = newUserMemory;
    }
    /**
     * Returns memory for the system instruction.
     * When JIT is enabled, global memory and user project memory (Tier 1) go
     * in the system instruction. Extension and project memory (Tier 2) are
     * placed in the first user message instead, per the tiered context model.
     * User project memory is in Tier 1 so mid-session saves are reflected
     * via system instruction updates.
     */
    getSystemInstructionMemory() {
        if (this.experimentalJitContext && this.memoryContextManager) {
            const global = this.memoryContextManager.getGlobalMemory();
            const userProjectMemory = this.memoryContextManager.getUserProjectMemory();
            if (userProjectMemory?.trim()) {
                return { global, userProjectMemory };
            }
            return global;
        }
        return this.userMemory;
    }
    /**
     * Returns Tier 2 memory (extension + project) for injection into the first
     * user message when JIT is enabled. Returns empty string when JIT is
     * disabled (Tier 2 memory is already in the system instruction).
     */
    getSessionMemory() {
        if (!this.experimentalJitContext || !this.memoryContextManager) {
            return '';
        }
        const sections = [];
        const extension = this.memoryContextManager.getExtensionMemory();
        const project = this.memoryContextManager.getEnvironmentMemory();
        if (extension?.trim()) {
            sections.push(`<extension_context>\n${extension.trim()}\n</extension_context>`);
        }
        if (project?.trim()) {
            sections.push(`<project_context>\n${project.trim()}\n</project_context>`);
        }
        if (sections.length === 0)
            return '';
        return `\n<loaded_context>\n${sections.join('\n')}\n</loaded_context>`;
    }
    getGlobalMemory() {
        return this.memoryContextManager?.getGlobalMemory() ?? '';
    }
    getEnvironmentMemory() {
        return this.memoryContextManager?.getEnvironmentMemory() ?? '';
    }
    getMemoryContextManager() {
        return this.memoryContextManager;
    }
    isJitContextEnabled() {
        return this.experimentalJitContext;
    }
    isContextManagementEnabled() {
        return this.contextManagement.enabled;
    }
    getMemoryBoundaryMarkers() {
        return this.memoryBoundaryMarkers;
    }
    isMemoryManagerEnabled() {
        return this.experimentalMemoryManager;
    }
    isAutoMemoryEnabled() {
        return this.experimentalAutoMemory;
    }
    getExperimentalContextManagementConfig() {
        return this.experimentalContextManagementConfig;
    }
    getContextManagementConfig() {
        return this.contextManagement;
    }
    get agentHistoryProviderConfig() {
        return {
            maxTokens: this.contextManagement.historyWindow.maxTokens,
            retainedTokens: this.contextManagement.historyWindow.retainedTokens,
            normalMessageTokens: this.contextManagement.messageLimits.normalMaxTokens,
            maximumMessageTokens: this.contextManagement.messageLimits.retainedMaxTokens,
            normalizationHeadRatio: this.contextManagement.messageLimits.normalizationHeadRatio,
        };
    }
    isTopicUpdateNarrationEnabled() {
        return this.topicUpdateNarration;
    }
    isModelSteeringEnabled() {
        return this.modelSteering;
    }
    async getToolOutputMaskingConfig() {
        await this.ensureExperimentsLoaded();
        const remoteProtection = this.experiments?.flags[ExperimentFlags.MASKING_PROTECTION_THRESHOLD]
            ?.intValue;
        const remotePrunable = this.experiments?.flags[ExperimentFlags.MASKING_PRUNABLE_THRESHOLD]
            ?.intValue;
        const remoteProtectLatest = this.experiments?.flags[ExperimentFlags.MASKING_PROTECT_LATEST_TURN]
            ?.boolValue;
        const parsedProtection = remoteProtection
            ? parseInt(remoteProtection, 10)
            : undefined;
        const parsedPrunable = remotePrunable
            ? parseInt(remotePrunable, 10)
            : undefined;
        return {
            protectionThresholdTokens: parsedProtection !== undefined && !isNaN(parsedProtection)
                ? parsedProtection
                : this.contextManagement.tools.outputMasking
                    .protectionThresholdTokens,
            minPrunableThresholdTokens: parsedPrunable !== undefined && !isNaN(parsedPrunable)
                ? parsedPrunable
                : this.contextManagement.tools.outputMasking
                    .minPrunableThresholdTokens,
            protectLatestTurn: remoteProtectLatest ??
                this.contextManagement.tools.outputMasking.protectLatestTurn,
        };
    }
    getGeminiMdFileCount() {
        if (this.experimentalJitContext && this.memoryContextManager) {
            return this.memoryContextManager.getLoadedPaths().size;
        }
        return this.geminiMdFileCount;
    }
    setGeminiMdFileCount(count) {
        this.geminiMdFileCount = count;
    }
    getGeminiMdFilePaths() {
        if (this.experimentalJitContext && this.memoryContextManager) {
            return Array.from(this.memoryContextManager.getLoadedPaths());
        }
        return this.geminiMdFilePaths;
    }
    getWorkspacePoliciesDir() {
        return this.workspacePoliciesDir;
    }
    setGeminiMdFilePaths(paths) {
        this.geminiMdFilePaths = paths;
    }
    getApprovalMode() {
        return this.policyEngine.getApprovalMode();
    }
    isPlanMode() {
        return this.getApprovalMode() === ApprovalMode.PLAN;
    }
    getPolicyUpdateConfirmationRequest() {
        return this.policyUpdateConfirmationRequest;
    }
    /**
     * Hot-loads workspace policies from the specified directory into the active policy engine.
     * This allows applying newly accepted policies without requiring an application restart.
     *
     * @param policyDir The directory containing the workspace policy TOML files.
     */
    async loadWorkspacePolicies(policyDir) {
        const { rules, checkers } = await loadPoliciesFromToml([policyDir], () => WORKSPACE_POLICY_TIER);
        // Clear existing workspace policies to prevent duplicates/stale rules
        this.policyEngine.removeRulesByTier(WORKSPACE_POLICY_TIER);
        this.policyEngine.removeCheckersByTier(WORKSPACE_POLICY_TIER);
        for (const rule of rules) {
            this.policyEngine.addRule(rule);
        }
        for (const checker of checkers) {
            this.policyEngine.addChecker(checker);
        }
        this.policyUpdateConfirmationRequest = undefined;
        debugLogger.debug(`Workspace policies loaded from: ${policyDir}`);
    }
    setApprovalMode(mode) {
        if (!this.isTrustedFolder() &&
            mode !== ApprovalMode.DEFAULT &&
            mode !== ApprovalMode.PLAN) {
            throw new Error('Cannot enable privileged approval modes in an untrusted folder.');
        }
        const currentMode = this.getApprovalMode();
        if (currentMode !== mode) {
            this.logCurrentModeDuration(currentMode);
            logApprovalModeSwitch(this, new ApprovalModeSwitchEvent(currentMode, mode));
        }
        this.policyEngine.setApprovalMode(mode);
        this.refreshSandboxManager();
        const isPlanModeTransition = currentMode !== mode &&
            (currentMode === ApprovalMode.PLAN || mode === ApprovalMode.PLAN);
        const isYoloModeTransition = currentMode !== mode &&
            (currentMode === ApprovalMode.YOLO || mode === ApprovalMode.YOLO);
        if (isPlanModeTransition || isYoloModeTransition) {
            if (this._geminiClient?.isInitialized()) {
                this._geminiClient.clearCurrentSequenceModel();
                this._geminiClient.setTools().catch((err) => {
                    debugLogger.error('Failed to update tools', err);
                });
            }
            this.updateSystemInstructionIfInitialized();
        }
    }
    /**
     * Logs the duration of the current approval mode.
     */
    logCurrentModeDuration(mode) {
        const now = performance.now();
        const duration = now - this.lastModeSwitchTime;
        if (duration > 0) {
            logApprovalModeDuration(this, new ApprovalModeDurationEvent(mode, duration));
        }
        this.lastModeSwitchTime = now;
    }
    isYoloModeDisabled() {
        return this.disableYoloMode || !this.isTrustedFolder();
    }
    getDisableAlwaysAllow() {
        return this.disableAlwaysAllow;
    }
    getRawOutput() {
        return this.rawOutput;
    }
    getAcceptRawOutputRisk() {
        return this.acceptRawOutputRisk;
    }
    getExperimentalDynamicModelConfiguration() {
        return this.dynamicModelConfiguration;
    }
    getPendingIncludeDirectories() {
        return this.pendingIncludeDirectories;
    }
    clearPendingIncludeDirectories() {
        this.pendingIncludeDirectories = [];
    }
    getShowMemoryUsage() {
        return this.showMemoryUsage;
    }
    getAccessibility() {
        return this.accessibility;
    }
    getTelemetryEnabled() {
        return this.telemetrySettings.enabled ?? false;
    }
    getTelemetryLogPromptsEnabled() {
        return this.telemetrySettings.logPrompts ?? true;
    }
    getTelemetryOtlpEndpoint() {
        return this.telemetrySettings.otlpEndpoint ?? DEFAULT_OTLP_ENDPOINT;
    }
    getTelemetryOtlpProtocol() {
        return this.telemetrySettings.otlpProtocol ?? 'grpc';
    }
    getTelemetryTarget() {
        return this.telemetrySettings.target ?? DEFAULT_TELEMETRY_TARGET;
    }
    getTelemetryOutfile() {
        return this.telemetrySettings.outfile;
    }
    getBillingSettings() {
        return this.billing;
    }
    /**
     * Updates the overage strategy at runtime.
     * Used to switch from 'ask' to 'always' after the user accepts credits
     * via the overage dialog, so subsequent API calls auto-include credits.
     */
    setOverageStrategy(strategy) {
        this.billing.overageStrategy = strategy;
    }
    getTelemetryUseCollector() {
        return this.telemetrySettings.useCollector ?? false;
    }
    getTelemetryUseCliAuth() {
        return this.telemetrySettings.useCliAuth ?? false;
    }
    /** @deprecated Use geminiClient getter */
    getGeminiClient() {
        return this.geminiClient;
    }
    /**
     * Updates the system instruction with the latest user memory.
     * Whenever the user memory (GEMINI.md files) is updated.
     */
    updateSystemInstructionIfInitialized() {
        const geminiClient = this.geminiClient;
        if (geminiClient?.isInitialized()) {
            geminiClient.updateSystemInstruction();
        }
    }
    getModelRouterService() {
        return this.modelRouterService;
    }
    getModelConfigService() {
        return this.modelConfigService;
    }
    getModelAvailabilityService() {
        return this.modelAvailabilityService;
    }
    getEnableRecursiveFileSearch() {
        return this.fileFiltering.enableRecursiveFileSearch;
    }
    getFileFilteringEnableFuzzySearch() {
        return this.fileFiltering.enableFuzzySearch;
    }
    getFileFilteringRespectGitIgnore() {
        return this.fileFiltering.respectGitIgnore;
    }
    getFileFilteringRespectGeminiIgnore() {
        return this.fileFiltering.respectGeminiIgnore;
    }
    getCustomIgnoreFilePaths() {
        return this.fileFiltering.customIgnoreFilePaths;
    }
    getFileFilteringOptions() {
        return {
            respectGitIgnore: this.fileFiltering.respectGitIgnore,
            respectGeminiIgnore: this.fileFiltering.respectGeminiIgnore,
            maxFileCount: this.fileFiltering.maxFileCount,
            searchTimeout: this.fileFiltering.searchTimeout,
            customIgnoreFilePaths: this.fileFiltering.customIgnoreFilePaths,
        };
    }
    /**
     * Gets custom file exclusion patterns from configuration.
     * TODO: This is a placeholder implementation. In the future, this could
     * read from settings files, CLI arguments, or environment variables.
     */
    getCustomExcludes() {
        // Placeholder implementation - returns empty array for now
        // Future implementation could read from:
        // - User settings file
        // - Project-specific configuration
        // - Environment variables
        // - CLI arguments
        return [];
    }
    getCheckpointingEnabled() {
        return this.checkpointing;
    }
    getProxy() {
        return this.proxy;
    }
    getWorkingDir() {
        return this.cwd;
    }
    getBugCommand() {
        return this.bugCommand;
    }
    getTrackerService() {
        if (!this.trackerService) {
            this.trackerService = new TrackerService(this.storage.getProjectTempTrackerDir());
        }
        return this.trackerService;
    }
    getFileService() {
        if (!this.fileDiscoveryService) {
            this.fileDiscoveryService = new FileDiscoveryService(this.targetDir, {
                respectGitIgnore: this.fileFiltering.respectGitIgnore,
                respectGeminiIgnore: this.fileFiltering.respectGeminiIgnore,
                customIgnoreFilePaths: this.fileFiltering.customIgnoreFilePaths,
            });
        }
        return this.fileDiscoveryService;
    }
    getUsageStatisticsEnabled() {
        return this.usageStatisticsEnabled;
    }
    getAcpMode() {
        return this.acpMode;
    }
    async waitForMcpInit() {
        if (this.mcpInitializationPromise) {
            await this.mcpInitializationPromise;
        }
    }
    getListExtensions() {
        return this.listExtensions;
    }
    getListSessions() {
        return this.listSessions;
    }
    getDeleteSession() {
        return this.deleteSession;
    }
    getExtensionManagement() {
        return this.extensionManagement;
    }
    getExtensions() {
        return this._extensionLoader.getExtensions();
    }
    getExtensionLoader() {
        return this._extensionLoader;
    }
    // The list of explicitly enabled extensions, if any were given, may contain
    // the string "none".
    getEnabledExtensions() {
        return this._enabledExtensions;
    }
    getEnableExtensionReloading() {
        return this.enableExtensionReloading;
    }
    getDisableLLMCorrection() {
        return this.disableLLMCorrection;
    }
    isPlanEnabled() {
        return this.planEnabled;
    }
    isTrackerEnabled() {
        return this.trackerEnabled;
    }
    getApprovedPlanPath() {
        return this.approvedPlanPath;
    }
    getDirectWebFetch() {
        return this.directWebFetch;
    }
    setApprovedPlanPath(path) {
        this.approvedPlanPath = path;
    }
    isAgentsEnabled() {
        return this.enableAgents;
    }
    isEventDrivenSchedulerEnabled() {
        return this.enableEventDrivenScheduler;
    }
    getNoBrowser() {
        return this.noBrowser;
    }
    getAgentsSettings() {
        return this.agents;
    }
    isBrowserLaunchSuppressed() {
        return this.getNoBrowser() || !shouldAttemptBrowserLaunch();
    }
    getSummarizeToolOutputConfig() {
        return this.summarizeToolOutput;
    }
    getIdeMode() {
        return this.ideMode;
    }
    /**
     * Returns 'true' if the folder trust feature is enabled.
     */
    getFolderTrust() {
        return this.folderTrust;
    }
    /**
     * Returns 'true' if the workspace is considered "trusted".
     * 'false' for untrusted.
     */
    isTrustedFolder() {
        const context = ideContextStore.get();
        if (context?.workspaceState?.isTrusted !== undefined) {
            return context.workspaceState.isTrusted;
        }
        // Default to untrusted if folder trust is enabled and no explicit value is set.
        return this.folderTrust ? (this.trustedFolder ?? false) : true;
    }
    setIdeMode(value) {
        this.ideMode = value;
    }
    /**
     * Get the current FileSystemService
     */
    getFileSystemService() {
        return this.fileSystemService;
    }
    /**
     * Checks if a given absolute path is allowed for file system operations.
     * A path is allowed if it's within the workspace context or the project's temporary directory.
     *
     * @param absolutePath The absolute path to check.
     * @returns true if the path is allowed, false otherwise.
     */
    isPathAllowed(absolutePath) {
        const resolvedPath = resolveToRealPath(absolutePath);
        const workspaceContext = this.getWorkspaceContext();
        if (workspaceContext.isPathWithinWorkspace(resolvedPath)) {
            return true;
        }
        const projectTempDir = this.storage.getProjectTempDir();
        const resolvedTempDir = resolveToRealPath(projectTempDir);
        return isSubpath(resolvedTempDir, resolvedPath);
    }
    /**
     * Validates if a path is allowed and returns a detailed error message if not.
     *
     * @param absolutePath The absolute path to validate.
     * @param checkType The type of access to check ('read' or 'write'). Defaults to 'write' for safety.
     * @returns An error message string if the path is disallowed, null otherwise.
     */
    validatePathAccess(absolutePath, checkType = 'write') {
        // For read operations, check read-only paths first
        if (checkType === 'read') {
            if (this.getWorkspaceContext().isPathReadable(absolutePath)) {
                return null;
            }
        }
        // Then check standard allowed paths (Workspace + Temp)
        // This covers 'write' checks and acts as a fallback/temp-dir check for 'read'
        if (this.isPathAllowed(absolutePath)) {
            return null;
        }
        const workspaceDirs = this.getWorkspaceContext().getDirectories();
        const projectTempDir = this.storage.getProjectTempDir();
        return `Path not in workspace: Attempted path "${absolutePath}" resolves outside the allowed workspace directories: ${workspaceDirs.join(', ')} or the project temp directory: ${projectTempDir}`;
    }
    /**
     * Set a custom FileSystemService
     */
    setFileSystemService(fileSystemService) {
        this.fileSystemService = fileSystemService;
    }
    async getCompressionThreshold() {
        if (this.compressionThreshold) {
            return this.compressionThreshold;
        }
        await this.ensureExperimentsLoaded();
        const remoteThreshold = this.experiments?.flags[ExperimentFlags.CONTEXT_COMPRESSION_THRESHOLD]
            ?.floatValue;
        if (remoteThreshold === 0) {
            return undefined;
        }
        return remoteThreshold;
    }
    async getUserCaching() {
        await this.ensureExperimentsLoaded();
        return this.experiments?.flags[ExperimentFlags.USER_CACHING]?.boolValue;
    }
    async getPlanModeRoutingEnabled() {
        return this.planModeRoutingEnabled;
    }
    async getNumericalRoutingEnabled() {
        await this.ensureExperimentsLoaded();
        const flag = this.experiments?.flags[ExperimentFlags.ENABLE_NUMERICAL_ROUTING];
        return flag?.boolValue ?? true;
    }
    /**
     * Returns the resolved complexity threshold for routing.
     * If a remote threshold is provided and within range (0-100), it is returned.
     * Otherwise, the default threshold (90) is returned.
     */
    async getResolvedClassifierThreshold() {
        const remoteValue = await this.getClassifierThreshold();
        const defaultValue = 90;
        if (remoteValue !== undefined &&
            !isNaN(remoteValue) &&
            remoteValue >= 0 &&
            remoteValue <= 100) {
            return remoteValue;
        }
        return defaultValue;
    }
    async getClassifierThreshold() {
        await this.ensureExperimentsLoaded();
        const flag = this.experiments?.flags[ExperimentFlags.CLASSIFIER_THRESHOLD];
        if (flag?.intValue !== undefined) {
            return parseInt(flag.intValue, 10);
        }
        return flag?.floatValue;
    }
    async getBannerTextNoCapacityIssues() {
        await this.ensureExperimentsLoaded();
        return (this.experiments?.flags[ExperimentFlags.BANNER_TEXT_NO_CAPACITY_ISSUES]
            ?.stringValue ?? '');
    }
    async getBannerTextCapacityIssues() {
        await this.ensureExperimentsLoaded();
        return (this.experiments?.flags[ExperimentFlags.BANNER_TEXT_CAPACITY_ISSUES]
            ?.stringValue ?? '');
    }
    /**
     * Returns whether the user has access to Pro models.
     * This is determined by the PRO_MODEL_NO_ACCESS experiment flag.
     */
    async getProModelNoAccess() {
        await this.ensureExperimentsLoaded();
        return this.getProModelNoAccessSync();
    }
    /**
     * Returns whether the user has access to Pro models synchronously.
     *
     * Note: This method should only be called after startup, once experiments have been loaded.
     */
    getProModelNoAccessSync() {
        if (this.contentGeneratorConfig?.authType !== AuthType.LOGIN_WITH_GOOGLE) {
            return false;
        }
        return (this.experiments?.flags[ExperimentFlags.PRO_MODEL_NO_ACCESS]?.boolValue ??
            false);
    }
    /**
     * Returns whether Gemini 3.1 Pro has been launched.
     * This method is async and ensures that experiments are loaded before returning the result.
     */
    async getGemini31Launched() {
        await this.ensureExperimentsLoaded();
        return this.getGemini31LaunchedSync();
    }
    /**
     * Returns whether Gemini 3.1 Flash Lite has been launched.
     * This method is async and ensures that experiments are loaded before returning the result.
     */
    async getGemini31FlashLiteLaunched() {
        await this.ensureExperimentsLoaded();
        return this.getGemini31FlashLiteLaunchedSync();
    }
    /**
     * Returns whether the custom tool model should be used.
     */
    async getUseCustomToolModel() {
        const useGemini3_1 = await this.getGemini31Launched();
        const authType = this.contentGeneratorConfig?.authType;
        return useGemini3_1 && authType === AuthType.USE_GEMINI;
    }
    /**
     * Returns whether the custom tool model should be used.
     *
     * Note: This method should only be called after startup, once experiments have been loaded.
     */
    getUseCustomToolModelSync() {
        const useGemini3_1 = this.getGemini31LaunchedSync();
        const authType = this.contentGeneratorConfig?.authType;
        return useGemini3_1 && authType === AuthType.USE_GEMINI;
    }
    isGemini31LaunchedForAuthType(authType) {
        return (authType === AuthType.USE_GEMINI ||
            authType === AuthType.USE_VERTEX_AI ||
            authType === AuthType.GATEWAY);
    }
    /**
     * Returns whether Gemini 3.1 has been launched.
     *
     * Note: This method should only be called after startup, once experiments have been loaded.
     * If you need to call this during startup or from an async context, use
     * getGemini31Launched instead.
     */
    getGemini31LaunchedSync() {
        const authType = this.contentGeneratorConfig?.authType;
        if (this.isGemini31LaunchedForAuthType(authType)) {
            return true;
        }
        return (this.experiments?.flags[ExperimentFlags.GEMINI_3_1_PRO_LAUNCHED]
            ?.boolValue ?? false);
    }
    /**
     * Returns the configured default request timeout in milliseconds.
     */
    getRequestTimeoutMs() {
        const flag = this.experiments?.flags?.[ExperimentFlags.DEFAULT_REQUEST_TIMEOUT];
        if (flag?.intValue !== undefined) {
            const seconds = parseInt(flag.intValue, 10);
            if (Number.isInteger(seconds) && seconds >= 0) {
                return seconds * 1000; // Convert seconds to milliseconds
            }
        }
        return undefined;
    }
    /**
     * Returns whether Gemini 3.1 Flash Lite has been launched.
     *
     * Note: This method should only be called after startup, once experiments have been loaded.
     * If you need to call this during startup or from an async context, use
     * getGemini31FlashLiteLaunched instead.
     */
    getGemini31FlashLiteLaunchedSync() {
        const authType = this.contentGeneratorConfig?.authType;
        if (this.isGemini31LaunchedForAuthType(authType)) {
            return true;
        }
        return (this.experiments?.flags[ExperimentFlags.GEMINI_3_1_FLASH_LITE_LAUNCHED]
            ?.boolValue ?? false);
    }
    async ensureExperimentsLoaded() {
        if (!this.experimentsPromise) {
            return;
        }
        try {
            await this.experimentsPromise;
        }
        catch (e) {
            debugLogger.debug('Failed to fetch experiments', e);
        }
    }
    isInteractiveShellEnabled() {
        return (this.interactive &&
            this.ptyInfo !== 'child_process' &&
            this.enableInteractiveShell);
    }
    isSkillsSupportEnabled() {
        return this.skillsSupport;
    }
    /**
     * Reloads skills by re-discovering them from extensions and local directories.
     */
    async reloadSkills() {
        if (!this.skillsSupport) {
            return;
        }
        if (this.onReload) {
            const refreshed = await this.onReload();
            this.disabledSkills = refreshed.disabledSkills ?? [];
            this.getSkillManager().setAdminSettings(refreshed.adminSkillsEnabled ?? this.adminSkillsEnabled);
        }
        if (this.getSkillManager().isAdminEnabled()) {
            await this.getSkillManager().discoverSkills(this.storage, this.getExtensions(), this.isTrustedFolder());
            this.getSkillManager().setDisabledSkills(this.disabledSkills);
            // Re-register ActivateSkillTool to update its schema with the newly discovered skills
            if (this.getSkillManager().getSkills().length > 0) {
                this.toolRegistry.unregisterTool(ActivateSkillTool.Name);
                this.toolRegistry.registerTool(new ActivateSkillTool(this, this.messageBus));
            }
            else {
                this.toolRegistry.unregisterTool(ActivateSkillTool.Name);
            }
        }
        else {
            this.getSkillManager().clearSkills();
            this.toolRegistry.unregisterTool(ActivateSkillTool.Name);
        }
        // Notify the client that system instructions might need updating
        this.updateSystemInstructionIfInitialized();
    }
    /**
     * Reloads agent settings.
     */
    async reloadAgents() {
        if (this.onReload) {
            const refreshed = await this.onReload();
            if (refreshed.agents) {
                this.agents = refreshed.agents;
            }
        }
    }
    isInteractive() {
        return this.interactive;
    }
    getUseRipgrep() {
        return this.useRipgrep;
    }
    getUseBackgroundColor() {
        return this.useBackgroundColor;
    }
    getUseAlternateBuffer() {
        return this.useAlternateBuffer;
    }
    getUseTerminalBuffer() {
        return this.useTerminalBuffer;
    }
    getUseRenderProcess() {
        return this.useRenderProcess;
    }
    getEnableInteractiveShell() {
        return this.enableInteractiveShell;
    }
    getShellBackgroundCompletionBehavior() {
        return this.shellBackgroundCompletionBehavior;
    }
    getSkipNextSpeakerCheck() {
        return this.skipNextSpeakerCheck;
    }
    getContinueOnFailedApiCall() {
        return this.continueOnFailedApiCall;
    }
    getRetryFetchErrors() {
        return this.retryFetchErrors;
    }
    getMaxAttempts() {
        return this.maxAttempts;
    }
    getEnableShellOutputEfficiency() {
        return this.enableShellOutputEfficiency;
    }
    getShellToolInactivityTimeout() {
        return this.shellToolInactivityTimeout;
    }
    getShellExecutionConfig() {
        return this.shellExecutionConfig;
    }
    setShellExecutionConfig(config) {
        const definedConfig = {};
        for (const [k, v] of Object.entries(config)) {
            // Only merge properties explicitly provided with a concrete value.
            // Filtering out `null` and `undefined` ensures existing system defaults
            // are preserved when an extension doesn't want to override them.
            if (v != null) {
                Object.assign(definedConfig, { [k]: v });
            }
        }
        // Note: This performs a shallow merge. If the incoming config provides a nested
        // object (e.g., sandboxConfig), it will completely overwrite the existing
        // nested object rather than merging its individual properties.
        this.shellExecutionConfig = {
            ...this.shellExecutionConfig,
            ...definedConfig,
        };
    }
    getScreenReader() {
        return this.accessibility.screenReader ?? false;
    }
    getTruncateToolOutputThreshold() {
        return Math.min(
        // Estimate remaining context window in characters (1 token ~= 4 chars).
        4 *
            (tokenLimit(this.model) - uiTelemetryService.getLastPromptTokenCount()), this.truncateToolOutputThreshold);
    }
    getToolMaxOutputTokens() {
        return this.contextManagement.tools.distillation.maxOutputTokens;
    }
    getToolSummarizationThresholdTokens() {
        return this.contextManagement.tools.distillation
            .summarizationThresholdTokens;
    }
    getNextCompressionTruncationId() {
        return ++this.compressionTruncationCounter;
    }
    getUseWriteTodos() {
        return this.useWriteTodos;
    }
    getOutputFormat() {
        return this.outputSettings?.format
            ? this.outputSettings.format
            : OutputFormat.TEXT;
    }
    async getGitService() {
        if (!this.gitService) {
            this.gitService = new GitService(this.targetDir, this.storage);
            await this.gitService.initialize();
        }
        return this.gitService;
    }
    getFileExclusions() {
        return this.fileExclusions;
    }
    /** @deprecated Use messageBus getter */
    getMessageBus() {
        return this.messageBus;
    }
    getPolicyEngine() {
        return this.policyEngine;
    }
    getEnableHooks() {
        return this.enableHooks;
    }
    getEnableHooksUI() {
        return this.enableHooksUI;
    }
    getGemmaModelRouterEnabled() {
        return this.gemmaModelRouter.enabled ?? false;
    }
    getGemmaModelRouterSettings() {
        return this.gemmaModelRouter;
    }
    getAgentSessionNoninteractiveEnabled() {
        return this.agentSessionNoninteractiveEnabled;
    }
    getAgentSessionInteractiveEnabled() {
        return this.agentSessionInteractiveEnabled;
    }
    /**
     * Get override settings for a specific agent.
     * Reads from agents.overrides.<agentName>.
     */
    getAgentOverride(agentName) {
        return this.getAgentsSettings()?.overrides?.[agentName];
    }
    /**
     * Get browser agent configuration.
     * Combines generic AgentOverride fields with browser-specific customConfig.
     * This is the canonical way to access browser agent settings.
     */
    getBrowserAgentConfig() {
        const override = this.getAgentOverride('browser_agent');
        const customConfig = this.getAgentsSettings()?.browser ?? {};
        return {
            enabled: override?.enabled ?? false,
            model: override?.modelConfig?.model,
            customConfig: {
                sessionMode: customConfig.sessionMode ?? 'persistent',
                headless: customConfig.headless ?? false,
                profilePath: customConfig.profilePath,
                visualModel: customConfig.visualModel,
                allowedDomains: customConfig.allowedDomains,
                disableUserInput: customConfig.disableUserInput,
                maxActionsPerTask: customConfig.maxActionsPerTask ?? 100,
                confirmSensitiveActions: customConfig.confirmSensitiveActions,
                blockFileUploads: customConfig.blockFileUploads,
            },
        };
    }
    /**
     * Determines if user input should be disabled during browser automation.
     * Based on the `disableUserInput` setting and `headless` mode.
     */
    shouldDisableBrowserUserInput() {
        const browserConfig = this.getBrowserAgentConfig();
        return (browserConfig.customConfig?.disableUserInput !== false &&
            !browserConfig.customConfig?.headless);
    }
    async createToolRegistry() {
        const registry = new ToolRegistry(this, this.messageBus, 
        /* isMainRegistry= */ true);
        // helper to create & register core tools that are enabled
        const maybeRegister = (toolClass, registerFn) => {
            const className = toolClass.name;
            const toolName = toolClass.Name || className;
            const coreTools = this.getCoreTools();
            // On some platforms, the className can be minified to _ClassName.
            const normalizedClassName = className.replace(/^_+/, '');
            let isEnabled = true; // Enabled by default if coreTools is not set.
            if (coreTools) {
                isEnabled = coreTools.some((tool) => tool === toolName ||
                    tool === normalizedClassName ||
                    tool.startsWith(`${toolName}(`) ||
                    tool.startsWith(`${normalizedClassName}(`));
            }
            if (isEnabled) {
                registerFn();
            }
        };
        maybeRegister(UpdateTopicTool, () => registry.registerTool(new UpdateTopicTool(this, this.messageBus)));
        maybeRegister(LSTool, () => registry.registerTool(new LSTool(this, this.messageBus)));
        maybeRegister(ReadFileTool, () => registry.registerTool(new ReadFileTool(this, this.messageBus)));
        if (this.getUseRipgrep()) {
            let useRipgrep = false;
            let errorString = undefined;
            try {
                useRipgrep = await canUseRipgrep();
            }
            catch (error) {
                errorString = String(error);
            }
            if (useRipgrep) {
                maybeRegister(RipGrepTool, () => registry.registerTool(new RipGrepTool(this, this.messageBus)));
            }
            else {
                debugLogger.warn(`Ripgrep is not available. Falling back to GrepTool.`);
                logRipgrepFallback(this, new RipgrepFallbackEvent(errorString));
                maybeRegister(GrepTool, () => registry.registerTool(new GrepTool(this, this.messageBus)));
            }
        }
        else {
            maybeRegister(GrepTool, () => registry.registerTool(new GrepTool(this, this.messageBus)));
        }
        maybeRegister(GlobTool, () => registry.registerTool(new GlobTool(this, this.messageBus)));
        maybeRegister(ActivateSkillTool, () => registry.registerTool(new ActivateSkillTool(this, this.messageBus)));
        maybeRegister(EditTool, () => registry.registerTool(new EditTool(this, this.messageBus)));
        maybeRegister(WriteFileTool, () => registry.registerTool(new WriteFileTool(this, this.messageBus)));
        maybeRegister(WebFetchTool, () => registry.registerTool(new WebFetchTool(this, this.messageBus)));
        maybeRegister(ReadMcpResourceTool, () => registry.registerTool(new ReadMcpResourceTool(this, this.messageBus)));
        maybeRegister(ListMcpResourcesTool, () => registry.registerTool(new ListMcpResourcesTool(this, this.messageBus)));
        maybeRegister(ShellTool, () => registry.registerTool(new ShellTool(this, this.messageBus)));
        maybeRegister(ListBackgroundProcessesTool, () => registry.registerTool(new ListBackgroundProcessesTool(this, this.messageBus)));
        maybeRegister(ReadBackgroundOutputTool, () => registry.registerTool(new ReadBackgroundOutputTool(this, this.messageBus)));
        if (!this.isMemoryManagerEnabled()) {
            maybeRegister(MemoryTool, () => registry.registerTool(new MemoryTool(this.messageBus, this.storage)));
        }
        maybeRegister(WebSearchTool, () => registry.registerTool(new WebSearchTool(this, this.messageBus)));
        maybeRegister(AskUserTool, () => registry.registerTool(new AskUserTool(this.messageBus)));
        if (this.getUseWriteTodos()) {
            maybeRegister(WriteTodosTool, () => registry.registerTool(new WriteTodosTool(this.messageBus)));
        }
        if (this.isPlanEnabled()) {
            maybeRegister(ExitPlanModeTool, () => registry.registerTool(new ExitPlanModeTool(this, this.messageBus)));
            maybeRegister(EnterPlanModeTool, () => registry.registerTool(new EnterPlanModeTool(this, this.messageBus)));
        }
        if (this.isTrackerEnabled()) {
            maybeRegister(TrackerCreateTaskTool, () => registry.registerTool(new TrackerCreateTaskTool(this, this.messageBus)));
            maybeRegister(TrackerUpdateTaskTool, () => registry.registerTool(new TrackerUpdateTaskTool(this, this.messageBus)));
            maybeRegister(TrackerGetTaskTool, () => registry.registerTool(new TrackerGetTaskTool(this, this.messageBus)));
            maybeRegister(TrackerListTasksTool, () => registry.registerTool(new TrackerListTasksTool(this, this.messageBus)));
            maybeRegister(TrackerAddDependencyTool, () => registry.registerTool(new TrackerAddDependencyTool(this, this.messageBus)));
            maybeRegister(TrackerVisualizeTool, () => registry.registerTool(new TrackerVisualizeTool(this, this.messageBus)));
        }
        // Register Subagent Tool
        maybeRegister(AgentTool, () => registry.registerTool(new AgentTool(this, this.messageBus)));
        await registry.discoverAllTools();
        registry.sortTools();
        return registry;
    }
    /**
     * Get the hook system instance
     */
    getHookSystem() {
        return this.hookSystem;
    }
    /**
     * Get hooks configuration
     */
    getHooks() {
        return this.hooks;
    }
    /**
     * Get project-specific hooks configuration
     */
    getProjectHooks() {
        return this.projectHooks;
    }
    /**
     * Update the list of disabled hooks dynamically.
     * This is used to keep the running system in sync with settings changes
     * without risk of loading new hook definitions into memory.
     */
    updateDisabledHooks(disabledHooks) {
        this.disabledHooks = disabledHooks;
    }
    /**
     * Get disabled hooks list
     */
    getDisabledHooks() {
        return this.disabledHooks;
    }
    /**
     * Get experiments configuration
     */
    getExperiments() {
        return this.experiments;
    }
    /**
     * Set experiments configuration
     */
    setExperiments(experiments) {
        this.experiments = experiments;
        const flagSummaries = Object.entries(experiments.flags ?? {})
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([flagId, flag]) => {
            const summary = { flagId };
            if (flag.boolValue !== undefined) {
                summary['boolValue'] = flag.boolValue;
            }
            if (flag.floatValue !== undefined) {
                summary['floatValue'] = flag.floatValue;
            }
            if (flag.intValue !== undefined) {
                summary['intValue'] = flag.intValue;
            }
            if (flag.stringValue !== undefined) {
                summary['stringValue'] = flag.stringValue;
            }
            const int32Length = flag.int32ListValue?.values?.length ?? 0;
            if (int32Length > 0) {
                summary['int32ListLength'] = int32Length;
            }
            const stringListLength = flag.stringListValue?.values?.length ?? 0;
            if (stringListLength > 0) {
                summary['stringListLength'] = stringListLength;
            }
            return summary;
        });
        const summary = {
            experimentIds: experiments.experimentIds ?? [],
            flags: flagSummaries,
        };
        const summaryString = inspect(summary, {
            depth: null,
            maxArrayLength: null,
            maxStringLength: null,
            breakLength: 80,
            compact: false,
        });
        debugLogger.debug('Experiments loaded', summaryString);
    }
    onAgentsRefreshed = async () => {
        await this.agentRegistry.initialize();
        // Propagate updates to the active chat session
        const client = this.geminiClient;
        if (client?.isInitialized()) {
            await client.setTools();
            client.updateSystemInstruction();
        }
        else {
            debugLogger.debug('[Config] GeminiClient not initialized; skipping live prompt/tool refresh.');
        }
    };
    /**
     * Disposes of resources and removes event listeners.
     */
    async dispose() {
        this.logCurrentModeDuration(this.getApprovalMode());
        coreEvents.off(CoreEvent.AgentsRefreshed, this.onAgentsRefreshed);
        this.agentRegistry?.dispose();
        this._geminiClient?.dispose();
        if (this.mcpClientManager) {
            await this.mcpClientManager.stop();
        }
    }
}
// Export model constants for use in CLI
export { DEFAULT_GEMINI_FLASH_MODEL };
//# sourceMappingURL=config.js.map