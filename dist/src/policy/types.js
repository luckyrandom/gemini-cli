/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export var PolicyDecision;
(function (PolicyDecision) {
    PolicyDecision["ALLOW"] = "allow";
    PolicyDecision["DENY"] = "deny";
    PolicyDecision["ASK_USER"] = "ask_user";
})(PolicyDecision || (PolicyDecision = {}));
/**
 * Array of valid hook source values for runtime validation
 */
const VALID_HOOK_SOURCES = [
    'project',
    'user',
    'system',
    'extension',
];
/**
 * Safely extract and validate hook source from input
 * Returns 'project' as default if the value is invalid or missing
 */
export function getHookSource(input) {
    const source = input['hook_source'];
    if (typeof source === 'string' &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        VALID_HOOK_SOURCES.includes(source)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        return source;
    }
    return 'project';
}
export var ApprovalMode;
(function (ApprovalMode) {
    ApprovalMode["DEFAULT"] = "default";
    ApprovalMode["AUTO_EDIT"] = "autoEdit";
    ApprovalMode["YOLO"] = "yolo";
    ApprovalMode["PLAN"] = "plan";
})(ApprovalMode || (ApprovalMode = {}));
/**
 * The order of permissiveness for approval modes.
 * Tools allowed in a less permissive mode should also be allowed
 * in more permissive modes.
 */
export const MODES_BY_PERMISSIVENESS = [
    ApprovalMode.PLAN,
    ApprovalMode.DEFAULT,
    ApprovalMode.AUTO_EDIT,
    ApprovalMode.YOLO,
];
export var InProcessCheckerType;
(function (InProcessCheckerType) {
    InProcessCheckerType["ALLOWED_PATH"] = "allowed-path";
    InProcessCheckerType["CONSECA"] = "conseca";
})(InProcessCheckerType || (InProcessCheckerType = {}));
/**
 * Priority for subagent tools (registered dynamically).
 * Effective priority matching Tier 1 (Default) at priority 30.
 * This ensures they are blocked by Plan Mode (priority 40) while
 * remaining above directive write tools (priority 10).
 */
export const PRIORITY_SUBAGENT_TOOL = 1.03;
/**
 * The fractional priority of "Always allow" rules (e.g., 950/1000).
 * Higher fraction within a tier wins.
 */
export const ALWAYS_ALLOW_PRIORITY_FRACTION = 950;
/**
 * The fractional priority offset for "Always allow" rules (e.g., 0.95).
 * This ensures consistency between in-memory rules and persisted rules.
 */
export const ALWAYS_ALLOW_PRIORITY_OFFSET = ALWAYS_ALLOW_PRIORITY_FRACTION / 1000;
/**
 * Priority for the YOLO "allow all" rule.
 * Matches the raw priority used in yolo.toml.
 */
export const PRIORITY_YOLO_ALLOW_ALL = 998;
//# sourceMappingURL=types.js.map