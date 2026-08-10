import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

app.registerExtension({
    name: "ComfyUI.FlowControl.PreviewImageSizeAspectRatio",

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "PreviewImageSizeAspectRatio") return;

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function() {
            if (onNodeCreated) onNodeCreated.apply(this, arguments);

            this.aspect_ratio_data = {
                ratio: 1.0,
                display_text: "1 x 1"
            };

            this.size = [190, 110];

            // 1. Create HTML DOM Widget for ComfyUI V2 Vue UI rendering
            const previewContainer = document.createElement("div");
            previewContainer.className = "flowcontrol-ar-preview-container";
            previewContainer.style.width = "100%";
            previewContainer.style.minHeight = "75px";
            previewContainer.style.display = "flex";
            previewContainer.style.flexDirection = "column";
            previewContainer.style.justifyContent = "space-between";
            previewContainer.style.padding = "6px 8px";
            previewContainer.style.boxSizing = "border-box";
            previewContainer.style.pointerEvents = "none";

            previewContainer.innerHTML = `
                <div class="ar-box-area" style="width: 100%; height: 50px; display: flex; align-items: center; justify-content: flex-end; padding-right: 4px;">
                    <div class="ar-box-outline" style="border: 2px solid #ffffff; border-radius: 3px; width: 45px; height: 45px; box-sizing: border-box; transition: all 0.2s ease-in-out;"></div>
                </div>
                <div class="ar-dim-text" style="width: 100%; text-align: left; font-size: 13px; font-weight: 600; color: #ffffff; font-family: Inter, system-ui, sans-serif; padding-left: 2px;">1 x 1</div>
            `;

            this.updateDomPreview = function() {
                if (!previewContainer) return;
                const data = this.aspect_ratio_data || { ratio: 1.0, display_text: "1 x 1" };
                const ratio = Math.max(0.05, Math.min(20.0, data.ratio || 1.0));
                
                const textEl = previewContainer.querySelector(".ar-dim-text");
                const boxEl = previewContainer.querySelector(".ar-box-outline");

                if (textEl) textEl.innerText = data.display_text || "1 x 1";

                if (boxEl) {
                    const availW = Math.max(30, (this.size[0] || 190) - 40);
                    const availH = 45;

                    let w, h;
                    if (ratio >= availW / availH) {
                        w = availW;
                        h = availW / ratio;
                    } else {
                        h = availH;
                        w = availH * ratio;
                    }
                    boxEl.style.width = `${Math.round(w)}px`;
                    boxEl.style.height = `${Math.round(h)}px`;
                }
            };

            this.addCustomWidget({
                name: "aspect_ratio_preview_widget",
                type: "HTML",
                element: previewContainer,
                draw(ctx, node, widgetWidth, y) {},
                computeSize() {
                    return [180, 80];
                }
            });

            // Initial DOM preview sync
            setTimeout(() => {
                if (typeof this.updateDomPreview === "function") {
                    this.updateDomPreview();
                }
            }, 100);

            // 2. LiteGraph Canvas drawing fallback for Classic V1
            const origOnDrawForeground = this.onDrawForeground;
            this.onDrawForeground = function(ctx) {
                if (origOnDrawForeground) origOnDrawForeground.apply(this, arguments);
                if (this.flags?.collapsed) return;

                const data = this.aspect_ratio_data || { ratio: 1.0, display_text: "1 x 1" };
                const ratio = Math.max(0.05, Math.min(20.0, data.ratio || 1.0));

                ctx.save();
                
                const widgetHeight = this.widgets ? (this.widgets.length * 24 + 30) : 40;
                const startY = Math.max(45, widgetHeight);
                
                const containerX = 12;
                const containerY = startY;
                const containerW = Math.max(60, this.size[0] - 24);
                const containerH = Math.max(45, this.size[1] - startY - 10);

                const textSpace = data.display_text ? 24 : 10;
                const availW = Math.max(20, containerW - 16);
                const availH = Math.max(20, containerH - textSpace - 10);

                let boxW, boxH;
                if (ratio >= availW / availH) {
                    boxW = availW;
                    boxH = availW / ratio;
                } else {
                    boxH = availH;
                    boxW = availH * ratio;
                }

                const boxX = containerX + containerW - boxW - 8;
                const boxY = containerY + 6;

                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.roundRect(Math.round(boxX), Math.round(boxY), Math.round(boxW), Math.round(boxH), 3);
                ctx.stroke();

                if (data.display_text) {
                    ctx.fillStyle = "#ffffff";
                    ctx.font = "600 13px Inter, -apple-system, sans-serif";
                    ctx.textAlign = "left";
                    ctx.textBaseline = "bottom";

                    const textStr = String(data.display_text);
                    const maxTextW = containerW - 16;
                    ctx.fillText(textStr, containerX + 4, containerY + containerH - 4, maxTextW);
                }

                ctx.restore();
            };
        };
    }
});

// Listen for WebSocket update events from backend execution
api.addEventListener("flowcontrol_update_preview_aspect_ratio", (event) => {
    const detail = event.detail;
    if (!detail || !detail.node_id) return;

    const node = app.graph.getNodeById(detail.node_id);
    if (node && node.type === "PreviewImageSizeAspectRatio") {
        node.aspect_ratio_data = {
            ratio: detail.ratio,
            display_text: detail.display_text
        };
        if (typeof node.updateDomPreview === "function") {
            node.updateDomPreview();
        }
        app.graph.setDirtyCanvas(true, true);
    }
});
