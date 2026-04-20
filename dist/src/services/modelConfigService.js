/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { getDisplayString, PREVIEW_GEMINI_3_1_MODEL, PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL, isProModel, } from '../config/models.js';
const MAX_ALIAS_CHAIN_DEPTH = 100;
export class ModelConfigService {
    config;
    runtimeAliases = {};
    runtimeOverrides = [];
    // TODO(12597): Process config to build a typed alias hierarchy.
    constructor(config) {
        this.config = config;
    }
    /**
     * Returns a standardized list of available model options based on the resolution context.
     * This logic is shared across the TUI and ACP mode.
     */
    getAvailableModelOptions(context) {
        const definitions = this.config.modelDefinitions ?? {};
        const shouldShowPreviewModels = context.hasAccessToPreview ?? false;
        const useGemini31 = context.useGemini3_1 ?? false;
        const useGemini31FlashLite = context.useGemini3_1FlashLite ?? false;
        const mainOptions = Object.entries(definitions)
            .filter(([_, m]) => {
            if (m.isVisible !== true)
                return false;
            if (m.isPreview && !shouldShowPreviewModels)
                return false;
            if (m.tier !== 'auto')
                return false;
            return true;
        })
            .map(([id, m]) => ({
            modelId: id,
            name: m.displayName ?? getDisplayString(id),
            description: id === 'auto-gemini-3' && useGemini31
                ? (m.dialogDescription ?? '').replace('gemini-3-pro', 'gemini-3.1-pro')
                : (m.dialogDescription ?? ''),
            tier: m.tier ?? 'auto',
        }));
        const manualOptions = Object.entries(definitions)
            .filter(([id, m]) => {
            if (m.isVisible !== true)
                return false;
            if (m.isPreview && !shouldShowPreviewModels)
                return false;
            if (m.tier === 'auto')
                return false;
            if (context.hasAccessToProModel === false && isProModel(id))
                return false;
            if (id === PREVIEW_GEMINI_3_1_MODEL && !useGemini31)
                return false;
            if (id === PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL && !useGemini31FlashLite)
                return false;
            return true;
        })
            .map(([id, m]) => {
            const resolvedId = this.resolveModelId(id, context);
            const titleId = this.resolveModelId(id, {
                useGemini3_1: useGemini31,
                useGemini3_1FlashLite: useGemini31FlashLite,
            });
            return {
                modelId: resolvedId,
                name: m.displayName ?? getDisplayString(titleId),
                description: m.dialogDescription ?? '',
                tier: m.tier ?? 'custom',
            };
        });
        // Deduplicate manual options
        const seen = new Set();
        const uniqueManualOptions = manualOptions.filter((option) => {
            if (seen.has(option.modelId))
                return false;
            seen.add(option.modelId);
            return true;
        });
        return [...mainOptions, ...uniqueManualOptions];
    }
    getModelDefinition(modelId) {
        const definition = this.config.modelDefinitions?.[modelId];
        if (definition) {
            return definition;
        }
        // For unknown models, return an implicit custom definition to match legacy behavior.
        if (!modelId.startsWith('gemini-')) {
            return {
                tier: 'custom',
                family: 'custom',
                features: {},
            };
        }
        return undefined;
    }
    getModelDefinitions() {
        return this.config.modelDefinitions ?? {};
    }
    matches(condition, context) {
        return Object.entries(condition).every(([key, value]) => {
            if (value === undefined)
                return true;
            switch (key) {
                case 'useGemini3_1':
                    return value === context.useGemini3_1;
                case 'useGemini3_1FlashLite':
                    return value === context.useGemini3_1FlashLite;
                case 'useCustomTools':
                    return value === context.useCustomTools;
                case 'hasAccessToPreview':
                    return value === context.hasAccessToPreview;
                case 'requestedModels':
                    return (Array.isArray(value) &&
                        !!context.requestedModel &&
                        value.includes(context.requestedModel));
                default:
                    return false;
            }
        });
    }
    // Resolves a model ID to a concrete model ID based on the provided context.
    resolveModelId(requestedName, context = {}) {
        const resolution = this.config.modelIdResolutions?.[requestedName];
        if (!resolution) {
            return requestedName;
        }
        for (const ctx of resolution.contexts ?? []) {
            if (this.matches(ctx.condition, context)) {
                return ctx.target;
            }
        }
        return resolution.default;
    }
    // Resolves a classifier model ID to a concrete model ID based on the provided context.
    resolveClassifierModelId(tier, requestedModel, context = {}) {
        const resolution = this.config.classifierIdResolutions?.[tier];
        const fullContext = { ...context, requestedModel };
        if (!resolution) {
            // Fallback to regular model resolution if no classifier-specific rule exists
            return this.resolveModelId(tier, fullContext);
        }
        for (const ctx of resolution.contexts ?? []) {
            if (this.matches(ctx.condition, fullContext)) {
                return ctx.target;
            }
        }
        return resolution.default;
    }
    getModelChain(chainName) {
        return this.config.modelChains?.[chainName];
    }
    /**
     * Fetches a chain template and resolves all model IDs within it
     * based on the provided context.
     */
    resolveChain(chainName, context = {}) {
        const template = this.config.modelChains?.[chainName];
        if (!template) {
            return undefined;
        }
        // Map through the template and resolve each model ID
        return template.map((policy) => ({
            ...policy,
            model: this.resolveModelId(policy.model, context),
        }));
    }
    registerRuntimeModelConfig(aliasName, alias) {
        this.runtimeAliases[aliasName] = alias;
    }
    registerRuntimeModelOverride(override) {
        this.runtimeOverrides.push(override);
    }
    /**
     * Resolves a model configuration by merging settings from aliases and applying overrides.
     *
     * The resolution follows a linear application pipeline:
     *
     * 1. Alias Chain Resolution:
     *    Builds the inheritance chain from root to leaf. Configurations are merged starting from
     *    the root, so that children naturally override parents.
     *
     * 2. Override Level Assignment:
     *    Overrides are matched against the hierarchy and assigned a "Level" for application:
     *    - Level 0: Broad matches (Global or Resolved Model name).
     *    - Level 1..N: Hierarchy matches (from Root-most alias to Leaf-most alias).
     *
     * 3. Precedence & Application:
     *    Overrides are applied in order of their Level (ASC), then Specificity (ASC), then
     *    Configuration Order (ASC). This ensures that more targeted and "deeper" rules
     *    naturally layer on top of broader ones.
     *
     * 4. Orthogonality:
     *    All fields (including 'model') are treated equally. A more specific or deeper override
     *    can freely change any setting, including the target model name.
     */
    internalGetResolvedConfig(context) {
        const { aliases = {}, customAliases = {}, overrides = [], customOverrides = [], } = this.config || {};
        const allAliases = {
            ...aliases,
            ...customAliases,
            ...this.runtimeAliases,
        };
        const { aliasChain, baseModel, resolvedConfig } = this.resolveAliasChain(context.model, allAliases, context.isChatModel);
        const modelToLevel = this.buildModelLevelMap(aliasChain, baseModel);
        const allOverrides = [
            ...overrides,
            ...customOverrides,
            ...this.runtimeOverrides,
        ];
        const matches = this.findMatchingOverrides(allOverrides, context, modelToLevel);
        this.sortOverrides(matches);
        let currentConfig = {
            model: baseModel,
            generateContentConfig: resolvedConfig,
        };
        for (const match of matches) {
            currentConfig = ModelConfigService.merge(currentConfig, match.modelConfig);
        }
        return {
            model: currentConfig.model,
            generateContentConfig: currentConfig.generateContentConfig ?? {},
        };
    }
    resolveAliasChain(requestedModel, allAliases, isChatModel) {
        const aliasChain = [];
        if (allAliases[requestedModel]) {
            let current = requestedModel;
            const visited = new Set();
            while (current) {
                const alias = allAliases[current];
                if (!alias) {
                    throw new Error(`Alias "${current}" not found.`);
                }
                if (visited.size >= MAX_ALIAS_CHAIN_DEPTH) {
                    throw new Error(`Alias inheritance chain exceeded maximum depth of ${MAX_ALIAS_CHAIN_DEPTH}.`);
                }
                if (visited.has(current)) {
                    throw new Error(`Circular alias dependency: ${[...visited, current].join(' -> ')}`);
                }
                visited.add(current);
                aliasChain.push(current);
                current = alias.extends;
            }
            // Root-to-Leaf chain for merging and level assignment.
            const reversedChain = [...aliasChain].reverse();
            let resolvedConfig = {};
            for (const aliasName of reversedChain) {
                const alias = allAliases[aliasName];
                resolvedConfig = ModelConfigService.merge(resolvedConfig, alias.modelConfig);
            }
            return {
                aliasChain: reversedChain,
                baseModel: resolvedConfig.model,
                resolvedConfig: resolvedConfig.generateContentConfig ?? {},
            };
        }
        if (isChatModel) {
            const fallbackAlias = 'chat-base';
            if (allAliases[fallbackAlias]) {
                const fallbackResolution = this.resolveAliasChain(fallbackAlias, allAliases);
                return {
                    aliasChain: [...fallbackResolution.aliasChain, requestedModel],
                    baseModel: requestedModel,
                    resolvedConfig: fallbackResolution.resolvedConfig,
                };
            }
        }
        return {
            aliasChain: [requestedModel],
            baseModel: requestedModel,
            resolvedConfig: {},
        };
    }
    buildModelLevelMap(aliasChain, baseModel) {
        const modelToLevel = new Map();
        // Global and Model name are both level 0.
        if (baseModel) {
            modelToLevel.set(baseModel, 0);
        }
        // Alias chain starts at level 1.
        aliasChain.forEach((name, i) => modelToLevel.set(name, i + 1));
        return modelToLevel;
    }
    findMatchingOverrides(overrides, context, modelToLevel) {
        return overrides
            .map((override, index) => {
            const matchEntries = Object.entries(override.match);
            if (matchEntries.length === 0)
                return null;
            let matchedLevel = 0; // Default to Global
            const isMatch = matchEntries.every(([key, value]) => {
                if (key === 'model') {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
                    const level = modelToLevel.get(value);
                    if (level === undefined)
                        return false;
                    matchedLevel = level;
                    return true;
                }
                if (key === 'overrideScope' && value === 'core') {
                    return context.overrideScope === 'core' || !context.overrideScope;
                }
                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
                return context[key] === value;
            });
            return isMatch
                ? {
                    specificity: matchEntries.length,
                    level: matchedLevel,
                    modelConfig: override.modelConfig,
                    index,
                }
                : null;
        })
            .filter((m) => m !== null);
    }
    sortOverrides(matches) {
        matches.sort((a, b) => {
            if (a.level !== b.level) {
                return a.level - b.level;
            }
            if (a.specificity !== b.specificity) {
                return a.specificity - b.specificity;
            }
            return a.index - b.index;
        });
    }
    getResolvedConfig(context) {
        const resolved = this.internalGetResolvedConfig(context);
        if (!resolved.model) {
            throw new Error(`Could not resolve a model name for alias "${context.model}". Please ensure the alias chain or a matching override specifies a model.`);
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        return {
            model: resolved.model,
            generateContentConfig: resolved.generateContentConfig,
        };
    }
    static isObject(item) {
        return !!item && typeof item === 'object' && !Array.isArray(item);
    }
    /**
     * Merges an override `ModelConfig` into a base `ModelConfig`.
     * The override's model name takes precedence if provided.
     * The `generateContentConfig` properties are deeply merged.
     */
    static merge(base, override) {
        return {
            model: override.model ?? base.model,
            generateContentConfig: ModelConfigService.deepMerge(base.generateContentConfig, override.generateContentConfig),
        };
    }
    static deepMerge(config1, config2) {
        return ModelConfigService.genericDeepMerge(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        config1, 
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        config2);
    }
    static genericDeepMerge(...objects) {
        return objects.reduce((acc, obj) => {
            if (!obj) {
                return acc;
            }
            Object.keys(obj).forEach((key) => {
                const accValue = acc[key];
                const objValue = obj[key];
                // For now, we only deep merge objects, and not arrays. This is because
                // If we deep merge arrays, there is no way for the user to completely
                // override the base array.
                // TODO(joshualitt): Consider knobs here, i.e. opt-in to deep merging
                // arrays on a case-by-case basis.
                if (ModelConfigService.isObject(accValue) &&
                    ModelConfigService.isObject(objValue)) {
                    acc[key] = ModelConfigService.genericDeepMerge(accValue, objValue);
                }
                else {
                    acc[key] = objValue;
                }
            });
            return acc;
        }, {});
    }
}
//# sourceMappingURL=modelConfigService.js.map