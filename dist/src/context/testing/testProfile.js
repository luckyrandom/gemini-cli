import { createHistoryTruncationProcessor } from '../processors/historyTruncationProcessor.js';
export const testTruncateProfile = {
    config: {
        budget: {
            retainedTokens: 65000,
            maxTokens: 150000,
        },
    },
    buildPipelines: (env) => [
        {
            name: 'Emergency Backstop (Truncate Only)',
            triggers: ['gc_backstop', 'retained_exceeded'],
            processors: [
                createHistoryTruncationProcessor('HistoryTruncation', env, {}),
            ],
        },
    ],
    buildAsyncPipelines: () => [],
};
//# sourceMappingURL=testProfile.js.map