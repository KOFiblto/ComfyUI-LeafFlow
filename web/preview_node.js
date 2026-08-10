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
                this.aspect_ratio = false; // Disable LiteGraph aspect ratio locking (Issue 3 fix)
                this.resizable = true;
                this.imgs = [];
                this.imageIndex = 0;
                
                const viewContainer = document.createElement("div");
                viewContainer.style.width = "100%";
                viewContainer.style.height = "calc(100% - 55px)";
                viewContainer.style.maxHeight = "calc(100% - 55px)";
                viewContainer.style.display = "flex";
                viewContainer.style.alignItems = "center";
                viewContainer.style.justifyContent = "center";
                viewContainer.style.backgroundColor = "transparent";
                viewContainer.style.color = "#888";
                viewContainer.style.fontFamily = "Inter, sans-serif";
                viewContainer.style.fontSize = "14px";
                viewContainer.style.overflow = "hidden";
                viewContainer.style.boxSizing = "border-box";
                
                const fallbackText = document.createElement("div");
                fallbackText.className = "flowcontrol-live-preview-fallback";
                fallbackText.innerText = "Waiting for live preview...";
                viewContainer.appendChild(fallbackText);
                
                const imgElement = document.createElement("img");
                imgElement.className = "flowcontrol-live-preview-img";
                imgElement.style.maxWidth = "100%";
                imgElement.style.maxHeight = "100%";
                imgElement.style.width = "auto";
                imgElement.style.height = "auto";
                imgElement.style.objectFit = "contain";
                imgElement.style.display = "none";
                viewContainer.appendChild(imgElement);
                
                this.previewImgElement = imgElement;
                this.previewFallbackText = fallbackText;
                
                this.addDOMWidget("preview_display", "HTML", viewContainer, {
                    getValue() { return ""; },
                    setValue(val) {},
                    serialize: false
                });
                
                PreviewManager.registerNode(this);
                setTimeout(updateAllPreviewNodeDropdowns, 100);
            };

            nodeType.prototype.computeSize = function() {
                return [Math.max(200, this.size[0]), Math.max(200, this.size[1])];
            };

            nodeType.prototype.onResize = function(size) {
                this.size[0] = Math.max(200, size[0]);
                this.size[1] = Math.max(200, size[1]);
                this.aspect_ratio = false;
            };

            nodeType.prototype.onDrawBackground = function(ctx) {
                if (this.flags.collapsed) return;
                this.aspect_ratio = false; // Prevent LiteGraph auto-lock on render
                if (this.imgs && this.imgs.length) {
                    const img = this.imgs[this.imageIndex || 0];
                    if (!img || !img.complete || (img.naturalWidth === 0 && img.width === 0)) return;
                    
                    const margin = 8;
                    const topY = 55;
                    const maxW = Math.max(10, this.size[0] - margin * 2);
                    const maxH = Math.max(10, this.size[1] - topY - margin);
                    if (maxW <= 0 || maxH <= 0) return;
                    
                    const w = img.naturalWidth || img.width;
                    const h = img.naturalHeight || img.height;
                    const imgAspect = w / h;
                    
                    let drawW = maxW;
                    let drawH = maxW / imgAspect;
                    if (drawH > maxH) {
                        drawH = maxH;
                        drawW = maxH * imgAspect;
                    }
                    
                    const drawX = margin + (maxW - drawW) / 2;
                    const drawY = topY + (maxH - drawH) / 2;
                    
                    ctx.drawImage(img, drawX, drawY, drawW, drawH);
                }
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
                
                this.aspect_ratio = false; // Prevent aspect ratio lock on new preview
                this.imgs = [img];
                this.imageIndex = 0;
                
                const domImgs = document.querySelectorAll(`[data-node-id="${this.id}"] .flowcontrol-live-preview-img, [data-widgets-grid-node-id="${this.id}"] .flowcontrol-live-preview-img`);
                if (domImgs.length > 0) {
                    domImgs.forEach(imgEl => {
                        imgEl.src = img.src;
                        imgEl.style.display = "block";
                        const fallback = imgEl.parentElement.querySelector(".flowcontrol-live-preview-fallback");
                        if (fallback) fallback.style.display = "none";
                    });
                }
                
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
