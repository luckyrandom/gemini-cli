class NodeSerializer {
    history = [];
    currentModelParts = [];
    appendContent(content) {
        this.flushModelParts();
        this.history.push(content);
    }
    appendModelPart(part) {
        this.currentModelParts.push(part);
    }
    appendUserPart(part) {
        this.flushModelParts();
        this.history.push({ role: 'user', parts: [part] });
    }
    flushModelParts() {
        if (this.currentModelParts.length > 0) {
            this.history.push({ role: 'model', parts: [...this.currentModelParts] });
            this.currentModelParts = [];
        }
    }
    getContents() {
        this.flushModelParts();
        return this.history;
    }
}
export function fromGraph(nodes, registry) {
    const writer = new NodeSerializer();
    for (const node of nodes) {
        const behavior = registry.get(node.type);
        behavior.serialize(node, writer);
    }
    return writer.getContents();
}
//# sourceMappingURL=fromGraph.js.map