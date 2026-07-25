import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";
import { PreviewManager } from "./js/preview_manager.js";

function getKSamplerNodes() {
    if (!app || !app.graph) return [];
    
    const samplers = [];
    const visitedNodes = new Set();

    const traverseGraph = (graph) => {
        if (!graph || !graph._nodes) return;
        for (const node of graph._nodes) {
            if (!node || visitedNodes.has(node.id)) continue;
            visitedNodes.add(node.id);

            const type = (node.type || node.comfyClass || "").toLowerCase();
            const title = (node.title || node.type || "").toLowerCase();

            if (type.includes("sampler") || type.includes("ksampler") || title.includes("sampler")) {
                samplers.push({
                    id: node.id,
                    title: node.title || node.type || `Node ${node.id}`
                });
            }

            if (node.subgraph) {
                traverseGraph(node.subgraph);
            }
        }
    };

    traverseGraph(app.graph);

    // Also check DOM nodes for ComfyUI V2 subgraphs
    document.querySelectorAll('[data-node-id], [data-widgets-grid-node-id], .lg-node').forEach(el => {
        const id = el.dataset.nodeId || el.dataset.widgetsGridNodeId || el.getAttribute('data-node-id');
        const text = (el.innerText || el.textContent || "").split('\n')[0];
        if (id && text.toLowerCase().includes("sampler") && !samplers.some(s => String(s.id) === String(id))) {
            const titleMatch = text.match(/KSampler[^\n]*/i) || text.match(/Sampler[^\n]*/i);
            let title = titleMatch ? titleMatch[0].trim() : `Sampler (${id})`;
            if (title.length > 45) title = title.substring(0, 42) + "...";
            samplers.push({ id, title });
        }
    });

    return samplers;
}

function updateAllPreviewNodeDropdowns() {
    if (!app || !app.graph) return;
    
    const previewNodes = app.graph._nodes ? app.graph._nodes.filter(n => n && n.type === "PreviewLatentLive") : [];
    const currentNodes = getKSamplerNodes();
    const currentValues = ["Auto", ...currentNodes.map(n => `${n.title} (${n.id})`)];
    
    for (const node of previewNodes) {
        const widget = node.widgets?.find(w => w.name === "Source");
        if (widget) {
            widget.options.values = currentValues;
            if (!currentValues.includes(widget.value)) {
                widget.value = "Auto";
            }
        }
    }
}

app.registerExtension({
    name: "ComfyUI.FlowControl.PreviewLatentLive",
    async setup() {
        PreviewManager.init(app, api);
        
        api.addEventListener("status", () => {
            updateAllPreviewNodeDropdowns();
        });
    },
    async loadedGraph() {
        updateAllPreviewNodeDropdowns();
    },
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "PreviewLatentLive") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (onNodeCreated) {
                    onNodeCreated.apply(this, arguments);
                }
                
                let widget = this.widgets?.find(w => w.name === "Source");
                if (!widget) {
                    widget = this.addWidget("combo", "Source", "Auto", (value) => {}, { values: ["Auto"] });
                }
                
                const self = this;
                widget.callback = function() {
                    updateAllPreviewNodeDropdowns();
                };
                
                this.size = [300, 300];
                this.imgs = [];
                this.imageIndex = 0;
                
                PreviewManager.registerNode(this);
                setTimeout(updateAllPreviewNodeDropdowns, 100);
            };

            const onRemoved = nodeType.prototype.onRemoved;
            nodeType.prototype.onRemoved = function() {
                if (onRemoved) {
                    onRemoved.apply(this, arguments);
                }
                PreviewManager.unregisterNode(this);
            };

            nodeType.prototype.onDrawBackground = function(ctx) {
                if (this.flags.collapsed) return;

                if (!this.imgs || this.imgs.length === 0) {
                    ctx.save();
                    ctx.fillStyle = "#888888";
                    ctx.font = "14px Inter, sans-serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("Waiting for live preview...", this.size[0] / 2, (this.size[1] + 40) / 2);
                    ctx.restore();
                } else if (this.imgs && this.imgs.length > 0) {
                    const img = this.imgs[this.imageIndex || 0];
                    if (img && img.width && img.height) {
                        ctx.save();
                        
                        let w = img.width;
                        let h = img.height;
                        
                        // Reserve top area for node title (approx 30px) and widget (approx 40px)
                        const topOffset = 70;
                        const canvasW = this.size[0] - 10;
                        const canvasH = this.size[1] - topOffset - 10;
                        
                        if (canvasW > 0 && canvasH > 0) {
                            const ratio = Math.min(canvasW / w, canvasH / h);
                            w *= ratio;
                            h *= ratio;
                            
                            const x = (this.size[0] - w) / 2;
                            const y = topOffset + (canvasH - h) / 2;
                            
                            ctx.drawImage(img, x, y, w, h);
                        }
                        ctx.restore();
                    }
                }
            };

            nodeType.prototype.onNewPreview = function(img, samplerId) {
                updateAllPreviewNodeDropdowns();
                const sourceWidget = this.widgets?.find(w => w.name === "Source");
                const selectedSource = sourceWidget ? sourceWidget.value : "Auto";
                
                if (selectedSource !== "Auto") {
                    const match = selectedSource.match(/\((\d+)\)$/);
                    if (match) {
                        const targetId = match[1];
                        if (samplerId && String(samplerId) !== targetId) {
                            return;
                        }
                    }
                }
                
                this.imgs = [img];
                this.imageIndex = 0;
                app.graph.setDirtyCanvas(true, true);
            };
        }
    }
});
