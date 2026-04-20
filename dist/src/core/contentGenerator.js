/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, } from '@google/genai';
import * as os from 'node:os';
import { createCodeAssistContentGenerator } from '../code_assist/codeAssist.js';
import { isCloudShell } from '../ide/detect-ide.js';
import { loadApiKey } from './apiKeyCredentialStorage.js';
import { LoggingContentGenerator } from './loggingContentGenerator.js';
import { InstallationManager } from '../utils/installationManager.js';
import { FakeContentGenerator } from './fakeContentGenerator.js';
import { parseCustomHeaders } from '../utils/customHeaderUtils.js';
import { determineSurface } from '../utils/surface.js';
import { RecordingContentGenerator } from './recordingContentGenerator.js';
import { getVersion, resolveModel } from '../../index.js';
export var AuthType;
(function (AuthType) {
    AuthType["LOGIN_WITH_GOOGLE"] = "oauth-personal";
    AuthType["USE_GEMINI"] = "gemini-api-key";
    AuthType["USE_VERTEX_AI"] = "vertex-ai";
    AuthType["LEGACY_CLOUD_SHELL"] = "cloud-shell";
    AuthType["COMPUTE_ADC"] = "compute-default-credentials";
    AuthType["GATEWAY"] = "gateway";
})(AuthType || (AuthType = {}));
/**
 * Detects the best authentication type based on environment variables.
 *
 * Checks in order:
 * 1. GOOGLE_GENAI_USE_GCA=true -> LOGIN_WITH_GOOGLE
 * 2. GOOGLE_GENAI_USE_VERTEXAI=true -> USE_VERTEX_AI
 * 3. GEMINI_API_KEY -> USE_GEMINI
 */
export function getAuthTypeFromEnv() {
    if (process.env['GOOGLE_GENAI_USE_GCA'] === 'true') {
        return AuthType.LOGIN_WITH_GOOGLE;
    }
    if (process.env['GOOGLE_GENAI_USE_VERTEXAI'] === 'true') {
        return AuthType.USE_VERTEX_AI;
    }
    if (process.env['GEMINI_API_KEY']) {
        return AuthType.USE_GEMINI;
    }
    if (process.env['CLOUD_SHELL'] === 'true' ||
        process.env['GEMINI_CLI_USE_COMPUTE_ADC'] === 'true') {
        return AuthType.COMPUTE_ADC;
    }
    return undefined;
}
const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]'];
function validateBaseUrl(baseUrl) {
    let url;
    try {
        url = new URL(baseUrl);
    }
    catch {
        throw new Error(`Invalid custom base URL: ${baseUrl}`);
    }
    if (url.protocol !== 'https:' && !LOCAL_HOSTNAMES.includes(url.hostname)) {
        throw new Error('Custom base URL must use HTTPS unless it is localhost.');
    }
}
export async function createContentGeneratorConfig(config, authType, apiKey, baseUrl, customHeaders) {
    const geminiApiKey = apiKey ||
        process.env['GEMINI_API_KEY'] ||
        (await loadApiKey()) ||
        undefined;
    const googleApiKey = process.env['GOOGLE_API_KEY'] || undefined;
    const googleCloudProject = process.env['GOOGLE_CLOUD_PROJECT'] ||
        process.env['GOOGLE_CLOUD_PROJECT_ID'] ||
        undefined;
    const googleCloudLocation = process.env['GOOGLE_CLOUD_LOCATION'] || undefined;
    const contentGeneratorConfig = {
        authType,
        proxy: config?.getProxy(),
        baseUrl,
        customHeaders,
    };
    // If we are using Google auth or we are in Cloud Shell, there is nothing else to validate for now
    if (authType === AuthType.LOGIN_WITH_GOOGLE ||
        authType === AuthType.COMPUTE_ADC) {
        return contentGeneratorConfig;
    }
    if (authType === AuthType.USE_GEMINI && geminiApiKey) {
        contentGeneratorConfig.apiKey = geminiApiKey;
        contentGeneratorConfig.vertexai = false;
        return contentGeneratorConfig;
    }
    if (authType === AuthType.USE_VERTEX_AI &&
        (googleApiKey || (googleCloudProject && googleCloudLocation))) {
        contentGeneratorConfig.apiKey = googleApiKey;
        contentGeneratorConfig.vertexai = true;
        return contentGeneratorConfig;
    }
    if (authType === AuthType.GATEWAY) {
        contentGeneratorConfig.apiKey = apiKey || 'gateway-placeholder-key';
        contentGeneratorConfig.vertexai = false;
        return contentGeneratorConfig;
    }
    return contentGeneratorConfig;
}
export async function createContentGenerator(config, gcConfig, sessionId) {
    const generator = await (async () => {
        if (gcConfig.fakeResponses) {
            const fakeGenerator = await FakeContentGenerator.fromFile(gcConfig.fakeResponses);
            return new LoggingContentGenerator(fakeGenerator, gcConfig);
        }
        const version = await getVersion();
        const model = resolveModel(gcConfig.getModel(), config.authType === AuthType.USE_GEMINI ||
            config.authType === AuthType.USE_VERTEX_AI ||
            ((await gcConfig.getGemini31Launched?.()) ?? false), config.authType === AuthType.USE_GEMINI ||
            config.authType === AuthType.USE_VERTEX_AI ||
            ((await gcConfig.getGemini31FlashLiteLaunched?.()) ?? false), false, gcConfig.getHasAccessToPreviewModel?.() ?? true, gcConfig);
        const customHeadersEnv = process.env['GEMINI_CLI_CUSTOM_HEADERS'] || undefined;
        const clientName = gcConfig.getClientName();
        const surface = determineSurface();
        let userAgent;
        // Use unified format for VS Code traffic.
        // Note: We don't automatically assume a2a-server is VS Code,
        // as it could be used by other clients unless the surface explicitly says 'vscode'.
        if (clientName === 'acp-vscode' || surface === 'vscode') {
            const osTypeMap = {
                darwin: 'macOS',
                win32: 'Windows',
                linux: 'Linux',
            };
            const osType = osTypeMap[process.platform] || process.platform;
            const osVersion = os.release();
            const arch = process.arch;
            const vscodeVersion = process.env['TERM_PROGRAM_VERSION'] || 'unknown';
            let hostPath = `VSCode/${vscodeVersion}`;
            if (isCloudShell()) {
                const cloudShellVersion = process.env['CLOUD_SHELL_VERSION'] || 'unknown';
                hostPath += ` > CloudShell/${cloudShellVersion}`;
            }
            userAgent = `CloudCodeVSCode/${version} (aidev_client; os_type=${osType}; os_version=${osVersion}; arch=${arch}; host_path=${hostPath}; proxy_client=geminicli)`;
        }
        else {
            const userAgentPrefix = clientName
                ? `GeminiCLI-${clientName}`
                : 'GeminiCLI';
            userAgent = `${userAgentPrefix}/${version}/${model} (${process.platform}; ${process.arch}; ${surface})`;
        }
        const customHeadersMap = parseCustomHeaders(customHeadersEnv);
        const apiKeyAuthMechanism = process.env['GEMINI_API_KEY_AUTH_MECHANISM'] || 'x-goog-api-key';
        const apiVersionEnv = process.env['GOOGLE_GENAI_API_VERSION'];
        const baseHeaders = {
            'User-Agent': userAgent,
            ...customHeadersMap,
        };
        if (apiKeyAuthMechanism === 'bearer' &&
            (config.authType === AuthType.USE_GEMINI ||
                config.authType === AuthType.USE_VERTEX_AI) &&
            config.apiKey) {
            baseHeaders['Authorization'] = `Bearer ${config.apiKey}`;
        }
        if (config.authType === AuthType.LOGIN_WITH_GOOGLE ||
            config.authType === AuthType.COMPUTE_ADC) {
            const httpOptions = { headers: baseHeaders };
            return new LoggingContentGenerator(await createCodeAssistContentGenerator(httpOptions, config.authType, gcConfig, sessionId), gcConfig);
        }
        if (config.authType === AuthType.USE_GEMINI ||
            config.authType === AuthType.USE_VERTEX_AI ||
            config.authType === AuthType.GATEWAY) {
            let headers = { ...baseHeaders };
            if (config.customHeaders) {
                headers = { ...headers, ...config.customHeaders };
            }
            if (gcConfig?.getUsageStatisticsEnabled()) {
                const installationManager = new InstallationManager();
                const installationId = installationManager.getInstallationId();
                headers = {
                    ...headers,
                    'x-gemini-api-privileged-user-id': `${installationId}`,
                };
            }
            let baseUrl = config.baseUrl;
            if (!baseUrl) {
                const envBaseUrl = config.authType === AuthType.USE_VERTEX_AI
                    ? process.env['GOOGLE_VERTEX_BASE_URL']
                    : process.env['GOOGLE_GEMINI_BASE_URL'];
                if (envBaseUrl) {
                    validateBaseUrl(envBaseUrl);
                    baseUrl = envBaseUrl;
                }
            }
            else {
                validateBaseUrl(baseUrl);
            }
            const httpOptions = { headers };
            if (baseUrl) {
                httpOptions.baseUrl = baseUrl;
            }
            const googleGenAI = new GoogleGenAI({
                apiKey: config.apiKey === '' ? undefined : config.apiKey,
                vertexai: config.vertexai ?? config.authType === AuthType.USE_VERTEX_AI,
                httpOptions,
                ...(apiVersionEnv && { apiVersion: apiVersionEnv }),
            });
            return new LoggingContentGenerator(googleGenAI.models, gcConfig);
        }
        throw new Error(`Error creating contentGenerator: Unsupported authType: ${config.authType}`);
    })();
    if (gcConfig.recordResponses) {
        return new RecordingContentGenerator(generator, gcConfig.recordResponses);
    }
    return generator;
}
//# sourceMappingURL=contentGenerator.js.map