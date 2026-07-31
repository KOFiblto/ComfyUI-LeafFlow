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
            const currentVal = widget.value;
            widget.options.values = [...currentValues];
            
            if (currentVal && currentVal !== "Auto" && !currentValues.includes(currentVal)) {
                widget.options.values.push(currentVal);
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
                
                widget.callback = function() {
                    updateAllPreviewNodeDropdowns();
                };
                
                this.size = [300, 300];
                this.imgs = [];
                this.imageIndex = 0;
                
                // Create robust DOM container for V2 overlay
                const viewContainer = document.createElement("div");
                viewContainer.style.width = "100%";
                viewContainer.style.height = "100%";
                viewContainer.style.display = "flex";
                viewContainer.style.alignItems = "center";
                viewContainer.style.justifyContent = "center";
                viewContainer.style.backgroundColor = "transparent";
                viewContainer.style.color = "#888";
                viewContainer.style.fontFamily = "Inter, sans-serif";
                viewContainer.style.fontSize = "14px";
                viewContainer.style.overflow = "hidden";
                
                const fallbackText = document.createElement("div");
                fallbackText.className = "flowcontrol-live-preview-fallback";
                fallbackText.innerText = "Waiting for live preview...";
                viewContainer.appendChild(fallbackText);
                
                const imgElement = document.createElement("img");
                imgElement.className = "flowcontrol-live-preview-img";
                imgElement.style.maxWidth = "100%";
                imgElement.style.maxHeight = "100%";
                imgElement.style.objectFit = "contain";
                imgElement.style.display = "none";
                viewContainer.appendChild(imgElement);
                
                this.previewImgElement = imgElement;
                this.previewFallbackText = fallbackText;
                
                // Mount DOM widget
                this.addDOMWidget("preview_display", "HTML", viewContainer, {
                    getValue() { return ""; },
                    setValue(val) {},
                    serialize: false
                });
                
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
                
                // Update DOM elements natively for V2 visibility
                const domImgs = document.querySelectorAll(`[data-node-id="${this.id}"] .flowcontrol-live-preview-img, [data-widgets-grid-node-id="${this.id}"] .flowcontrol-live-preview-img`);
                if (domImgs.length > 0) {
                    domImgs.forEach(imgEl => {
                        imgEl.src = img.src;
                        imgEl.style.display = "block";
                        const fallback = imgEl.parentElement.querySelector(".flowcontrol-live-preview-fallback");
                        if (fallback) fallback.style.display = "none";
                    });
                }
                
                // Fallback for V1 LiteGraph internal references
                if (this.previewImgElement && this.previewFallbackText && img && img.src) {
                    this.previewFallbackText.style.display = "none";
                    this.previewImgElement.src = img.src;
                    this.previewImgElement.style.display = "block";
                }
                
                app.graph.setDirtyCanvas(true, true);
            };
        }
    }
});
