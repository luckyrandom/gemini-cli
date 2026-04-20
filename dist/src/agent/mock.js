/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * A mock implementation of AgentProtocol for testing.
 * Allows queuing responses that will be yielded when send() is called.
 */
export class MockAgentProtocol {
    _events = [];
    _responses = [];
    _subscribers = new Set();
    _activeStreamIds = new Set();
    _lastStreamId;
    _nextEventId = 1;
    _nextStreamId = 1;
    title;
    model;
    config;
    constructor(initialEvents = []) {
        this._events = [...initialEvents];
    }
    /**
     * All events that have occurred in this session so far.
     */
    get events() {
        return this._events;
    }
    subscribe(callback) {
        this._subscribers.add(callback);
        return () => this._subscribers.delete(callback);
    }
    _emit(event) {
        if (!this._events.some((e) => e.id === event.id)) {
            this._events.push(event);
        }
        for (const callback of this._subscribers) {
            callback(event);
        }
        if (event.type === 'agent_end' && event.streamId) {
            this._activeStreamIds.delete(event.streamId);
        }
    }
    /**
     * Queues a sequence of events to be "emitted" by the agent in response to the
     * next send() call.
     */
    pushResponse(events, options) {
        this._responses.push({ events, options });
    }
    /**
     * Appends events to an existing stream and notifies any waiting listeners.
     */
    pushToStream(streamId, events, options) {
        const now = new Date().toISOString();
        for (const eventData of events) {
            const event = this._normalizeEvent(eventData, now, streamId);
            this._emit(event);
        }
        if (options?.close &&
            !events.some((eventData) => eventData.type === 'agent_end')) {
            this._emit(this._normalizeEvent({ type: 'agent_end', reason: 'completed' }, now, streamId));
        }
    }
    async send(payload) {
        const responseData = this._responses.shift();
        const { events: response, options } = responseData ?? {
            events: [],
        };
        // If there were queued responses (even if empty array), we trigger a stream.
        const hasResponseEvents = responseData !== undefined;
        const streamId = hasResponseEvents
            ? (response[0]?.streamId ?? `mock-stream-${this._nextStreamId++}`)
            : null;
        const now = new Date().toISOString();
        const eventsToEmit = [];
        let fallbackStreamId;
        // All emitted events stay correlated to a stream even if this send does not
        // start agent activity and therefore returns `streamId: null`.
        const normalize = (eventData) => this._normalizeEvent(eventData, now, eventData.streamId ??
            streamId ??
            (fallbackStreamId ??= `mock-stream-${this._nextStreamId++}`));
        // 1. User/Update event (BEFORE agent_start)
        if ('message' in payload && payload.message) {
            const message = Array.isArray(payload.message)
                ? { content: payload.message, displayContent: undefined }
                : payload.message;
            const userContent = message.displayContent
                ? [{ type: 'text', text: message.displayContent }]
                : message.content;
            eventsToEmit.push(normalize({
                type: 'message',
                role: 'user',
                content: userContent,
                _meta: payload._meta,
            }));
        }
        else if ('elicitations' in payload && payload.elicitations) {
            payload.elicitations.forEach((elicitation) => {
                eventsToEmit.push(normalize({
                    type: 'elicitation_response',
                    ...elicitation,
                    _meta: payload._meta,
                }));
            });
        }
        else if ('update' in payload &&
            payload.update &&
            Object.keys(payload.update).length > 0) {
            if (payload.update.title)
                this.title = payload.update.title;
            if (payload.update.model)
                this.model = payload.update.model;
            if (payload.update.config) {
                this.config = payload.update.config;
            }
            eventsToEmit.push(normalize({
                type: 'session_update',
                ...payload.update,
                _meta: payload._meta,
            }));
        }
        else if ('action' in payload && payload.action) {
            throw new Error(`Actions not supported in MockAgentProtocol: ${payload.action.type}`);
        }
        // 2. agent_start (if stream)
        if (streamId) {
            if (!response.some((eventData) => eventData.type === 'agent_start')) {
                eventsToEmit.push(normalize({
                    type: 'agent_start',
                    streamId,
                }));
            }
        }
        // 3. Response events
        for (const eventData of response) {
            eventsToEmit.push(normalize(eventData));
        }
        // 4. agent_end (if stream and not manual)
        if (streamId && !options?.keepOpen) {
            if (!eventsToEmit.some((e) => e.type === 'agent_end')) {
                eventsToEmit.push(normalize({
                    type: 'agent_end',
                    reason: 'completed',
                    streamId,
                }));
            }
        }
        if (streamId) {
            this._activeStreamIds.add(streamId);
        }
        this._lastStreamId = streamId;
        // Emit events asynchronously so the caller receives the streamId first.
        if (eventsToEmit.length > 0) {
            void Promise.resolve().then(() => {
                for (const event of eventsToEmit) {
                    this._emit(event);
                }
            });
        }
        return { streamId };
    }
    _normalizeEvent(eventData, timestamp, streamId) {
        // TypeScript loses the specific union member when we add common event
        // fields here, so keep the narrowing local to this mock-only helper.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        return {
            ...eventData,
            id: eventData.id ?? `e-${this._nextEventId++}`,
            timestamp: eventData.timestamp ?? timestamp,
            streamId: eventData.streamId ?? streamId,
        };
    }
    async abort() {
        if (this._lastStreamId && this._activeStreamIds.has(this._lastStreamId)) {
            const streamId = this._lastStreamId;
            this._emit(this._normalizeEvent({ type: 'agent_end', reason: 'aborted' }, new Date().toISOString(), streamId));
        }
    }
}
//# sourceMappingURL=mock.js.map