/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { TOPIC_PARAM_TITLE, TOPIC_PARAM_SUMMARY, TOPIC_PARAM_STRATEGIC_INTENT } from './definitions/coreTools.js';
import { BaseDeclarativeTool, BaseToolInvocation, type ToolResult, type ExecuteOptions } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import type { Config } from '../config/config.js';
interface UpdateTopicParams {
    [TOPIC_PARAM_TITLE]?: string;
    [TOPIC_PARAM_SUMMARY]?: string;
    [TOPIC_PARAM_STRATEGIC_INTENT]?: string;
}
declare class UpdateTopicInvocation extends BaseToolInvocation<UpdateTopicParams, ToolResult> {
    private readonly config;
    constructor(params: UpdateTopicParams, messageBus: MessageBus, toolName: string, config: Config);
    getDescription(): string;
    execute(_options: ExecuteOptions): Promise<ToolResult>;
}
/**
 * Tool to update semantic topic context and tactical intent for UI grouping and model focus.
 */
export declare class UpdateTopicTool extends BaseDeclarativeTool<UpdateTopicParams, ToolResult> {
    private readonly config;
    constructor(config: Config, messageBus: MessageBus);
    protected createInvocation(params: UpdateTopicParams, messageBus: MessageBus): UpdateTopicInvocation;
}
export {};
