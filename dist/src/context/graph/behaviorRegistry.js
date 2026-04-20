export class NodeBehaviorRegistry {
    behaviors = new Map();
    register(behavior) {
        this.behaviors.set(behavior.type, behavior);
    }
    get(type) {
        const behavior = this.behaviors.get(type);
        if (!behavior) {
            throw new Error(`Unregistered Node type: ${type}`);
        }
        return behavior;
    }
}
//# sourceMappingURL=behaviorRegistry.js.map