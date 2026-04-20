/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scheduleAgentTools } from './agent-scheduler.js';
import { Scheduler } from '../scheduler/scheduler.js';
vi.mock('../scheduler/scheduler.js', () => ({
    Scheduler: vi.fn().mockImplementation(() => ({
        schedule: vi.fn().mockResolvedValue([{ status: 'success' }]),
        dispose: vi.fn(),
    })),
}));
describe('agent-scheduler', () => {
    let mockToolRegistry;
    let mockConfig;
    let mockMessageBus;
    beforeEach(() => {
        vi.mocked(Scheduler).mockClear();
        mockMessageBus = {};
        mockToolRegistry = {
            getTool: vi.fn(),
            messageBus: mockMessageBus,
        };
        mockConfig = {
            messageBus: mockMessageBus,
            toolRegistry: mockToolRegistry,
        };
        mockConfig.messageBus =
            mockMessageBus;
        mockConfig.toolRegistry =
            mockToolRegistry;
    });
    it('should create a scheduler with agent-specific config', async () => {
        const mockConfig = {
            getPromptRegistry: vi.fn(),
            getResourceRegistry: vi.fn(),
            messageBus: mockMessageBus,
            toolRegistry: mockToolRegistry,
        };
        const requests = [
            {
                callId: 'call-1',
                name: 'test-tool',
                args: {},
                isClientInitiated: false,
                prompt_id: 'prompt-1',
            },
        ];
        const options = {
            schedulerId: 'subagent-1',
            parentCallId: 'parent-1',
            toolRegistry: mockToolRegistry,
            signal: new AbortController().signal,
        };
        const results = await scheduleAgentTools(mockConfig, requests, options);
        expect(results).toEqual([{ status: 'success' }]);
        expect(Scheduler).toHaveBeenCalledWith(expect.objectContaining({
            schedulerId: 'subagent-1',
            parentCallId: 'parent-1',
            messageBus: mockMessageBus,
        }));
        // Verify that the scheduler's context has the overridden tool registry
        const schedulerConfig = vi.mocked(Scheduler).mock.calls[0][0].context;
        expect(schedulerConfig.toolRegistry).toBe(mockToolRegistry);
    });
    it('should override toolRegistry getter from prototype chain', async () => {
        const mainRegistry = { _id: 'main' };
        const agentRegistry = {
            _id: 'agent',
            messageBus: mockMessageBus,
        };
        const config = {
            getPromptRegistry: vi.fn(),
            getResourceRegistry: vi.fn(),
            messageBus: mockMessageBus,
        };
        Object.defineProperty(config, 'toolRegistry', {
            get: () => mainRegistry,
            configurable: true,
        });
        await scheduleAgentTools(config, [
            {
                callId: 'c1',
                name: 'new_page',
                args: {},
                isClientInitiated: false,
                prompt_id: 'p1',
            },
        ], {
            schedulerId: 'browser-1',
            toolRegistry: agentRegistry,
            signal: new AbortController().signal,
        });
        const schedulerConfig = vi.mocked(Scheduler).mock.calls[0][0].context;
        expect(schedulerConfig.toolRegistry).toBe(agentRegistry);
        expect(schedulerConfig.toolRegistry).not.toBe(mainRegistry);
    });
    it('should dispose the scheduler after schedule completes', async () => {
        const mockConfig = {
            getPromptRegistry: vi.fn(),
            getResourceRegistry: vi.fn(),
            messageBus: mockMessageBus,
            toolRegistry: mockToolRegistry,
        };
        const options = {
            schedulerId: 'subagent-1',
            toolRegistry: mockToolRegistry,
            signal: new AbortController().signal,
        };
        await scheduleAgentTools(mockConfig, [], options);
        const schedulerInstance = vi.mocked(Scheduler).mock.results[0].value;
        expect(schedulerInstance.dispose).toHaveBeenCalledOnce();
    });
    it('should dispose the scheduler even when schedule throws', async () => {
        const scheduleError = new Error('schedule failed');
        vi.mocked(Scheduler).mockImplementationOnce(() => ({
            schedule: vi.fn().mockRejectedValue(scheduleError),
            dispose: vi.fn(),
        }));
        const mockConfig = {
            getPromptRegistry: vi.fn(),
            getResourceRegistry: vi.fn(),
            messageBus: mockMessageBus,
            toolRegistry: mockToolRegistry,
        };
        const options = {
            schedulerId: 'subagent-1',
            toolRegistry: mockToolRegistry,
            signal: new AbortController().signal,
        };
        await expect(scheduleAgentTools(mockConfig, [], options)).rejects.toThrow('schedule failed');
        const schedulerInstance = vi.mocked(Scheduler).mock.results[0].value;
        expect(schedulerInstance.dispose).toHaveBeenCalledOnce();
    });
    it('should create an AgentLoopContext that has a defined .config property', async () => {
        const mockConfig = {
            getPromptRegistry: vi.fn(),
            getResourceRegistry: vi.fn(),
            messageBus: mockMessageBus,
            toolRegistry: mockToolRegistry,
            promptId: 'test-prompt',
        };
        const options = {
            schedulerId: 'subagent-1',
            toolRegistry: mockToolRegistry,
            signal: new AbortController().signal,
        };
        await scheduleAgentTools(mockConfig, [], options);
        const schedulerContext = vi.mocked(Scheduler).mock.calls[0][0].context;
        expect(schedulerContext.config).toBeDefined();
        expect(schedulerContext.config.promptId).toBe('test-prompt');
        expect(schedulerContext.toolRegistry).toBe(mockToolRegistry);
    });
});
//# sourceMappingURL=agent-scheduler.test.js.map