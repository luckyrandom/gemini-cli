/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export const HistoryTruncationProcessorOptionsSchema = {
    type: 'object',
    properties: {
        target: {
            type: 'string',
            enum: ['incremental', 'freeNTokens', 'max'],
            nullable: true,
        },
        freeTokensTarget: { type: 'number', nullable: true },
    },
    required: [],
};
export function createHistoryTruncationProcessor(id, env, options) {
    return {
        id,
        name: 'HistoryTruncationProcessor',
        process: async ({ targets }) => {
            const strategy = options.target ?? 'max';
            const keptNodes = [];
            if (strategy === 'incremental') {
                // 'incremental' simply drops the single oldest node in the targets, ignoring tokens.
                let removedNodes = 0;
                for (const node of targets) {
                    if (removedNodes < 1) {
                        removedNodes++;
                        continue;
                    }
                    keptNodes.push(node);
                }
                return keptNodes;
            }
            let targetTokensToRemove = 0;
            if (strategy === 'freeNTokens') {
                targetTokensToRemove = options.freeTokensTarget ?? 0;
                if (targetTokensToRemove <= 0)
                    return targets;
            }
            else if (strategy === 'max') {
                // 'max' means we remove all targets without stopping early
                targetTokensToRemove = Infinity;
            }
            let removedTokens = 0;
            // The targets are sequentially ordered from oldest to newest.
            // We want to delete the oldest targets first.
            for (const node of targets) {
                if (removedTokens >= targetTokensToRemove) {
                    keptNodes.push(node);
                    continue;
                }
                removedTokens += env.tokenCalculator.getTokenCost(node);
            }
            return keptNodes;
        },
    };
}
//# sourceMappingURL=historyTruncationProcessor.js.map