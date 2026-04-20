/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Manages the current active topic title and tactical intent for a session.
 * Hosted within the Config instance for session-scoping.
 */
export declare class TopicState {
    private activeTopicTitle?;
    private activeIntent?;
    /**
     * Sanitizes and sets the topic title and/or intent.
     * @returns true if the input was valid and set, false otherwise.
     */
    setTopic(title?: string, intent?: string): boolean;
    getTopic(): string | undefined;
    getIntent(): string | undefined;
    reset(): void;
}
