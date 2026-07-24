import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { PreviewManager } from "./preview_manager.js";

function getKSamplerNodes() {
    if (!app || !app.graph) return [];
    return app.graph._nodes.filter(node => {
        if (!node) return false;
        const type = (node.type || "").toLowerCase();
        const title = (node.title || "").toLowerCase();
        return type.includes("sampler") || type.includes("ksampler") || title.includes("sampler");
    }).map(node => ({
        id: node.id,
        title: node.title || node.type || `Node ${node.id}`
    }));
}

function updateAllPreviewNodeDropdowns() {
    if (!app || !app.graph) return;
    
    const previewNodes = app.graph._nodes.filter(n => n && n.type === "PreviewLatentLive");
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
