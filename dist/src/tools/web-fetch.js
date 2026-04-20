/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseDeclarativeTool, BaseToolInvocation, Kind, } from './tools.js';
import { ToolErrorType } from './tool-error.js';
import { getErrorMessage } from '../utils/errors.js';
import { getResponseText } from '../utils/partUtils.js';
import { fetchWithTimeout, isPrivateIp } from '../utils/fetch.js';
import { truncateString } from '../utils/textUtils.js';
import { convert } from 'html-to-text';
import { logWebFetchFallbackAttempt, WebFetchFallbackAttemptEvent, logNetworkRetryAttempt, NetworkRetryAttemptEvent, } from '../telemetry/index.js';
import { LlmRole } from '../telemetry/llmRole.js';
import { WEB_FETCH_TOOL_NAME, WEB_FETCH_DISPLAY_NAME } from './tool-names.js';
import { debugLogger } from '../utils/debugLogger.js';
import { coreEvents } from '../utils/events.js';
import { retryWithBackoff, getRetryErrorType } from '../utils/retry.js';
import { WEB_FETCH_DEFINITION } from './definitions/coreTools.js';
import { resolveToolDeclaration } from './definitions/resolver.js';
import { LRUCache } from 'mnemonist';
const URL_FETCH_TIMEOUT_MS = 10000;
const MAX_CONTENT_LENGTH = 250000;
const MAX_EXPERIMENTAL_FETCH_SIZE = 10 * 1024 * 1024; // 10MB
const USER_AGENT = 'Mozilla/5.0 (compatible; Google-Gemini-CLI/1.0; +https://github.com/google-gemini/gemini-cli)';
const TRUNCATION_WARNING = '\n\n... [Content truncated due to size limit] ...';
// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;
const hostRequestHistory = new LRUCache(1000);
function checkRateLimit(url) {
    try {
        const hostname = new URL(url).hostname;
        const now = Date.now();
        const windowStart = now - RATE_LIMIT_WINDOW_MS;
        let history = hostRequestHistory.get(hostname) || [];
        // Clean up old timestamps
        history = history.filter((timestamp) => timestamp > windowStart);
        if (history.length >= MAX_REQUESTS_PER_WINDOW) {
            // Calculate wait time based on the oldest timestamp in the current window
            const oldestTimestamp = history[0];
            const waitTimeMs = oldestTimestamp + RATE_LIMIT_WINDOW_MS - now;
            hostRequestHistory.set(hostname, history); // Update cleaned history
            return { allowed: false, waitTimeMs: Math.max(0, waitTimeMs) };
        }
        history.push(now);
        hostRequestHistory.set(hostname, history);
        return { allowed: true };
    }
    catch {
        // If URL parsing fails, we fallback to allowed (should be caught by parsePrompt anyway)
        return { allowed: true };
    }
}
/**
 * Normalizes a URL by converting hostname to lowercase, removing trailing slashes,
 * and removing default ports.
 */
export function normalizeUrl(urlStr) {
    try {
        const url = new URL(urlStr);
        url.hostname = url.hostname.toLowerCase();
        // Remove trailing slash if present in pathname (except for root '/')
        if (url.pathname.endsWith('/') && url.pathname.length > 1) {
            url.pathname = url.pathname.slice(0, -1);
        }
        // Remove default ports
        if ((url.protocol === 'http:' && url.port === '80') ||
            (url.protocol === 'https:' && url.port === '443')) {
            url.port = '';
        }
        return url.href;
    }
    catch {
        return urlStr;
    }
}
/**
 * Parses a prompt to extract valid URLs and identify malformed ones.
 */
export function parsePrompt(text) {
    const tokens = text.split(/\s+/);
    const validUrls = [];
    const errors = [];
    for (const token of tokens) {
        if (!token)
            continue;
        // Heuristic to check if the url appears to contain URL-like chars.
        if (token.includes('://')) {
            try {
                // Validate with new URL()
                const url = new URL(token);
                // Allowlist protocols
                if (['http:', 'https:'].includes(url.protocol)) {
                    validUrls.push(url.href);
                }
                else {
                    errors.push(`Unsupported protocol in URL: "${token}". Only http and https are supported.`);
                }
            }
            catch {
                // new URL() threw, so it's malformed according to WHATWG standard
                errors.push(`Malformed URL detected: "${token}".`);
            }
        }
    }
    return { validUrls, errors };
}
/**
 * Safely converts a GitHub blob URL to a raw content URL.
 */
export function convertGithubUrlToRaw(urlStr) {
    try {
        const url = new URL(urlStr);
        if (url.hostname === 'github.com' && url.pathname.includes('/blob/')) {
            url.hostname = 'raw.githubusercontent.com';
            url.pathname = url.pathname.replace(/^\/([^/]+\/[^/]+)\/blob\//, '/$1/');
            return url.href;
        }
    }
    catch {
        // Ignore invalid URLs
    }
    return urlStr;
}
function isGroundingChunkItem(item) {
    return typeof item === 'object' && item !== null;
}
function isGroundingSupportItem(item) {
    return typeof item === 'object' && item !== null;
}
/**
 * Sanitizes text for safe embedding in XML tags.
 */
function sanitizeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
class WebFetchToolInvocation extends BaseToolInvocation {
    context;
    constructor(context, params, messageBus, _toolName, _toolDisplayName) {
        super(params, messageBus, _toolName, _toolDisplayName, undefined, undefined, true, () => this.context.config.getApprovalMode());
        this.context = context;
    }
    handleRetry(attempt, error, delayMs) {
        const maxAttempts = this.context.config.getMaxAttempts();
        const modelName = 'Web Fetch';
        const errorType = getRetryErrorType(error);
        coreEvents.emitRetryAttempt({
            attempt,
            maxAttempts,
            delayMs,
            error: errorType,
            model: modelName,
        });
        logNetworkRetryAttempt(this.context.config, new NetworkRetryAttemptEvent(attempt, maxAttempts, errorType, delayMs, modelName));
    }
    isBlockedHost(urlStr) {
        try {
            const url = new URL(urlStr);
            const hostname = url.hostname.toLowerCase();
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return true;
            }
            return isPrivateIp(urlStr);
        }
        catch {
            return true;
        }
    }
    async executeFallbackForUrl(urlStr, signal) {
        const url = convertGithubUrlToRaw(urlStr);
        if (this.isBlockedHost(url)) {
            debugLogger.warn(`[WebFetchTool] Blocked access to host: ${url}`);
            throw new Error(`Access to blocked or private host ${url} is not allowed.`);
        }
        const response = await retryWithBackoff(async () => {
            const res = await fetchWithTimeout(url, URL_FETCH_TIMEOUT_MS, {
                signal,
                headers: {
                    'User-Agent': USER_AGENT,
                },
            });
            if (!res.ok) {
                const error = new Error(`Request failed with status code ${res.status} ${res.statusText}`);
                error.status = res.status;
                throw error;
            }
            return res;
        }, {
            retryFetchErrors: this.context.config.getRetryFetchErrors(),
            onRetry: (attempt, error, delayMs) => this.handleRetry(attempt, error, delayMs),
            signal,
        });
        const bodyBuffer = await this.readResponseWithLimit(response, MAX_EXPERIMENTAL_FETCH_SIZE);
        const rawContent = bodyBuffer.toString('utf8');
        const contentType = response.headers.get('content-type') || '';
        let textContent;
        // Only use html-to-text if content type is HTML, or if no content type is provided (assume HTML)
        if (contentType.toLowerCase().includes('text/html') || contentType === '') {
            textContent = convert(rawContent, {
                wordwrap: false,
                selectors: [
                    { selector: 'a', options: { ignoreHref: true } },
                    { selector: 'img', format: 'skip' },
                ],
            });
        }
        else {
            // For other content types (text/plain, application/json, etc.), use raw text
            textContent = rawContent;
        }
        if (!this.context.config.isContextManagementEnabled()) {
            return truncateString(textContent, MAX_CONTENT_LENGTH, TRUNCATION_WARNING);
        }
        return textContent;
    }
    filterAndValidateUrls(urls) {
        const uniqueUrls = [...new Set(urls.map(normalizeUrl))];
        const toFetch = [];
        const skipped = [];
        for (const url of uniqueUrls) {
            if (this.isBlockedHost(url)) {
                debugLogger.warn(`[WebFetchTool] Skipped private or local host: ${url}`);
                logWebFetchFallbackAttempt(this.context.config, new WebFetchFallbackAttemptEvent('private_ip_skipped'));
                skipped.push(`[Blocked Host] ${url}`);
                continue;
            }
            if (!checkRateLimit(url).allowed) {
                debugLogger.warn(`[WebFetchTool] Rate limit exceeded for host: ${url}`);
                skipped.push(`[Rate limit exceeded] ${url}`);
                continue;
            }
            toFetch.push(url);
        }
        return { toFetch, skipped };
    }
    async executeFallback(urls, signal) {
        const uniqueUrls = [...new Set(urls)];
        const successes = [];
        const errors = [];
        for (const url of uniqueUrls) {
            try {
                const content = await this.executeFallbackForUrl(url, signal);
                successes.push({ url, content });
            }
            catch (e) {
                errors.push({ url, message: getErrorMessage(e) });
            }
        }
        // Change 2: Short-circuit on total failure
        if (successes.length === 0) {
            const errorMessage = `All fallback fetch attempts failed: ${errors
                .map((e) => `${e.url}: ${e.message}`)
                .join(', ')}`;
            debugLogger.error(`[WebFetchTool] ${errorMessage}`);
            return {
                llmContent: `Error: ${errorMessage}`,
                returnDisplay: `Error: ${errorMessage}`,
                error: {
                    message: errorMessage,
                    type: ToolErrorType.WEB_FETCH_FALLBACK_FAILED,
                },
            };
        }
        const finalContentsByUrl = new Map();
        if (this.context.config.isContextManagementEnabled()) {
            successes.forEach((success) => finalContentsByUrl.set(success.url, success.content));
        }
        else {
            // Smart Budget Allocation (Water-filling algorithm) for successes
            const sortedSuccesses = [...successes].sort((a, b) => a.content.length - b.content.length);
            let remainingBudget = MAX_CONTENT_LENGTH;
            let remainingUrls = sortedSuccesses.length;
            for (const success of sortedSuccesses) {
                const fairShare = Math.floor(remainingBudget / remainingUrls);
                const allocated = Math.min(success.content.length, fairShare);
                const truncated = truncateString(success.content, allocated, TRUNCATION_WARNING);
                finalContentsByUrl.set(success.url, truncated);
                remainingBudget -= truncated.length;
                remainingUrls--;
            }
        }
        const aggregatedContent = uniqueUrls
            .map((url) => {
            const content = finalContentsByUrl.get(url);
            if (content !== undefined) {
                return `<source url="${sanitizeXml(url)}">\n${sanitizeXml(content)}\n</source>`;
            }
            const error = errors.find((e) => e.url === url);
            return `<source url="${sanitizeXml(url)}">\nError: ${sanitizeXml(error?.message || 'Unknown error')}\n</source>`;
        })
            .join('\n');
        try {
            const geminiClient = this.context.geminiClient;
            const fallbackPrompt = `Follow the user's instructions below using the provided webpage content.

<user_instructions>
${sanitizeXml(this.params.prompt ?? '')}
</user_instructions>

I was unable to access the URL(s) directly using the primary fetch tool. Instead, I have fetched the raw content of the page(s). Please use the following content to answer the request. Do not attempt to access the URL(s) again.

<content>
${aggregatedContent}
</content>
`;
            const result = await geminiClient.generateContent({ model: 'web-fetch-fallback' }, [{ role: 'user', parts: [{ text: fallbackPrompt }] }], signal, LlmRole.UTILITY_TOOL);
            debugLogger.debug(`[WebFetchTool] Fallback response for prompt "${this.params.prompt?.substring(0, 50)}...":`, JSON.stringify(result, null, 2));
            const resultText = getResponseText(result) || '';
            debugLogger.debug(`[WebFetchTool] Formatted fallback tool response for prompt "${this.params.prompt}":\n\n`, resultText);
            return {
                llmContent: resultText,
                returnDisplay: `Content for ${urls.length} URL(s) processed using fallback fetch.`,
            };
        }
        catch (e) {
            const errorMessage = `Error during fallback processing: ${getErrorMessage(e)}`;
            debugLogger.error(`[WebFetchTool] Fallback failed: ${errorMessage}`);
            return {
                llmContent: `Error: ${errorMessage}`,
                returnDisplay: `Error: ${errorMessage}`,
                error: {
                    message: errorMessage,
                    type: ToolErrorType.WEB_FETCH_FALLBACK_FAILED,
                },
            };
        }
    }
    getDescription() {
        if (this.params.url) {
            return `Fetching content from: ${this.params.url}`;
        }
        const prompt = this.params.prompt || '';
        const displayPrompt = prompt.length > 100 ? prompt.substring(0, 97) + '...' : prompt;
        return `Processing URLs and instructions from prompt: "${displayPrompt}"`;
    }
    getPolicyUpdateOptions(_outcome) {
        return {};
    }
    async getConfirmationDetails(_abortSignal) {
        let urls = [];
        let prompt = this.params.prompt || '';
        if (this.params.url) {
            urls = [this.params.url];
            prompt = `Fetch ${this.params.url}`;
        }
        else if (this.params.prompt) {
            const { validUrls } = parsePrompt(this.params.prompt);
            urls = validUrls;
        }
        // Perform GitHub URL conversion here
        urls = urls.map((url) => convertGithubUrlToRaw(url));
        const confirmationDetails = {
            type: 'info',
            title: `Confirm Web Fetch`,
            prompt,
            urls,
            onConfirm: async (_outcome) => {
                // Mode transitions (e.g. AUTO_EDIT) and policy updates are now
                // handled centrally by the scheduler.
            },
        };
        return confirmationDetails;
    }
    async readResponseWithLimit(response, limit) {
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > limit) {
            throw new Error(`Content exceeds size limit of ${limit} bytes`);
        }
        if (!response.body) {
            return Buffer.alloc(0);
        }
        const reader = response.body.getReader();
        const chunks = [];
        let totalLength = 0;
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                totalLength += value.length;
                if (totalLength > limit) {
                    // Attempt to cancel the reader to stop the stream
                    await reader.cancel().catch(() => { });
                    throw new Error(`Content exceeds size limit of ${limit} bytes`);
                }
                chunks.push(value);
            }
        }
        finally {
            reader.releaseLock();
        }
        return Buffer.concat(chunks);
    }
    async executeExperimental(signal) {
        if (!this.params.url) {
            return {
                llmContent: 'Error: No URL provided.',
                returnDisplay: 'Error: No URL provided.',
                error: {
                    message: 'No URL provided.',
                    type: ToolErrorType.INVALID_TOOL_PARAMS,
                },
            };
        }
        let url;
        try {
            url = new URL(this.params.url).href;
        }
        catch {
            return {
                llmContent: `Error: Invalid URL "${this.params.url}"`,
                returnDisplay: `Error: Invalid URL "${this.params.url}"`,
                error: {
                    message: `Invalid URL "${this.params.url}"`,
                    type: ToolErrorType.INVALID_TOOL_PARAMS,
                },
            };
        }
        // Convert GitHub blob URL to raw URL
        url = convertGithubUrlToRaw(url);
        if (this.isBlockedHost(url)) {
            const errorMessage = `Access to blocked or private host ${url} is not allowed.`;
            debugLogger.warn(`[WebFetchTool] Blocked experimental fetch to host: ${url}`);
            return {
                llmContent: `Error: ${errorMessage}`,
                returnDisplay: `Error: ${errorMessage}`,
                error: {
                    message: errorMessage,
                    type: ToolErrorType.WEB_FETCH_PROCESSING_ERROR,
                },
            };
        }
        try {
            const response = await retryWithBackoff(async () => {
                const res = await fetchWithTimeout(url, URL_FETCH_TIMEOUT_MS, {
                    signal,
                    headers: {
                        Accept: 'text/markdown, text/plain;q=0.9, application/json;q=0.9, text/html;q=0.8, application/pdf;q=0.7, video/*;q=0.7, */*;q=0.5',
                        'User-Agent': USER_AGENT,
                    },
                });
                return res;
            }, {
                retryFetchErrors: this.context.config.getRetryFetchErrors(),
                onRetry: (attempt, error, delayMs) => this.handleRetry(attempt, error, delayMs),
                signal,
            });
            const contentType = response.headers.get('content-type') || '';
            const status = response.status;
            const bodyBuffer = await this.readResponseWithLimit(response, MAX_EXPERIMENTAL_FETCH_SIZE);
            if (status >= 400) {
                let rawResponseText = bodyBuffer.toString('utf8');
                if (!this.context.config.isContextManagementEnabled()) {
                    rawResponseText = truncateString(rawResponseText, 10000, '\n\n... [Error response truncated] ...');
                }
                const headers = {};
                response.headers.forEach((value, key) => {
                    headers[key] = value;
                });
                const errorContent = `Request failed with status ${status}
Headers: ${JSON.stringify(headers, null, 2)}
Response: ${rawResponseText}`;
                debugLogger.error(`[WebFetchTool] Experimental fetch failed with status ${status} for ${url}`);
                return {
                    llmContent: errorContent,
                    returnDisplay: `Failed to fetch ${url} (Status: ${status})`,
                };
            }
            const lowContentType = contentType.toLowerCase();
            if (lowContentType.includes('text/markdown') ||
                lowContentType.includes('text/plain') ||
                lowContentType.includes('application/json')) {
                let text = bodyBuffer.toString('utf8');
                if (!this.context.config.isContextManagementEnabled()) {
                    text = truncateString(text, MAX_CONTENT_LENGTH, TRUNCATION_WARNING);
                }
                return {
                    llmContent: text,
                    returnDisplay: `Fetched ${contentType} content from ${url}`,
                };
            }
            if (lowContentType.includes('text/html')) {
                const html = bodyBuffer.toString('utf8');
                let textContent = convert(html, {
                    wordwrap: false,
                    selectors: [
                        { selector: 'a', options: { ignoreHref: false, baseUrl: url } },
                    ],
                });
                if (!this.context.config.isContextManagementEnabled()) {
                    textContent = truncateString(textContent, MAX_CONTENT_LENGTH, TRUNCATION_WARNING);
                }
                return {
                    llmContent: textContent,
                    returnDisplay: `Fetched and converted HTML content from ${url}`,
                };
            }
            if (lowContentType.startsWith('image/') ||
                lowContentType.startsWith('video/') ||
                lowContentType === 'application/pdf') {
                const base64Data = bodyBuffer.toString('base64');
                return {
                    llmContent: {
                        inlineData: {
                            data: base64Data,
                            mimeType: contentType.split(';')[0],
                        },
                    },
                    returnDisplay: `Fetched ${contentType} from ${url}`,
                };
            }
            // Fallback for unknown types - try as text
            let text = bodyBuffer.toString('utf8');
            if (!this.context.config.isContextManagementEnabled()) {
                text = truncateString(text, MAX_CONTENT_LENGTH, TRUNCATION_WARNING);
            }
            return {
                llmContent: text,
                returnDisplay: `Fetched ${contentType || 'unknown'} content from ${url}`,
            };
        }
        catch (e) {
            const errorMessage = `Error during experimental fetch for ${url}: ${getErrorMessage(e)}`;
            debugLogger.error(`[WebFetchTool] Experimental fetch error: ${errorMessage}`);
            return {
                llmContent: `Error: ${errorMessage}`,
                returnDisplay: `Error: ${errorMessage}`,
                error: {
                    message: errorMessage,
                    type: ToolErrorType.WEB_FETCH_FALLBACK_FAILED,
                },
            };
        }
    }
    async execute({ abortSignal: signal }) {
        if (this.context.config.getDirectWebFetch()) {
            return this.executeExperimental(signal);
        }
        const userPrompt = this.params.prompt;
        const { validUrls } = parsePrompt(userPrompt);
        const { toFetch, skipped } = this.filterAndValidateUrls(validUrls);
        // If everything was skipped, fail early
        if (toFetch.length === 0 && skipped.length > 0) {
            const errorMessage = `All requested URLs were skipped: ${skipped.join(', ')}`;
            debugLogger.error(`[WebFetchTool] ${errorMessage}`);
            return {
                llmContent: `Error: ${errorMessage}`,
                returnDisplay: `Error: ${errorMessage}`,
                error: {
                    message: errorMessage,
                    type: ToolErrorType.WEB_FETCH_PROCESSING_ERROR,
                },
            };
        }
        try {
            const geminiClient = this.context.geminiClient;
            const sanitizedPrompt = `Follow the user's instructions to process the authorized URLs.

<user_instructions>
${sanitizeXml(userPrompt)}
</user_instructions>

<authorized_urls>
${toFetch.join('\n')}
</authorized_urls>
`;
            const response = await geminiClient.generateContent({ model: 'web-fetch' }, [{ role: 'user', parts: [{ text: sanitizedPrompt }] }], signal, LlmRole.UTILITY_TOOL);
            debugLogger.debug(`[WebFetchTool] Full response for prompt "${userPrompt.substring(0, 50)}...":`, JSON.stringify(response, null, 2));
            let responseText = getResponseText(response) || '';
            const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
            // Simple primary success check: we need some text or grounding data
            if (!responseText.trim() && !groundingMetadata?.groundingChunks?.length) {
                throw new Error('Primary fetch returned no content');
            }
            // 1. Apply Grounding Supports (Citations)
            const groundingSupports = groundingMetadata?.groundingSupports?.filter(isGroundingSupportItem);
            if (groundingSupports && groundingSupports.length > 0) {
                const insertions = [];
                groundingSupports.forEach((support) => {
                    if (support.segment && support.groundingChunkIndices) {
                        const citationMarker = support.groundingChunkIndices
                            .map((chunkIndex) => `[${chunkIndex + 1}]`)
                            .join('');
                        insertions.push({
                            index: support.segment.endIndex,
                            marker: citationMarker,
                        });
                    }
                });
                insertions.sort((a, b) => b.index - a.index);
                const responseChars = responseText.split('');
                insertions.forEach((insertion) => {
                    responseChars.splice(insertion.index, 0, insertion.marker);
                });
                responseText = responseChars.join('');
            }
            // 2. Append Source List
            const sources = groundingMetadata?.groundingChunks?.filter(isGroundingChunkItem);
            if (sources && sources.length > 0) {
                const sourceListFormatted = [];
                sources.forEach((source, index) => {
                    const title = source.web?.title || 'Untitled';
                    const uri = source.web?.uri || 'Unknown URI';
                    sourceListFormatted.push(`[${index + 1}] ${title} (${uri})`);
                });
                responseText += `\n\nSources:\n${sourceListFormatted.join('\n')}`;
            }
            // 3. Prepend Warnings for skipped URLs
            if (skipped.length > 0) {
                responseText = `[Warning] The following URLs were skipped:\n${skipped.join('\n')}\n\n${responseText}`;
            }
            debugLogger.debug(`[WebFetchTool] Formatted tool response for prompt "${userPrompt}":\n\n`, responseText);
            return {
                llmContent: responseText,
                returnDisplay: `Content processed from prompt.`,
            };
        }
        catch (error) {
            debugLogger.warn(`[WebFetchTool] Primary fetch failed, falling back: ${getErrorMessage(error)}`);
            logWebFetchFallbackAttempt(this.context.config, new WebFetchFallbackAttemptEvent('primary_failed'));
            // Simple All-or-Nothing Fallback
            return this.executeFallback(toFetch, signal);
        }
    }
}
/**
 * Implementation of the WebFetch tool logic
 */
export class WebFetchTool extends BaseDeclarativeTool {
    context;
    static Name = WEB_FETCH_TOOL_NAME;
    constructor(context, messageBus) {
        super(WebFetchTool.Name, WEB_FETCH_DISPLAY_NAME, WEB_FETCH_DEFINITION.base.description, Kind.Fetch, WEB_FETCH_DEFINITION.base.parametersJsonSchema, messageBus, true, // isOutputMarkdown
        false);
        this.context = context;
    }
    validateToolParamValues(params) {
        if (this.context.config.getDirectWebFetch()) {
            if (!params.url) {
                return "The 'url' parameter is required.";
            }
            try {
                new URL(params.url);
            }
            catch {
                return `Invalid URL: "${params.url}"`;
            }
            return null;
        }
        if (!params.prompt || params.prompt.trim() === '') {
            return "The 'prompt' parameter cannot be empty and must contain URL(s) and instructions.";
        }
        const { validUrls, errors } = parsePrompt(params.prompt);
        if (errors.length > 0) {
            return `Error(s) in prompt URLs:\n- ${errors.join('\n- ')}`;
        }
        if (validUrls.length === 0) {
            return "The 'prompt' must contain at least one valid URL (starting with http:// or https://).";
        }
        return null;
    }
    createInvocation(params, messageBus, _toolName, _toolDisplayName) {
        return new WebFetchToolInvocation(this.context, params, messageBus, _toolName, _toolDisplayName);
    }
    getSchema(modelId) {
        const schema = resolveToolDeclaration(WEB_FETCH_DEFINITION, modelId);
        if (this.context.config.getDirectWebFetch()) {
            return {
                ...schema,
                description: 'Fetch content from a URL directly. Send multiple requests for this tool if multiple URL fetches are needed.',
                parametersJsonSchema: {
                    type: 'object',
                    properties: {
                        url: {
                            type: 'string',
                            description: 'The URL to fetch. Must be a valid http or https URL.',
                        },
                    },
                    required: ['url'],
                },
            };
        }
        return schema;
    }
}
//# sourceMappingURL=web-fetch.js.map