import type { InboxMessage, InboxSnapshot } from '../pipeline.js';
export declare class LiveInbox {
    private messages;
    publish<T>(topic: string, payload: T): void;
    getMessages(): readonly InboxMessage[];
    drainConsumed(consumedIds: Set<string>): void;
}
export declare class InboxSnapshotImpl implements InboxSnapshot {
    private messages;
    private consumedIds;
    constructor(messages: readonly InboxMessage[]);
    getMessages<T = unknown>(topic: string): ReadonlyArray<InboxMessage<T>>;
    consume(messageId: string): void;
    getConsumedIds(): Set<string>;
}
