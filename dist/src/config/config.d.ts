/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { SandboxPolicyManager } from '../policy/sandboxPolicyManager.js';
import { z } from 'zod';
import type { ConversationRecord } from '../services/chatRecordingService.js';
import type { AgentHistoryProviderConfig, ContextManagementConfig, ToolOutputMaskingConfig } from '../context/types.js';
export type { ConversationRecord };
import { AuthType, type ContentGenerator, type ContentGeneratorConfig } from '../core/contentGenerator.js';
import type { OverageStrategy } from '../billing/billing.js';
import { PromptRegistry } from '../prompts/prompt-registry.js';
import { ResourceRegistry } from '../resources/resource-registry.js';
import { ToolRegistry } from '../tools/tool-registry.js';
import { TopicState } from './topicState.js';
import { GeminiClient } from '../core/client.js';
import { BaseLlmClient } from '../core/baseLlmClient.js';
import { LocalLiteRtLmClient } from '../core/localLiteRtLmClient.js';
import type { HookDefinition, HookEventName } from '../hooks/types.js';
import { FileDiscoveryService } from '../services/fileDiscoveryService.js';
import { GitService } from '../services/gitService.js';
import { type SandboxManager } from '../services/sandboxManager.js';
import { type TelemetryTarget } from '../telemetry/index.js';
import { DEFAULT_GEMINI_FLASH_MODEL } from './models.js';
import type { MCPOAuthConfig } from '../mcp/oauth-provider.js';
import { type FileSystemService } from '../services/fileSystemService.js';
import type { FallbackModelHandler, ValidationHandler } from '../fallback/types.js';
import { ModelAvailabilityService } from '../availability/modelAvailabilityService.js';
import { ModelRouterService } from '../routing/modelRouterService.js';
import { OutputFormat } from '../output/types.js';
import { ModelConfigService, type ModelConfig, type ModelConfigServiceConfig } from '../services/modelConfigService.js';
import { MemoryContextManager } from '../context/memoryContextManager.js';
import { TrackerService } from '../services/trackerService.js';
import type { GenerateContentParameters } from '@google/genai';
export type { MCPOAuthConfig, AnyToolInvocation, AnyDeclarativeTool };
import type { AnyToolInvocation, AnyDeclarativeTool } from '../tools/tools.js';
import { WorkspaceContext } from '../utils/workspaceContext.js';
import { Storage } from './storage.js';
import type { ShellExecutionConfig } from '../services/shellExecutionService.js';
import { FileExclusions } from '../utils/ignorePatterns.js';
import { MessageBus } from '../confirmation-bus/message-bus.js';
import type { EventEmitter } from 'node:events';
import { PolicyEngine } from '../policy/policy-engine.js';
import { ApprovalMode, type PolicyEngineConfig, type PolicyRule, type SafetyCheckerRule } from '../policy/types.js';
import { HookSystem } from '../hooks/index.js';
import type { UserTierId, GeminiUserTier, RetrieveUserQuotaResponse, AdminControlsSettings } from '../code_assist/types.js';
import type { HierarchicalMemory } from './memory.js';
import { type Experiments } from '../code_assist/experiments/experiments.js';
import { AgentRegistry } from '../agents/registry.js';
import { AcknowledgedAgentsService } from '../agents/acknowledgedAgents.js';
import { SkillManager, type SkillDefinition } from '../skills/skillManager.js';
import type { AgentDefinition } from '../agents/types.js';
import { InjectionService } from './injectionService.js';
import type { AgentLoopContext } from './agent-loop-context.js';
export interface AccessibilitySettings {
    /** @deprecated Use ui.statusHints instead. */
    enableLoadingPhrases?: boolean;
    screenReader?: boolean;
}
export interface BugCommandSettings {
    urlTemplate: string;
}
export interface SummarizeToolOutputSettings {
    tokenBudget?: number;
}
export interface PlanSettings {
    enabled?: boolean;
    directory?: string;
    modelRouting?: boolean;
}
export interface TelemetrySettings {
    enabled?: boolean;
    target?: TelemetryTarget;
    otlpEndpoint?: string;
    otlpProtocol?: 'grpc' | 'http';
    logPrompts?: boolean;
    outfile?: string;
    useCollector?: boolean;
    useCliAuth?: boolean;
}
export interface OutputSettings {
    format?: OutputFormat;
}
export interface GemmaModelRouterSettings {
    enabled?: boolean;
    classifier?: {
        host?: string;
        model?: string;
    };
}
export interface ADKSettings {
    agentSessionNoninteractiveEnabled?: boolean;
    agentSessionInteractiveEnabled?: boolean;
}
export interface ExtensionSetting {
    name: string;
    description: string;
    envVar: string;
    sensitive?: boolean;
}
export interface ResolvedExtensionSetting {
    name: string;
    envVar: string;
    value?: string;
    sensitive: boolean;
    scope?: 'user' | 'workspace';
    source?: string;
}
export interface TrajectoryProvider {
    /** Prefix used to identify sessions from this provider (e.g., 'ext:') */
    prefix: string;
    /** Optional display name for UI Tabs */
    displayName?: string;
    /** Return an array of conversational tags/ids */
    listSessions(workspaceUri?: string): Promise<Array<{
        id: string;
        mtime: string;
        name?: string;
        displayName?: string;
        messageCount?: number;
    }>>;
    /** Load a single conversation payload */
    loadSession(id: string): Promise<ConversationRecord | null>;
}
export interface AgentRunConfig {
    maxTimeMinutes?: number;
    maxTurns?: number;
}
/**
 * Override configuration for a specific agent.
 * Generic fields (modelConfig, runConfig, enabled) are standard across all agents.
 */
export interface AgentOverride {
    modelConfig?: ModelConfig;
    runConfig?: AgentRunConfig;
    enabled?: boolean;
    tools?: string[];
    mcpServers?: Record<string, MCPServerConfig>;
}
export interface AgentSettings {
    overrides?: Record<string, AgentOverride>;
    browser?: BrowserAgentCustomConfig;
}
export interface CustomTheme {
    type: 'custom';
    name: string;
    text?: {
        primary?: string;
        secondary?: string;
        link?: string;
        accent?: string;
        response?: string;
    };
    background?: {
        primary?: string;
        diff?: {
            added?: string;
            removed?: string;
        };
    };
    border?: {
        default?: string;
    };
    ui?: {
        comment?: string;
        symbol?: string;
        active?: string;
        focus?: string;
        gradient?: string[];
    };
    status?: {
        error?: string;
        success?: string;
        warning?: string;
    };
    Background?: string;
    Foreground?: string;
    LightBlue?: string;
    AccentBlue?: string;
    AccentPurple?: string;
    AccentCyan?: string;
    AccentGreen?: string;
    AccentYellow?: string;
    AccentRed?: string;
    DiffAdded?: string;
    DiffRemoved?: string;
    Comment?: string;
    Gray?: string;
    DarkGray?: string;
    GradientColors?: string[];
}
/**
 * Browser agent custom configuration.
 * Used in agents.browser
 *
 * IMPORTANT: Keep in sync with the browser settings schema in
 * packages/cli/src/config/settingsSchema.ts (agents.browser.properties).
 */
export interface BrowserAgentCustomConfig {
    /**
     * Session mode:
     * - 'persistent': Launch Chrome with a persistent profile at ~/.cache/chrome-devtools-mcp/ (default)
     * - 'isolated': Launch Chrome with a temporary profile, cleaned up after session
     * - 'existing': Attach to an already-running Chrome instance (requires remote debugging
     *   enabled at chrome://inspect/#remote-debugging)
     */
    sessionMode?: 'isolated' | 'persistent' | 'existing';
    /** Run browser in headless mode. Default: false */
    headless?: boolean;
    /** Path to Chrome profile directory for session persistence. */
    profilePath?: string;
    /** Model for the visual agent's analyze_screenshot tool. When set, enables the tool. */
    visualModel?: string;
    /** List of allowed domains for the browser agent (e.g., ["github.com", "*.google.com"]). */
    allowedDomains?: string[];
    /** Disable user input on the browser window during automation. Default: true in non-headless mode */
    disableUserInput?: boolean;
    /** Maximum number of actions (tool calls) allowed per task. Default: 100 */
    maxActionsPerTask?: number;
    /** Whether to confirm sensitive actions (e.g., fill_form, evaluate_script). */
    confirmSensitiveActions?: boolean;
    /** Whether to block file uploads. */
    blockFileUploads?: boolean;
}
/**
 * All information required in CLI to handle an extension. Defined in Core so
 * that the collection of loaded, active, and inactive extensions can be passed
 * around on the config object though Core does not use this information
 * directly.
 */
export interface GeminiCLIExtension {
    name: string;
    version: string;
    isActive: boolean;
    path: string;
    installMetadata?: ExtensionInstallMetadata;
    mcpServers?: Record<string, MCPServerConfig>;
    contextFiles: string[];
    excludeTools?: string[];
    id: string;
    hooks?: {
        [K in HookEventName]?: HookDefinition[];
    };
    settings?: ExtensionSetting[];
    resolvedSettings?: ResolvedExtensionSetting[];
    skills?: SkillDefinition[];
    agents?: AgentDefinition[];
    /**
     * Custom themes contributed by this extension.
     * These themes will be registered when the extension is activated.
     */
    themes?: CustomTheme[];
    /**
     * Policy rules contributed by this extension.
     */
    rules?: PolicyRule[];
    /**
     * Safety checkers contributed by this extension.
     */
    checkers?: SafetyCheckerRule[];
    /**
     * Planning features configuration contributed by this extension.
     */
    plan?: {
        /**
         * The directory where planning artifacts are stored.
         */
        directory?: string;
    };
    /**
     * Used to migrate an extension to a new repository source.
     */
    migratedTo?: string;
    /** Loaded JS module for trajectory decoding */
    trajectoryProviderModule?: TrajectoryProvider;
}
export interface ExtensionInstallMetadata {
    source: string;
    type: 'git' | 'local' | 'link' | 'github-release';
    releaseTag?: string;
    ref?: string;
    autoUpdate?: boolean;
    allowPreRelease?: boolean;
}
import { DEFAULT_FILE_FILTERING_OPTIONS, DEFAULT_MEMORY_FILE_FILTERING_OPTIONS, type FileFilteringOptions } from './constants.js';
import { type ExtensionLoader } from '../utils/extensionLoader.js';
import { McpClientManager } from '../tools/mcp-client-manager.js';
import { A2AClientManager } from '../agents/a2a-client-manager.js';
import { type McpContext } from '../tools/mcp-client.js';
import type { EnvironmentSanitizationConfig } from '../services/environmentSanitization.js';
export type { FileFilteringOptions };
export { DEFAULT_FILE_FILTERING_OPTIONS, DEFAULT_MEMORY_FILE_FILTERING_OPTIONS, };
export declare const DEFAULT_TRUNCATE_TOOL_OUTPUT_THRESHOLD = 40000;
export declare class MCPServerConfig {
    readonly command?: string | undefined;
    readonly args?: string[] | undefined;
    readonly env?: Record<string, string> | undefined;
    readonly cwd?: string | undefined;
    readonly url?: string | undefined;
    readonly httpUrl?: string | undefined;
    readonly headers?: Record<string, string> | undefined;
    readonly tcp?: string | undefined;
    readonly type?: "sse" | "http" | undefined;
    readonly timeout?: number | undefined;
    readonly trust?: boolean | undefined;
    readonly description?: string | undefined;
    readonly includeTools?: string[] | undefined;
    readonly excludeTools?: string[] | undefined;
    readonly extension?: GeminiCLIExtension | undefined;
    readonly oauth?: MCPOAuthConfig | undefined;
    readonly authProviderType?: AuthProviderType | undefined;
    readonly targetAudience?: string | undefined;
    readonly targetServiceAccount?: string | undefined;
    constructor(command?: string | undefined, args?: string[] | undefined, env?: Record<string, string> | undefined, cwd?: string | undefined, url?: string | undefined, httpUrl?: string | undefined, headers?: Record<string, string> | undefined, tcp?: string | undefined, type?: "sse" | "http" | undefined, timeout?: number | undefined, trust?: boolean | undefined, description?: string | undefined, includeTools?: string[] | undefined, excludeTools?: string[] | undefined, extension?: GeminiCLIExtension | undefined, oauth?: MCPOAuthConfig | undefined, authProviderType?: AuthProviderType | undefined, targetAudience?: string | undefined, targetServiceAccount?: string | undefined);
}
export declare enum AuthProviderType {
    DYNAMIC_DISCOVERY = "dynamic_discovery",
    GOOGLE_CREDENTIALS = "google_credentials",
    SERVICE_ACCOUNT_IMPERSONATION = "service_account_impersonation"
}
export interface SandboxConfig {
    enabled: boolean;
    allowedPaths?: string[];
    includeDirectories?: string[];
    networkAccess?: boolean;
    command?: 'docker' | 'podman' | 'sandbox-exec' | 'runsc' | 'lxc' | 'windows-native';
    image?: string;
}
export declare const ConfigSchema: z.ZodObject<{
    sandbox: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        allowedPaths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        includeDirectories: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        networkAccess: z.ZodDefault<z.ZodBoolean>;
        command: z.ZodOptional<z.ZodEnum<["docker", "podman", "sandbox-exec", "runsc", "lxc", "windows-native"]>>;
        image: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        includeDirectories: string[];
        allowedPaths: string[];
        networkAccess: boolean;
        command?: "sandbox-exec" | "docker" | "podman" | "runsc" | "lxc" | "windows-native" | undefined;
        image?: string | undefined;
    }, {
        command?: "sandbox-exec" | "docker" | "podman" | "runsc" | "lxc" | "windows-native" | undefined;
        enabled?: boolean | undefined;
        image?: string | undefined;
        includeDirectories?: string[] | undefined;
        allowedPaths?: string[] | undefined;
        networkAccess?: boolean | undefined;
    }>, {
        enabled: boolean;
        includeDirectories: string[];
        allowedPaths: string[];
        networkAccess: boolean;
        command?: "sandbox-exec" | "docker" | "podman" | "runsc" | "lxc" | "windows-native" | undefined;
        image?: string | undefined;
    }, {
        command?: "sandbox-exec" | "docker" | "podman" | "runsc" | "lxc" | "windows-native" | undefined;
        enabled?: boolean | undefined;
        image?: string | undefined;
        includeDirectories?: string[] | undefined;
        allowedPaths?: string[] | undefined;
        networkAccess?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    sandbox?: {
        enabled: boolean;
        includeDirectories: string[];
        allowedPaths: string[];
        networkAccess: boolean;
        command?: "sandbox-exec" | "docker" | "podman" | "runsc" | "lxc" | "windows-native" | undefined;
        image?: string | undefined;
    } | undefined;
}, {
    sandbox?: {
        command?: "sandbox-exec" | "docker" | "podman" | "runsc" | "lxc" | "windows-native" | undefined;
        enabled?: boolean | undefined;
        image?: string | undefined;
        includeDirectories?: string[] | undefined;
        allowedPaths?: string[] | undefined;
        networkAccess?: boolean | undefined;
    } | undefined;
}>;
/**
 * Callbacks for checking MCP server enablement status.
 * These callbacks are provided by the CLI package to bridge
 * the enablement state to the core package.
 */
export interface McpEnablementCallbacks {
    /** Check if a server is disabled for the current session only */
    isSessionDisabled: (serverId: string) => boolean;
    /** Check if a server is enabled in the file-based configuration */
    isFileEnabled: (serverId: string) => Promise<boolean>;
}
export interface PolicyUpdateConfirmationRequest {
    scope: string;
    identifier: string;
    policyDir: string;
    newHash: string;
}
export interface WorktreeSettings {
    name: string;
    path: string;
    baseSha: string;
}
export interface ConfigParameters {
    sessionId: string;
    clientName?: string;
    clientVersion?: string;
    embeddingModel?: string;
    sandbox?: SandboxConfig;
    toolSandboxing?: boolean;
    targetDir: string;
    debugMode: boolean;
    question?: string;
    coreTools?: string[];
    mainAgentTools?: string[];
    /** @deprecated Use Policy Engine instead */
    allowedTools?: string[];
    /** @deprecated Use Policy Engine instead */
    excludeTools?: string[];
    toolDiscoveryCommand?: string;
    toolCallCommand?: string;
    mcpServerCommand?: string;
    mcpServers?: Record<string, MCPServerConfig>;
    mcpEnablementCallbacks?: McpEnablementCallbacks;
    userMemory?: string | HierarchicalMemory;
    geminiMdFileCount?: number;
    geminiMdFilePaths?: string[];
    approvalMode?: ApprovalMode;
    showMemoryUsage?: boolean;
    contextFileName?: string | string[];
    accessibility?: AccessibilitySettings;
    telemetry?: TelemetrySettings;
    usageStatisticsEnabled?: boolean;
    fileFiltering?: {
        respectGitIgnore?: boolean;
        respectGeminiIgnore?: boolean;
        enableRecursiveFileSearch?: boolean;
        enableFuzzySearch?: boolean;
        maxFileCount?: number;
        searchTimeout?: number;
        customIgnoreFilePaths?: string[];
    };
    checkpointing?: boolean;
    proxy?: string;
    cwd: string;
    fileDiscoveryService?: FileDiscoveryService;
    includeDirectories?: string[];
    bugCommand?: BugCommandSettings;
    model: string;
    disableLoopDetection?: boolean;
    maxSessionTurns?: number;
    acpMode?: boolean;
    listSessions?: boolean;
    deleteSession?: string;
    listExtensions?: boolean;
    extensionLoader?: ExtensionLoader;
    enabledExtensions?: string[];
    enableExtensionReloading?: boolean;
    allowedMcpServers?: string[];
    blockedMcpServers?: string[];
    allowedEnvironmentVariables?: string[];
    blockedEnvironmentVariables?: string[];
    enableEnvironmentVariableRedaction?: boolean;
    noBrowser?: boolean;
    summarizeToolOutput?: Record<string, SummarizeToolOutputSettings>;
    folderTrust?: boolean;
    ideMode?: boolean;
    loadMemoryFromIncludeDirectories?: boolean;
    includeDirectoryTree?: boolean;
    importFormat?: 'tree' | 'flat';
    discoveryMaxDirs?: number;
    compressionThreshold?: number;
    interactive?: boolean;
    trustedFolder?: boolean;
    useBackgroundColor?: boolean;
    useAlternateBuffer?: boolean;
    useTerminalBuffer?: boolean;
    useRenderProcess?: boolean;
    useRipgrep?: boolean;
    enableInteractiveShell?: boolean;
    shellBackgroundCompletionBehavior?: string;
    skipNextSpeakerCheck?: boolean;
    shellExecutionConfig?: ShellExecutionConfig;
    extensionManagement?: boolean;
    extensionRegistryURI?: string;
    truncateToolOutputThreshold?: number;
    eventEmitter?: EventEmitter;
    useWriteTodos?: boolean;
    workspacePoliciesDir?: string;
    policyEngineConfig?: PolicyEngineConfig;
    directWebFetch?: boolean;
    policyUpdateConfirmationRequest?: PolicyUpdateConfirmationRequest;
    output?: OutputSettings;
    gemmaModelRouter?: GemmaModelRouterSettings;
    adk?: ADKSettings;
    disableModelRouterForAuth?: AuthType[];
    continueOnFailedApiCall?: boolean;
    retryFetchErrors?: boolean;
    maxAttempts?: number;
    enableShellOutputEfficiency?: boolean;
    shellToolInactivityTimeout?: number;
    fakeResponses?: string;
    recordResponses?: string;
    ptyInfo?: string;
    disableYoloMode?: boolean;
    disableAlwaysAllow?: boolean;
    rawOutput?: boolean;
    acceptRawOutputRisk?: boolean;
    dynamicModelConfiguration?: boolean;
    modelConfigServiceConfig?: ModelConfigServiceConfig;
    enableHooks?: boolean;
    enableHooksUI?: boolean;
    experiments?: Experiments;
    contextManagement?: Partial<ContextManagementConfig>;
    hooks?: {
        [K in HookEventName]?: HookDefinition[];
    };
    disabledHooks?: string[];
    projectHooks?: {
        [K in HookEventName]?: HookDefinition[];
    };
    enableAgents?: boolean;
    enableEventDrivenScheduler?: boolean;
    skillsSupport?: boolean;
    disabledSkills?: string[];
    adminSkillsEnabled?: boolean;
    experimentalJitContext?: boolean;
    autoDistillation?: boolean;
    experimentalMemoryManager?: boolean;
    experimentalAutoMemory?: boolean;
    experimentalContextManagementConfig?: string;
    experimentalAgentHistoryTruncation?: boolean;
    experimentalAgentHistoryTruncationThreshold?: number;
    experimentalAgentHistoryRetainedMessages?: number;
    experimentalAgentHistorySummarization?: boolean;
    memoryBoundaryMarkers?: string[];
    topicUpdateNarration?: boolean;
    disableLLMCorrection?: boolean;
    plan?: boolean;
    tracker?: boolean;
    planSettings?: PlanSettings;
    worktreeSettings?: WorktreeSettings;
    modelSteering?: boolean;
    onModelChange?: (model: string) => void;
    mcpEnabled?: boolean;
    extensionsEnabled?: boolean;
    agents?: AgentSettings;
    onReload?: () => Promise<{
        disabledSkills?: string[];
        adminSkillsEnabled?: boolean;
        agents?: AgentSettings;
    }>;
    enableConseca?: boolean;
    billing?: {
        overageStrategy?: OverageStrategy;
    };
}
export declare class Config implements McpContext, AgentLoopContext {
    private _toolRegistry;
    private mcpClientManager?;
    private readonly a2aClientManager?;
    private allowedMcpServers;
    private blockedMcpServers;
    private allowedEnvironmentVariables;
    private blockedEnvironmentVariables;
    private readonly enableEnvironmentVariableRedaction;
    private _promptRegistry;
    private _resourceRegistry;
    private agentRegistry;
    private readonly acknowledgedAgentsService;
    private skillManager;
    private _sessionId;
    private readonly clientName;
    private clientVersion;
    private fileSystemService;
    private trackerService?;
    readonly topicState: TopicState;
    private contentGeneratorConfig;
    private contentGenerator;
    readonly modelConfigService: ModelConfigService;
    private readonly embeddingModel;
    private readonly sandbox;
    private _sandboxForbiddenPaths;
    private readonly targetDir;
    private workspaceContext;
    private readonly debugMode;
    private readonly question;
    private readonly worktreeSettings;
    readonly enableConseca: boolean;
    private readonly coreTools;
    private readonly mainAgentTools;
    /** @deprecated Use Policy Engine instead */
    private readonly allowedTools;
    /** @deprecated Use Policy Engine instead */
    private readonly excludeTools;
    private readonly toolDiscoveryCommand;
    private readonly toolCallCommand;
    private readonly mcpServerCommand;
    private readonly mcpEnabled;
    private readonly extensionsEnabled;
    private mcpServers;
    private readonly mcpEnablementCallbacks?;
    private userMemory;
    private geminiMdFileCount;
    private geminiMdFilePaths;
    private readonly showMemoryUsage;
    private readonly accessibility;
    private readonly telemetrySettings;
    private readonly usageStatisticsEnabled;
    private _geminiClient;
    private _sandboxManager;
    private readonly _sandboxPolicyManager;
    private baseLlmClient;
    private localLiteRtLmClient?;
    private modelRouterService;
    private readonly modelAvailabilityService;
    private readonly fileFiltering;
    private fileDiscoveryService;
    private gitService;
    private readonly checkpointing;
    private readonly proxy;
    private readonly cwd;
    private readonly bugCommand;
    private model;
    private readonly disableLoopDetection;
    private hasAccessToPreviewModel;
    private readonly noBrowser;
    private readonly folderTrust;
    private ideMode;
    private _activeModel;
    private readonly maxSessionTurns;
    private readonly listSessions;
    private readonly deleteSession;
    private readonly listExtensions;
    private readonly _extensionLoader;
    private readonly _enabledExtensions;
    private readonly enableExtensionReloading;
    fallbackModelHandler?: FallbackModelHandler;
    validationHandler?: ValidationHandler;
    private quotaErrorOccurred;
    private creditsNotificationShown;
    private modelQuotas;
    private lastRetrievedQuota?;
    private lastQuotaFetchTime;
    private lastEmittedQuotaRemaining;
    private lastEmittedQuotaLimit;
    private emitQuotaChangedEvent;
    private readonly summarizeToolOutput;
    private readonly acpMode;
    private readonly loadMemoryFromIncludeDirectories;
    private readonly includeDirectoryTree;
    private readonly importFormat;
    private readonly discoveryMaxDirs;
    private readonly compressionThreshold;
    /** Public for testing only */
    readonly interactive: boolean;
    private readonly ptyInfo;
    private readonly trustedFolder;
    private readonly directWebFetch;
    private readonly useRipgrep;
    private readonly enableInteractiveShell;
    private readonly shellBackgroundCompletionBehavior;
    private readonly skipNextSpeakerCheck;
    private readonly useBackgroundColor;
    private readonly useAlternateBuffer;
    private readonly useTerminalBuffer;
    private readonly useRenderProcess;
    private shellExecutionConfig;
    private readonly extensionManagement;
    private readonly extensionRegistryURI;
    private readonly truncateToolOutputThreshold;
    private compressionTruncationCounter;
    private initialized;
    private initPromise;
    private mcpInitializationPromise;
    readonly storage: Storage;
    private readonly fileExclusions;
    private readonly eventEmitter?;
    private readonly useWriteTodos;
    private readonly workspacePoliciesDir;
    private readonly _messageBus;
    private readonly policyEngine;
    private policyUpdateConfirmationRequest;
    private readonly outputSettings;
    private readonly gemmaModelRouter;
    private readonly agentSessionNoninteractiveEnabled;
    private readonly agentSessionInteractiveEnabled;
    private readonly continueOnFailedApiCall;
    private readonly retryFetchErrors;
    private readonly maxAttempts;
    private readonly enableShellOutputEfficiency;
    private readonly shellToolInactivityTimeout;
    readonly fakeResponses?: string;
    readonly recordResponses?: string;
    private readonly disableYoloMode;
    private readonly disableAlwaysAllow;
    private readonly rawOutput;
    private readonly acceptRawOutputRisk;
    private readonly dynamicModelConfiguration;
    private pendingIncludeDirectories;
    private readonly enableHooksUI;
    private readonly enableHooks;
    private hooks;
    private projectHooks;
    private disabledHooks;
    private experiments;
    private experimentsPromise;
    private hookSystem?;
    private readonly onModelChange;
    private readonly onReload;
    private readonly billing;
    private readonly enableAgents;
    private agents;
    private readonly enableEventDrivenScheduler;
    private readonly skillsSupport;
    private disabledSkills;
    private readonly adminSkillsEnabled;
    private readonly experimentalJitContext;
    private readonly experimentalMemoryManager;
    private readonly experimentalAutoMemory;
    private readonly experimentalContextManagementConfig?;
    private readonly memoryBoundaryMarkers;
    private readonly topicUpdateNarration;
    private readonly disableLLMCorrection;
    private readonly planEnabled;
    private readonly trackerEnabled;
    private readonly planModeRoutingEnabled;
    private readonly modelSteering;
    private memoryContextManager?;
    private readonly contextManagement;
    private terminalBackground;
    private remoteAdminSettings;
    private latestApiRequest;
    private lastModeSwitchTime;
    readonly injectionService: InjectionService;
    private approvedPlanPath;
    constructor(params: ConfigParameters);
    get config(): Config;
    isInitialized(): boolean;
    /**
     * Dedups initialization requests using a shared promise that is only resolved
     * once.
     */
    initialize(): Promise<void>;
    private _initialize;
    getContentGenerator(): ContentGenerator;
    refreshAuth(authMethod: AuthType, apiKey?: string, baseUrl?: string, customHeaders?: Record<string, string>): Promise<void>;
    getExperimentsAsync(): Promise<Experiments | undefined>;
    getUserTier(): UserTierId | undefined;
    getUserTierName(): string | undefined;
    getUserPaidTier(): GeminiUserTier | undefined;
    /**
     * Provides access to the BaseLlmClient for stateless LLM operations.
     */
    getBaseLlmClient(): BaseLlmClient;
    getLocalLiteRtLmClient(): LocalLiteRtLmClient;
    get promptId(): string;
    /**
     * @deprecated Do not access directly on Config.
     * Use the injected AgentLoopContext instead.
     */
    get toolRegistry(): ToolRegistry;
    /**
     * @deprecated Do not access directly on Config.
     * Use the injected AgentLoopContext instead.
     */
    get promptRegistry(): PromptRegistry;
    /**
     * @deprecated Do not access directly on Config.
     * Use the injected AgentLoopContext instead.
     */
    get resourceRegistry(): ResourceRegistry;
    /**
     * @deprecated Do not access directly on Config.
     * Use the injected AgentLoopContext instead.
     */
    get messageBus(): MessageBus;
    /**
     * @deprecated Do not access directly on Config.
     * Use the injected AgentLoopContext instead.
     */
    get geminiClient(): GeminiClient;
    private getSandboxForbiddenPaths;
    private refreshSandboxManager;
    get sandboxPolicyManager(): SandboxPolicyManager;
    get sandboxManager(): SandboxManager;
    getSessionId(): string;
    getWorktreeSettings(): WorktreeSettings | undefined;
    getClientName(): string | undefined;
    setSessionId(sessionId: string): void;
    resetNewSessionState(sessionId: string): void;
    setTerminalBackground(terminalBackground: string | undefined): void;
    getTerminalBackground(): string | undefined;
    getLatestApiRequest(): GenerateContentParameters | undefined;
    setLatestApiRequest(req: GenerateContentParameters): void;
    getRemoteAdminSettings(): AdminControlsSettings | undefined;
    setRemoteAdminSettings(settings: AdminControlsSettings | undefined): void;
    shouldLoadMemoryFromIncludeDirectories(): boolean;
    getIncludeDirectoryTree(): boolean;
    getImportFormat(): 'tree' | 'flat';
    getDiscoveryMaxDirs(): number;
    getContentGeneratorConfig(): ContentGeneratorConfig;
    getModel(): string;
    getDisableLoopDetection(): boolean;
    setModel(newModel: string, isTemporary?: boolean): void;
    activateFallbackMode(model: string): void;
    getActiveModel(): string;
    setActiveModel(model: string): void;
    setFallbackModelHandler(handler: FallbackModelHandler): void;
    getFallbackModelHandler(): FallbackModelHandler | undefined;
    setValidationHandler(handler: ValidationHandler): void;
    getValidationHandler(): ValidationHandler | undefined;
    resetTurn(): void;
    /** Resets billing state (overageStrategy, creditsNotificationShown) once per user prompt. */
    resetBillingTurnState(overageStrategy?: OverageStrategy): void;
    getMaxSessionTurns(): number;
    setQuotaErrorOccurred(value: boolean): void;
    getQuotaErrorOccurred(): boolean;
    setCreditsNotificationShown(value: boolean): void;
    getCreditsNotificationShown(): boolean;
    setQuota(remaining: number | undefined, limit: number | undefined, modelId?: string): void;
    private getPooledQuota;
    getQuotaRemaining(): number | undefined;
    getQuotaLimit(): number | undefined;
    getQuotaResetTime(): string | undefined;
    getEmbeddingModel(): string;
    getSandbox(): SandboxConfig | undefined;
    getSandboxEnabled(): boolean;
    getSandboxAllowedPaths(): string[];
    getSandboxNetworkAccess(): boolean;
    isRestrictiveSandbox(): boolean;
    getTargetDir(): string;
    getProjectRoot(): string;
    getWorkspaceContext(): WorkspaceContext;
    private refreshSessionScopedPlansDirectory;
    getAgentRegistry(): AgentRegistry;
    getAcknowledgedAgentsService(): AcknowledgedAgentsService;
    /** @deprecated Use toolRegistry getter */
    getToolRegistry(): ToolRegistry;
    getPromptRegistry(): PromptRegistry;
    getSkillManager(): SkillManager;
    getResourceRegistry(): ResourceRegistry;
    getDebugMode(): boolean;
    getQuestion(): string | undefined;
    getHasAccessToPreviewModel(): boolean;
    setHasAccessToPreviewModel(hasAccess: boolean | null): void;
    refreshAvailableCredits(): Promise<void>;
    refreshUserQuota(): Promise<RetrieveUserQuotaResponse | undefined>;
    refreshUserQuotaIfStale(staleMs?: number): Promise<RetrieveUserQuotaResponse | undefined>;
    getLastRetrievedQuota(): RetrieveUserQuotaResponse | undefined;
    getRemainingQuotaForModel(modelId: string): {
        remainingAmount?: number;
        remainingFraction?: number;
        resetTime?: string;
    } | undefined;
    getCoreTools(): string[] | undefined;
    getMainAgentTools(): string[] | undefined;
    getAllowedTools(): string[] | undefined;
    /**
     * All the excluded tools from static configuration, loaded extensions, or
     * other sources (like the Policy Engine).
     *
     * May change over time.
     */
    getExcludeTools(toolMetadata?: Map<string, Record<string, unknown>>, allToolNames?: Set<string>): Set<string> | undefined;
    getToolDiscoveryCommand(): string | undefined;
    getToolCallCommand(): string | undefined;
    getMcpServerCommand(): string | undefined;
    /**
     * The user configured MCP servers (via gemini settings files).
     *
     * Does NOT include mcp servers configured by extensions.
     */
    getMcpServers(): Record<string, MCPServerConfig> | undefined;
    getMcpEnabled(): boolean;
    getMcpEnablementCallbacks(): McpEnablementCallbacks | undefined;
    getExtensionsEnabled(): boolean;
    getExtensionRegistryURI(): string | undefined;
    getMcpClientManager(): McpClientManager | undefined;
    getA2AClientManager(): A2AClientManager | undefined;
    setUserInteractedWithMcp(): void;
    /** @deprecated Use getMcpClientManager().getLastError() directly */
    getLastMcpError(serverName: string): string | undefined;
    emitMcpDiagnostic(severity: 'info' | 'warning' | 'error', message: string, error?: unknown, serverName?: string): void;
    getAllowedMcpServers(): string[] | undefined;
    getBlockedMcpServers(): string[] | undefined;
    get sanitizationConfig(): EnvironmentSanitizationConfig;
    setMcpServers(mcpServers: Record<string, MCPServerConfig>): void;
    getUserMemory(): string | HierarchicalMemory;
    /**
     * Refreshes the MCP context, including memory, tools, and system instructions.
     */
    refreshMcpContext(): Promise<void>;
    setUserMemory(newUserMemory: string | HierarchicalMemory): void;
    /**
     * Returns memory for the system instruction.
     * When JIT is enabled, global memory and user project memory (Tier 1) go
     * in the system instruction. Extension and project memory (Tier 2) are
     * placed in the first user message instead, per the tiered context model.
     * User project memory is in Tier 1 so mid-session saves are reflected
     * via system instruction updates.
     */
    getSystemInstructionMemory(): string | HierarchicalMemory;
    /**
     * Returns Tier 2 memory (extension + project) for injection into the first
     * user message when JIT is enabled. Returns empty string when JIT is
     * disabled (Tier 2 memory is already in the system instruction).
     */
    getSessionMemory(): string;
    getGlobalMemory(): string;
    getEnvironmentMemory(): string;
    getMemoryContextManager(): MemoryContextManager | undefined;
    isJitContextEnabled(): boolean;
    isContextManagementEnabled(): boolean;
    getMemoryBoundaryMarkers(): readonly string[];
    isMemoryManagerEnabled(): boolean;
    isAutoMemoryEnabled(): boolean;
    getExperimentalContextManagementConfig(): string | undefined;
    getContextManagementConfig(): ContextManagementConfig;
    get agentHistoryProviderConfig(): AgentHistoryProviderConfig;
    isTopicUpdateNarrationEnabled(): boolean;
    isModelSteeringEnabled(): boolean;
    getToolOutputMaskingConfig(): Promise<ToolOutputMaskingConfig>;
    getGeminiMdFileCount(): number;
    setGeminiMdFileCount(count: number): void;
    getGeminiMdFilePaths(): string[];
    getWorkspacePoliciesDir(): string | undefined;
    setGeminiMdFilePaths(paths: string[]): void;
    getApprovalMode(): ApprovalMode;
    isPlanMode(): boolean;
    getPolicyUpdateConfirmationRequest(): PolicyUpdateConfirmationRequest | undefined;
    /**
     * Hot-loads workspace policies from the specified directory into the active policy engine.
     * This allows applying newly accepted policies without requiring an application restart.
     *
     * @param policyDir The directory containing the workspace policy TOML files.
     */
    loadWorkspacePolicies(policyDir: string): Promise<void>;
    setApprovalMode(mode: ApprovalMode): void;
    /**
     * Logs the duration of the current approval mode.
     */
    logCurrentModeDuration(mode: ApprovalMode): void;
    isYoloModeDisabled(): boolean;
    getDisableAlwaysAllow(): boolean;
    getRawOutput(): boolean;
    getAcceptRawOutputRisk(): boolean;
    getExperimentalDynamicModelConfiguration(): boolean;
    getPendingIncludeDirectories(): string[];
    clearPendingIncludeDirectories(): void;
    getShowMemoryUsage(): boolean;
    getAccessibility(): AccessibilitySettings;
    getTelemetryEnabled(): boolean;
    getTelemetryLogPromptsEnabled(): boolean;
    getTelemetryOtlpEndpoint(): string;
    getTelemetryOtlpProtocol(): 'grpc' | 'http';
    getTelemetryTarget(): TelemetryTarget;
    getTelemetryOutfile(): string | undefined;
    getBillingSettings(): {
        overageStrategy: OverageStrategy;
    };
    /**
     * Updates the overage strategy at runtime.
     * Used to switch from 'ask' to 'always' after the user accepts credits
     * via the overage dialog, so subsequent API calls auto-include credits.
     */
    setOverageStrategy(strategy: OverageStrategy): void;
    getTelemetryUseCollector(): boolean;
    getTelemetryUseCliAuth(): boolean;
    /** @deprecated Use geminiClient getter */
    getGeminiClient(): GeminiClient;
    /**
     * Updates the system instruction with the latest user memory.
     * Whenever the user memory (GEMINI.md files) is updated.
     */
    updateSystemInstructionIfInitialized(): void;
    getModelRouterService(): ModelRouterService;
    getModelConfigService(): ModelConfigService;
    getModelAvailabilityService(): ModelAvailabilityService;
    getEnableRecursiveFileSearch(): boolean;
    getFileFilteringEnableFuzzySearch(): boolean;
    getFileFilteringRespectGitIgnore(): boolean;
    getFileFilteringRespectGeminiIgnore(): boolean;
    getCustomIgnoreFilePaths(): string[];
    getFileFilteringOptions(): FileFilteringOptions;
    /**
     * Gets custom file exclusion patterns from configuration.
     * TODO: This is a placeholder implementation. In the future, this could
     * read from settings files, CLI arguments, or environment variables.
     */
    getCustomExcludes(): string[];
    getCheckpointingEnabled(): boolean;
    getProxy(): string | undefined;
    getWorkingDir(): string;
    getBugCommand(): BugCommandSettings | undefined;
    getTrackerService(): TrackerService;
    getFileService(): FileDiscoveryService;
    getUsageStatisticsEnabled(): boolean;
    getAcpMode(): boolean;
    waitForMcpInit(): Promise<void>;
    getListExtensions(): boolean;
    getListSessions(): boolean;
    getDeleteSession(): string | undefined;
    getExtensionManagement(): boolean;
    getExtensions(): GeminiCLIExtension[];
    getExtensionLoader(): ExtensionLoader;
    getEnabledExtensions(): string[];
    getEnableExtensionReloading(): boolean;
    getDisableLLMCorrection(): boolean;
    isPlanEnabled(): boolean;
    isTrackerEnabled(): boolean;
    getApprovedPlanPath(): string | undefined;
    getDirectWebFetch(): boolean;
    setApprovedPlanPath(path: string | undefined): void;
    isAgentsEnabled(): boolean;
    isEventDrivenSchedulerEnabled(): boolean;
    getNoBrowser(): boolean;
    getAgentsSettings(): AgentSettings;
    isBrowserLaunchSuppressed(): boolean;
    getSummarizeToolOutputConfig(): Record<string, SummarizeToolOutputSettings> | undefined;
    getIdeMode(): boolean;
    /**
     * Returns 'true' if the folder trust feature is enabled.
     */
    getFolderTrust(): boolean;
    /**
     * Returns 'true' if the workspace is considered "trusted".
     * 'false' for untrusted.
     */
    isTrustedFolder(): boolean;
    setIdeMode(value: boolean): void;
    /**
     * Get the current FileSystemService
     */
    getFileSystemService(): FileSystemService;
    /**
     * Checks if a given absolute path is allowed for file system operations.
     * A path is allowed if it's within the workspace context or the project's temporary directory.
     *
     * @param absolutePath The absolute path to check.
     * @returns true if the path is allowed, false otherwise.
     */
    isPathAllowed(absolutePath: string): boolean;
    /**
     * Validates if a path is allowed and returns a detailed error message if not.
     *
     * @param absolutePath The absolute path to validate.
     * @param checkType The type of access to check ('read' or 'write'). Defaults to 'write' for safety.
     * @returns An error message string if the path is disallowed, null otherwise.
     */
    validatePathAccess(absolutePath: string, checkType?: 'read' | 'write'): string | null;
    /**
     * Set a custom FileSystemService
     */
    setFileSystemService(fileSystemService: FileSystemService): void;
    getCompressionThreshold(): Promise<number | undefined>;
    getUserCaching(): Promise<boolean | undefined>;
    getPlanModeRoutingEnabled(): Promise<boolean>;
    getNumericalRoutingEnabled(): Promise<boolean>;
    /**
     * Returns the resolved complexity threshold for routing.
     * If a remote threshold is provided and within range (0-100), it is returned.
     * Otherwise, the default threshold (90) is returned.
     */
    getResolvedClassifierThreshold(): Promise<number>;
    getClassifierThreshold(): Promise<number | undefined>;
    getBannerTextNoCapacityIssues(): Promise<string>;
    getBannerTextCapacityIssues(): Promise<string>;
    /**
     * Returns whether the user has access to Pro models.
     * This is determined by the PRO_MODEL_NO_ACCESS experiment flag.
     */
    getProModelNoAccess(): Promise<boolean>;
    /**
     * Returns whether the user has access to Pro models synchronously.
     *
     * Note: This method should only be called after startup, once experiments have been loaded.
     */
    getProModelNoAccessSync(): boolean;
    /**
     * Returns whether Gemini 3.1 Pro has been launched.
     * This method is async and ensures that experiments are loaded before returning the result.
     */
    getGemini31Launched(): Promise<boolean>;
    /**
     * Returns whether Gemini 3.1 Flash Lite has been launched.
     * This method is async and ensures that experiments are loaded before returning the result.
     */
    getGemini31FlashLiteLaunched(): Promise<boolean>;
    /**
     * Returns whether the custom tool model should be used.
     */
    getUseCustomToolModel(): Promise<boolean>;
    /**
     * Returns whether the custom tool model should be used.
     *
     * Note: This method should only be called after startup, once experiments have been loaded.
     */
    getUseCustomToolModelSync(): boolean;
    private isGemini31LaunchedForAuthType;
    /**
     * Returns whether Gemini 3.1 has been launched.
     *
     * Note: This method should only be called after startup, once experiments have been loaded.
     * If you need to call this during startup or from an async context, use
     * getGemini31Launched instead.
     */
    getGemini31LaunchedSync(): boolean;
    /**
     * Returns the configured default request timeout in milliseconds.
     */
    getRequestTimeoutMs(): number | undefined;
    /**
     * Returns whether Gemini 3.1 Flash Lite has been launched.
     *
     * Note: This method should only be called after startup, once experiments have been loaded.
     * If you need to call this during startup or from an async context, use
     * getGemini31FlashLiteLaunched instead.
     */
    getGemini31FlashLiteLaunchedSync(): boolean;
    private ensureExperimentsLoaded;
    isInteractiveShellEnabled(): boolean;
    isSkillsSupportEnabled(): boolean;
    /**
     * Reloads skills by re-discovering them from extensions and local directories.
     */
    reloadSkills(): Promise<void>;
    /**
     * Reloads agent settings.
     */
    reloadAgents(): Promise<void>;
    isInteractive(): boolean;
    getUseRipgrep(): boolean;
    getUseBackgroundColor(): boolean;
    getUseAlternateBuffer(): boolean;
    getUseTerminalBuffer(): boolean;
    getUseRenderProcess(): boolean;
    getEnableInteractiveShell(): boolean;
    getShellBackgroundCompletionBehavior(): 'inject' | 'notify' | 'silent';
    getSkipNextSpeakerCheck(): boolean;
    getContinueOnFailedApiCall(): boolean;
    getRetryFetchErrors(): boolean;
    getMaxAttempts(): number;
    getEnableShellOutputEfficiency(): boolean;
    getShellToolInactivityTimeout(): number;
    getShellExecutionConfig(): ShellExecutionConfig;
    setShellExecutionConfig(config: Partial<ShellExecutionConfig>): void;
    getScreenReader(): boolean;
    getTruncateToolOutputThreshold(): number;
    getToolMaxOutputTokens(): number;
    getToolSummarizationThresholdTokens(): number;
    getNextCompressionTruncationId(): number;
    getUseWriteTodos(): boolean;
    getOutputFormat(): OutputFormat;
    getGitService(): Promise<GitService>;
    getFileExclusions(): FileExclusions;
    /** @deprecated Use messageBus getter */
    getMessageBus(): MessageBus;
    getPolicyEngine(): PolicyEngine;
    getEnableHooks(): boolean;
    getEnableHooksUI(): boolean;
    getGemmaModelRouterEnabled(): boolean;
    getGemmaModelRouterSettings(): GemmaModelRouterSettings;
    getAgentSessionNoninteractiveEnabled(): boolean;
    getAgentSessionInteractiveEnabled(): boolean;
    /**
     * Get override settings for a specific agent.
     * Reads from agents.overrides.<agentName>.
     */
    getAgentOverride(agentName: string): AgentOverride | undefined;
    /**
     * Get browser agent configuration.
     * Combines generic AgentOverride fields with browser-specific customConfig.
     * This is the canonical way to access browser agent settings.
     */
    getBrowserAgentConfig(): {
        enabled: boolean;
        model?: string;
        customConfig: BrowserAgentCustomConfig;
    };
    /**
     * Determines if user input should be disabled during browser automation.
     * Based on the `disableUserInput` setting and `headless` mode.
     */
    shouldDisableBrowserUserInput(): boolean;
    createToolRegistry(): Promise<ToolRegistry>;
    /**
     * Get the hook system instance
     */
    getHookSystem(): HookSystem | undefined;
    /**
     * Get hooks configuration
     */
    getHooks(): {
        [K in HookEventName]?: HookDefinition[];
    } | undefined;
    /**
     * Get project-specific hooks configuration
     */
    getProjectHooks(): {
        [K in HookEventName]?: HookDefinition[];
    } | undefined;
    /**
     * Update the list of disabled hooks dynamically.
     * This is used to keep the running system in sync with settings changes
     * without risk of loading new hook definitions into memory.
     */
    updateDisabledHooks(disabledHooks: string[]): void;
    /**
     * Get disabled hooks list
     */
    getDisabledHooks(): string[];
    /**
     * Get experiments configuration
     */
    getExperiments(): Experiments | undefined;
    /**
     * Set experiments configuration
     */
    setExperiments(experiments: Experiments): void;
    private onAgentsRefreshed;
    /**
     * Disposes of resources and removes event listeners.
     */
    dispose(): Promise<void>;
}
export { DEFAULT_GEMINI_FLASH_MODEL };
