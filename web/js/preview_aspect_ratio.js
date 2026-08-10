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

            this.size = [200, 130];

            // 1. HTML DOM Widget for ComfyUI V2 Vue UI (Centered Box with labels next to sides)
            const previewContainer = document.createElement("div");
            previewContainer.className = "flowcontrol-ar-preview-container";
            previewContainer.style.width = "100%";
            previewContainer.style.minHeight = "85px";
            previewContainer.style.display = "flex";
            previewContainer.style.alignItems = "center";
            previewContainer.style.justifyContent = "center";
            previewContainer.style.padding = "10px 16px 20px 24px";
            previewContainer.style.boxSizing = "border-box";
            previewContainer.style.pointerEvents = "none";
            previewContainer.style.position = "relative";
            previewContainer.style.overflow = "visible";

            previewContainer.innerHTML = `
                <div class="ar-box-container" style="position: relative; display: flex; align-items: center; justify-content: center; margin: auto;">
                    <div class="ar-box-outline" style="border: 2.2px solid #ffffff; border-radius: 3px; width: 50px; height: 50px; box-sizing: border-box; transition: all 0.15s ease-out;"></div>
                    <div class="ar-label-height" style="position: absolute; right: 100%; margin-right: 8px; top: 50%; transform: translateY(-50%); font-size: 13px; font-weight: 700; color: #ffffff; font-family: Inter, system-ui, sans-serif; white-space: nowrap;">1</div>
                    <div class="ar-label-width" style="position: absolute; top: 100%; margin-top: 6px; left: 50%; transform: translateX(-50%); font-size: 13px; font-weight: 700; color: #ffffff; font-family: Inter, system-ui, sans-serif; white-space: nowrap;">1</div>
                </div>
            `;

            this.updateDomPreview = function() {
                if (!previewContainer) return;
                const data = this.aspect_ratio_data || { ratio: 1.0, display_text: "1 x 1" };
                const ratio = Math.max(0.05, Math.min(20.0, data.ratio || 1.0));

                let partW = "1";
                let partH = "1";

                if (data.display_text) {
                    const str = String(data.display_text).trim();
                    if (str.includes(" x ")) {
                        const parts = str.split(" x ");
                        partW = parts[0];
                        partH = parts[1] || "";
                    } else if (str.includes("x")) {
                        const parts = str.split("x");
                        partW = parts[0];
                        partH = parts[1] || "";
                    } else if (str.includes(":")) {
                        const parts = str.split(":");
                        partW = parts[0];
                        partH = parts[1] || "";
                    } else {
                        partW = str;
                        partH = "";
                    }
                }

                const widthEl = previewContainer.querySelector(".ar-label-width");
                const heightEl = previewContainer.querySelector(".ar-label-height");
                const boxEl = previewContainer.querySelector(".ar-box-outline");

                if (widthEl) widthEl.innerText = partW;
                if (heightEl) heightEl.innerText = partH;

                if (boxEl) {
                    const maxW = Math.max(25, (this.size[0] || 200) - 70);
                    const maxH = Math.max(25, (this.size[1] || 130) - 65);

                    let w, h;
                    if (ratio >= maxW / maxH) {
                        w = maxW;
                        h = maxW / ratio;
                    } else {
                        h = maxH;
                        w = maxH * ratio;
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
                    return [190, 90];
                }
            });

            // Initial DOM sync
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

                let partW = "1";
                let partH = "1";
                if (data.display_text) {
                    const str = String(data.display_text).trim();
                    if (str.includes(" x ")) {
                        const parts = str.split(" x ");
                        partW = parts[0];
                        partH = parts[1] || "";
                    } else if (str.includes("x")) {
                        const parts = str.split("x");
                        partW = parts[0];
                        partH = parts[1] || "";
                    } else if (str.includes(":")) {
                        const parts = str.split(":");
                        partW = parts[0];
                        partH = parts[1] || "";
                    } else {
                        partW = str;
                        partH = "";
                    }
                }

                ctx.save();

                const widgetHeight = this.widgets ? (this.widgets.length * 24 + 20) : 35;
                const startY = Math.max(35, widgetHeight);

                const availW = Math.max(25, this.size[0] - 70);
                const availH = Math.max(25, this.size[1] - startY - 45);

                let boxW, boxH;
                if (ratio >= availW / availH) {
                    boxW = availW;
                    boxH = availW / ratio;
                } else {
                    boxH = availH;
                    boxW = availH * ratio;
                }

                // Center white box inside container area
                const boxX = (this.size[0] - boxW) / 2 + 10;
                const boxY = startY + (availH - boxH) / 2 + 5;

                // Stroke centered white outline box
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.roundRect(Math.round(boxX), Math.round(boxY), Math.round(boxW), Math.round(boxH), 3);
                ctx.stroke();

                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 13px Inter, -apple-system, sans-serif";

                // Height Label (Left of vertical bar)
                if (partH) {
                    ctx.textAlign = "right";
                    ctx.textBaseline = "middle";
                    ctx.fillText(partH, boxX - 8, boxY + boxH / 2);
                }

                // Width Label (Below bottom horizontal bar)
                if (partW) {
                    ctx.textAlign = "center";
                    ctx.textBaseline = "top";
                    ctx.fillText(partW, boxX + boxW / 2, boxY + boxH + 6);
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
