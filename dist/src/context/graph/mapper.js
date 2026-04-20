import { toGraph } from './toGraph.js';
import { fromGraph } from './fromGraph.js';
export class ContextGraphMapper {
    registry;
    nodeIdentityMap = new WeakMap();
    constructor(registry) {
        this.registry = registry;
    }
    toGraph(history, tokenCalculator) {
        return toGraph(history, tokenCalculator, this.nodeIdentityMap);
    }
    fromGraph(nodes) {
        return fromGraph(nodes, this.registry);
    }
}
//# sourceMappingURL=mapper.js.map