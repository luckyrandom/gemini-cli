/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import {} from '../utils/thoughtUtils.js';
import { getProjectHash } from '../utils/paths.js';
import path from 'node:path';
import * as fs from 'node:fs';
import { sanitizeFilenamePart } from '../utils/fileUtils.js';
import { isNodeError } from '../utils/errors.js';
import { deleteSessionArtifactsAsync, deleteSubagentSessionDirAndArtifactsAsync, } from '../utils/sessionOperations.js';
import readline from 'node:readline';
import { randomUUID } from 'node:crypto';
import { debugLogger } from '../utils/debugLogger.js';
import { SESSION_FILE_PREFIX, } from './chatRecordingTypes.js';
export * from './chatRecordingTypes.js';
/**
 * Warning message shown when recording is disabled due to disk full.
 */
const ENOSPC_WARNING_MESSAGE = 'Chat recording disabled: No space left on device. ' +
    'The conversation will continue but will not be saved to disk. ' +
    'Free up disk space and restart to enable recording.';
function hasProperty(obj, prop) {
    return obj !== null && typeof obj === 'object' && prop in obj;
}
function isStringProperty(obj, prop) {
    return hasProperty(obj, prop) && typeof obj[prop] === 'string';
}
function isObjectProperty(obj, prop) {
    return (hasProperty(obj, prop) &&
        obj[prop] !== null &&
        typeof obj[prop] === 'object');
}
function isRewindRecord(record) {
    return isStringProperty(record, '$rewindTo');
}
function isMessageRecord(record) {
    return isStringProperty(record, 'id');
}
function isMetadataUpdateRecord(record) {
    return isObjectProperty(record, '$set');
}
function isPartialMetadataRecord(record) {
    return (isStringProperty(record, 'sessionId') &&
        isStringProperty(record, 'projectHash'));
}
function isTextPart(part) {
    return isStringProperty(part, 'text');
}
function isSessionIdRecord(record) {
    return isStringProperty(record, 'sessionId');
}
export async function loadConversationRecord(filePath, options) {
    if (!fs.existsSync(filePath)) {
        return null;
    }
    try {
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity,
        });
        let metadata = {};
        const messagesMap = new Map();
        const messageIds = [];
        let firstUserMessageStr;
        let hasUserOrAssistant = false;
        for await (const line of rl) {
            if (!line.trim())
                continue;
            try {
                const record = JSON.parse(line);
                if (isRewindRecord(record)) {
                    const rewindId = record.$rewindTo;
                    if (options?.metadataOnly) {
                        const idx = messageIds.indexOf(rewindId);
                        if (idx !== -1) {
                            messageIds.splice(idx);
                        }
                        else {
                            messageIds.length = 0;
                        }
                        // For metadataOnly we can't perfectly un-track hasUserOrAssistant if it was rewinded,
                        // but we can assume false if messageIds is empty.
                        if (messageIds.length === 0)
                            hasUserOrAssistant = false;
                    }
                    else {
                        let found = false;
                        const idsToDelete = [];
                        for (const [id] of messagesMap) {
                            if (id === rewindId)
                                found = true;
                            if (found)
                                idsToDelete.push(id);
                        }
                        if (found) {
                            for (const id of idsToDelete) {
                                messagesMap.delete(id);
                            }
                        }
                        else {
                            messagesMap.clear();
                        }
                    }
                }
                else if (isMessageRecord(record)) {
                    const id = record.id;
                    if (hasProperty(record, 'type') &&
                        (record.type === 'user' || record.type === 'gemini')) {
                        hasUserOrAssistant = true;
                    }
                    // Track message count and first user message
                    if (options?.metadataOnly) {
                        messageIds.push(id);
                    }
                    if (!firstUserMessageStr &&
                        hasProperty(record, 'type') &&
                        record['type'] === 'user' &&
                        hasProperty(record, 'content') &&
                        record['content']) {
                        // Basic extraction of first user message for display
                        const rawContent = record['content'];
                        if (Array.isArray(rawContent)) {
                            firstUserMessageStr = rawContent
                                .map((p) => (isTextPart(p) ? p['text'] : ''))
                                .join('');
                        }
                        else if (typeof rawContent === 'string') {
                            firstUserMessageStr = rawContent;
                        }
                    }
                    if (!options?.metadataOnly) {
                        messagesMap.set(id, record);
                        if (options?.maxMessages &&
                            messagesMap.size > options.maxMessages) {
                            const firstKey = messagesMap.keys().next().value;
                            if (typeof firstKey === 'string')
                                messagesMap.delete(firstKey);
                        }
                    }
                }
                else if (isMetadataUpdateRecord(record)) {
                    // Metadata update
                    metadata = {
                        ...metadata,
                        ...record.$set,
                    };
                }
                else if (isPartialMetadataRecord(record)) {
                    // Initial metadata line
                    metadata = { ...metadata, ...record };
                }
            }
            catch {
                // ignore parse errors on individual lines
            }
        }
        if (!metadata.sessionId || !metadata.projectHash) {
            return await parseLegacyRecordFallback(filePath, options);
        }
        return {
            sessionId: metadata.sessionId,
            projectHash: metadata.projectHash,
            startTime: metadata.startTime || new Date().toISOString(),
            lastUpdated: metadata.lastUpdated || new Date().toISOString(),
            summary: metadata.summary,
            directories: metadata.directories,
            kind: metadata.kind,
            messages: Array.from(messagesMap.values()),
            messageCount: options?.metadataOnly
                ? messageIds.length
                : messagesMap.size,
            firstUserMessage: firstUserMessageStr,
            hasUserOrAssistantMessage: options?.metadataOnly
                ? hasUserOrAssistant
                : Array.from(messagesMap.values()).some((m) => m.type === 'user' || m.type === 'gemini'),
        };
    }
    catch (error) {
        debugLogger.error('Error loading conversation record from JSONL:', error);
        return null;
    }
}
export class ChatRecordingService {
    conversationFile = null;
    cachedConversation = null;
    sessionId;
    projectHash;
    kind;
    queuedThoughts = [];
    queuedTokens = null;
    context;
    constructor(context) {
        this.context = context;
        this.sessionId = context.promptId;
        this.projectHash = getProjectHash(context.config.getProjectRoot());
    }
    async initialize(resumedSessionData, kind) {
        try {
            this.kind = kind;
            if (resumedSessionData) {
                this.conversationFile = resumedSessionData.filePath;
                this.sessionId = resumedSessionData.conversation.sessionId;
                this.kind = resumedSessionData.conversation.kind;
                const loadedRecord = await loadConversationRecord(this.conversationFile);
                if (loadedRecord) {
                    this.cachedConversation = loadedRecord;
                    this.projectHash = this.cachedConversation.projectHash;
                    if (this.conversationFile.endsWith('.json')) {
                        this.conversationFile = this.conversationFile + 'l'; // e.g. session-foo.jsonl
                        // Migrate the entire legacy record to the new file
                        const initialMetadata = {
                            sessionId: this.sessionId,
                            projectHash: this.projectHash,
                            startTime: this.cachedConversation.startTime,
                            lastUpdated: this.cachedConversation.lastUpdated,
                            kind: this.cachedConversation.kind,
                            directories: this.cachedConversation.directories,
                            summary: this.cachedConversation.summary,
                        };
                        this.appendRecord(initialMetadata);
                        for (const msg of this.cachedConversation.messages) {
                            this.appendRecord(msg);
                        }
                    }
                    // Update the session ID in the existing file
                    this.updateMetadata({ sessionId: this.sessionId });
                }
                else {
                    throw new Error('Failed to load resumed session data from file');
                }
            }
            else {
                // Create new session
                this.sessionId = this.context.promptId;
                let chatsDir = path.join(this.context.config.storage.getProjectTempDir(), 'chats');
                // subagents are nested under the complete parent session id
                if (this.kind === 'subagent' && this.context.parentSessionId) {
                    const safeParentId = sanitizeFilenamePart(this.context.parentSessionId);
                    if (!safeParentId) {
                        throw new Error(`Invalid parentSessionId after sanitization: ${this.context.parentSessionId}`);
                    }
                    chatsDir = path.join(chatsDir, safeParentId);
                }
                fs.mkdirSync(chatsDir, { recursive: true });
                const timestamp = new Date()
                    .toISOString()
                    .slice(0, 16)
                    .replace(/:/g, '-');
                const safeSessionId = sanitizeFilenamePart(this.sessionId);
                if (!safeSessionId) {
                    throw new Error(`Invalid sessionId after sanitization: ${this.sessionId}`);
                }
                let filename;
                if (this.kind === 'subagent') {
                    filename = `${safeSessionId}.jsonl`;
                }
                else {
                    filename = `${SESSION_FILE_PREFIX}${timestamp}-${safeSessionId.slice(0, 8)}.jsonl`;
                }
                this.conversationFile = path.join(chatsDir, filename);
                const directories = this.kind === 'subagent'
                    ? [
                        ...(this.context.config
                            .getWorkspaceContext()
                            ?.getDirectories() ?? []),
                    ]
                    : undefined;
                const initialMetadata = {
                    sessionId: this.sessionId,
                    projectHash: this.projectHash,
                    startTime: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    kind: this.kind,
                    directories,
                };
                this.appendRecord(initialMetadata);
                this.cachedConversation = {
                    ...initialMetadata,
                    messages: [],
                };
            }
            this.queuedThoughts = [];
            this.queuedTokens = null;
        }
        catch (error) {
            if (isNodeError(error) && error.code === 'ENOSPC') {
                this.conversationFile = null;
                debugLogger.warn(ENOSPC_WARNING_MESSAGE);
                return;
            }
            debugLogger.error('Error initializing chat recording service:', error);
            throw error;
        }
    }
    appendRecord(record) {
        if (!this.conversationFile)
            return;
        try {
            const line = JSON.stringify(record) + '\n';
            fs.mkdirSync(path.dirname(this.conversationFile), { recursive: true });
            fs.appendFileSync(this.conversationFile, line);
        }
        catch (error) {
            if (isNodeError(error) && error.code === 'ENOSPC') {
                this.conversationFile = null;
                debugLogger.warn(ENOSPC_WARNING_MESSAGE);
            }
            else {
                throw error;
            }
        }
    }
    updateMetadata(updates) {
        if (!this.cachedConversation)
            return;
        Object.assign(this.cachedConversation, updates);
        this.appendRecord({ $set: updates });
    }
    pushMessage(msg) {
        if (!this.cachedConversation)
            return;
        // We append the full message to the log
        this.appendRecord(msg);
        // Now update memory
        const index = this.cachedConversation.messages.findIndex((m) => m.id === msg.id);
        if (index !== -1) {
            this.cachedConversation.messages[index] = msg;
        }
        else {
            this.cachedConversation.messages.push(msg);
        }
    }
    getLastMessage(conversation) {
        return conversation.messages.at(-1);
    }
    newMessage(type, content, displayContent) {
        return {
            id: randomUUID(),
            timestamp: new Date().toISOString(),
            type,
            content,
            displayContent,
        };
    }
    recordMessage(message) {
        if (!this.conversationFile || !this.cachedConversation)
            return;
        try {
            const msg = this.newMessage(message.type, message.content, message.displayContent);
            if (msg.type === 'gemini') {
                msg.thoughts = this.queuedThoughts;
                msg.tokens = this.queuedTokens;
                msg.model = message.model;
                this.queuedThoughts = [];
                this.queuedTokens = null;
            }
            this.pushMessage(msg);
            this.updateMetadata({ lastUpdated: new Date().toISOString() });
        }
        catch (error) {
            debugLogger.error('Error saving message to chat history.', error);
            throw error;
        }
    }
    recordThought(thought) {
        if (!this.conversationFile)
            return;
        this.queuedThoughts.push({
            ...thought,
            timestamp: new Date().toISOString(),
        });
    }
    recordMessageTokens(respUsageMetadata) {
        if (!this.conversationFile || !this.cachedConversation)
            return;
        try {
            const tokens = {
                input: respUsageMetadata.promptTokenCount ?? 0,
                output: respUsageMetadata.candidatesTokenCount ?? 0,
                cached: respUsageMetadata.cachedContentTokenCount ?? 0,
                thoughts: respUsageMetadata.thoughtsTokenCount ?? 0,
                tool: respUsageMetadata.toolUsePromptTokenCount ?? 0,
                total: respUsageMetadata.totalTokenCount ?? 0,
            };
            const lastMsg = this.getLastMessage(this.cachedConversation);
            if (lastMsg && lastMsg.type === 'gemini' && !lastMsg.tokens) {
                lastMsg.tokens = tokens;
                this.queuedTokens = null;
                this.pushMessage(lastMsg);
            }
            else {
                this.queuedTokens = tokens;
            }
        }
        catch (error) {
            debugLogger.error('Error updating message tokens in chat history.', error);
            throw error;
        }
    }
    recordToolCalls(model, toolCalls) {
        if (!this.conversationFile || !this.cachedConversation)
            return;
        const toolRegistry = this.context.toolRegistry;
        const enrichedToolCalls = toolCalls.map((toolCall) => {
            const toolInstance = toolRegistry.getTool(toolCall.name);
            return {
                ...toolCall,
                displayName: toolInstance?.displayName || toolCall.name,
                description: toolCall.description?.trim() || toolInstance?.description || '',
                renderOutputAsMarkdown: toolInstance?.isOutputMarkdown || false,
            };
        });
        try {
            const lastMsg = this.getLastMessage(this.cachedConversation);
            if (!lastMsg ||
                lastMsg.type !== 'gemini' ||
                this.queuedThoughts.length > 0) {
                const newMsg = {
                    ...this.newMessage('gemini', ''),
                    type: 'gemini',
                    toolCalls: enrichedToolCalls,
                    thoughts: this.queuedThoughts,
                    model,
                };
                if (this.queuedThoughts.length > 0) {
                    newMsg.thoughts = this.queuedThoughts;
                    this.queuedThoughts = [];
                }
                if (this.queuedTokens) {
                    newMsg.tokens = this.queuedTokens;
                    this.queuedTokens = null;
                }
                this.pushMessage(newMsg);
            }
            else {
                if (!lastMsg.toolCalls) {
                    lastMsg.toolCalls = [];
                }
                // Deep clone toolCalls to avoid modifying memory references directly
                const updatedToolCalls = [...lastMsg.toolCalls];
                for (const toolCall of enrichedToolCalls) {
                    const index = updatedToolCalls.findIndex((tc) => tc.id === toolCall.id);
                    if (index !== -1) {
                        updatedToolCalls[index] = {
                            ...updatedToolCalls[index],
                            ...toolCall,
                        };
                    }
                    else {
                        updatedToolCalls.push(toolCall);
                    }
                }
                lastMsg.toolCalls = updatedToolCalls;
                this.pushMessage(lastMsg);
            }
        }
        catch (error) {
            debugLogger.error('Error adding tool call to message in chat history.', error);
            throw error;
        }
    }
    saveSummary(summary) {
        if (!this.conversationFile)
            return;
        try {
            this.updateMetadata({ summary });
        }
        catch (error) {
            debugLogger.error('Error saving summary to chat history.', error);
        }
    }
    recordDirectories(directories) {
        if (!this.conversationFile)
            return;
        try {
            this.updateMetadata({ directories: [...directories] });
        }
        catch (error) {
            debugLogger.error('Error saving directories to chat history.', error);
        }
    }
    getConversation() {
        if (!this.conversationFile)
            return null;
        return this.cachedConversation;
    }
    getConversationFilePath() {
        return this.conversationFile;
    }
    /**
     * Deletes a session file by sessionId, filename, or basename.
     * Derives an 8-character shortId to find and delete all associated files
     * (parent and subagents).
     *
     * @throws {Error} If shortId validation fails.
     */
    async deleteSession(sessionIdOrBasename) {
        try {
            const tempDir = this.context.config.storage.getProjectTempDir();
            const chatsDir = path.join(tempDir, 'chats');
            const shortId = this.deriveShortId(sessionIdOrBasename);
            // Using stat instead of existsSync for async sanity
            if (!(await fs.promises.stat(chatsDir).catch(() => null))) {
                return; // Nothing to delete
            }
            const matchingFiles = await this.getMatchingSessionFiles(chatsDir, shortId);
            for (const file of matchingFiles) {
                await this.deleteSessionAndArtifacts(chatsDir, file, tempDir);
            }
        }
        catch (error) {
            debugLogger.error('Error deleting session file.', error);
            throw error;
        }
    }
    deriveShortId(sessionIdOrBasename) {
        let shortId = sessionIdOrBasename;
        if (sessionIdOrBasename.startsWith(SESSION_FILE_PREFIX)) {
            const withoutExt = sessionIdOrBasename.replace(/\.jsonl?$/, '');
            const parts = withoutExt.split('-');
            shortId = parts[parts.length - 1];
        }
        else if (sessionIdOrBasename.length >= 8) {
            shortId = sessionIdOrBasename.slice(0, 8);
        }
        else {
            throw new Error('Invalid sessionId or basename provided for deletion');
        }
        if (shortId.length !== 8) {
            throw new Error('Derived shortId must be exactly 8 characters');
        }
        return shortId;
    }
    async getMatchingSessionFiles(chatsDir, shortId) {
        const files = await fs.promises.readdir(chatsDir);
        return files.filter((f) => f.startsWith(SESSION_FILE_PREFIX) &&
            (f.endsWith(`-${shortId}.json`) || f.endsWith(`-${shortId}.jsonl`)));
    }
    /**
     * Deletes a single session file and its associated logs, tool-outputs, and directory.
     */
    async deleteSessionAndArtifacts(chatsDir, file, tempDir) {
        const filePath = path.join(chatsDir, file);
        try {
            const CHUNK_SIZE = 4096;
            const buffer = Buffer.alloc(CHUNK_SIZE);
            let firstLine;
            let fd;
            try {
                fd = await fs.promises.open(filePath, 'r');
                const { bytesRead } = await fd.read(buffer, 0, CHUNK_SIZE, 0);
                if (bytesRead === 0) {
                    await fd.close();
                    await fs.promises.unlink(filePath);
                    return;
                }
                const contentChunk = buffer.toString('utf8', 0, bytesRead);
                const newlineIndex = contentChunk.indexOf('\n');
                firstLine =
                    newlineIndex !== -1
                        ? contentChunk.substring(0, newlineIndex)
                        : contentChunk;
            }
            finally {
                if (fd !== undefined) {
                    await fd.close();
                }
            }
            const content = JSON.parse(firstLine);
            let fullSessionId;
            if (isSessionIdRecord(content)) {
                fullSessionId = content['sessionId'];
            }
            // Delete the session file
            await fs.promises.unlink(filePath);
            if (fullSessionId) {
                // Delegate to shared utility!
                await deleteSessionArtifactsAsync(fullSessionId, tempDir);
                await deleteSubagentSessionDirAndArtifactsAsync(fullSessionId, chatsDir, tempDir);
            }
        }
        catch (error) {
            debugLogger.error(`Error deleting associated file ${file}:`, error);
        }
    }
    /**
     * Rewinds the conversation to the state just before the specified message ID.
     * All messages from (and including) the specified ID onwards are removed.
     */
    rewindTo(messageId) {
        if (!this.conversationFile || !this.cachedConversation)
            return null;
        const messageIndex = this.cachedConversation.messages.findIndex((m) => m.id === messageId);
        if (messageIndex === -1) {
            debugLogger.error('Message to rewind to not found in conversation history');
            return this.cachedConversation;
        }
        this.cachedConversation.messages = this.cachedConversation.messages.slice(0, messageIndex);
        this.appendRecord({ $rewindTo: messageId });
        return this.cachedConversation;
    }
    updateMessagesFromHistory(history) {
        if (!this.conversationFile || !this.cachedConversation)
            return;
        try {
            const partsMap = new Map();
            for (const content of history) {
                if (content.role === 'user' && content.parts) {
                    const callIds = content.parts
                        .map((p) => p.functionResponse?.id)
                        .filter((id) => !!id);
                    if (callIds.length === 0)
                        continue;
                    let currentCallId = callIds[0];
                    for (const part of content.parts) {
                        if (part.functionResponse?.id) {
                            currentCallId = part.functionResponse.id;
                        }
                        if (!partsMap.has(currentCallId)) {
                            partsMap.set(currentCallId, []);
                        }
                        partsMap.get(currentCallId).push(part);
                    }
                }
            }
            for (const message of this.cachedConversation.messages) {
                let msgChanged = false;
                if (message.type === 'gemini' && message.toolCalls) {
                    for (const toolCall of message.toolCalls) {
                        const newParts = partsMap.get(toolCall.id);
                        if (newParts !== undefined) {
                            toolCall.result = newParts;
                            msgChanged = true;
                        }
                    }
                }
                if (msgChanged) {
                    // Push updated message to log
                    this.pushMessage(message);
                }
            }
        }
        catch (error) {
            debugLogger.error('Error updating conversation history from memory.', error);
            throw error;
        }
    }
}
async function parseLegacyRecordFallback(filePath, options) {
    try {
        const fileContent = await fs.promises.readFile(filePath, 'utf8');
        const parsed = JSON.parse(fileContent);
        const isLegacyRecord = (val) => typeof val === 'object' && val !== null && 'sessionId' in val;
        if (isLegacyRecord(parsed)) {
            const legacyRecord = parsed;
            if (options?.metadataOnly) {
                let fallbackFirstUserMessageStr;
                const firstUserMessage = legacyRecord.messages?.find((m) => m.type === 'user');
                if (firstUserMessage) {
                    const rawContent = firstUserMessage.content;
                    if (Array.isArray(rawContent)) {
                        fallbackFirstUserMessageStr = rawContent
                            .map((p) => (isTextPart(p) ? p['text'] : ''))
                            .join('');
                    }
                    else if (typeof rawContent === 'string') {
                        fallbackFirstUserMessageStr = rawContent;
                    }
                }
                return {
                    ...legacyRecord,
                    messages: [],
                    messageCount: legacyRecord.messages?.length || 0,
                    firstUserMessage: fallbackFirstUserMessageStr,
                    hasUserOrAssistantMessage: legacyRecord.messages?.some((m) => m.type === 'user' || m.type === 'gemini') || false,
                };
            }
            return {
                ...legacyRecord,
                hasUserOrAssistantMessage: legacyRecord.messages?.some((m) => m.type === 'user' || m.type === 'gemini') || false,
            };
        }
    }
    catch {
        // ignore legacy fallback parse error
    }
    return null;
}
//# sourceMappingURL=chatRecordingService.js.map