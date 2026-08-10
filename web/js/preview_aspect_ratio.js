import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

app.registerExtension({
    name: "ComfyUI.FlowControl.PreviewImageSizeAspectRatio",

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "PreviewImageSizeAspectRatio" && nodeData.name !== "TextAspectRatioFinder") return;

        if (nodeData.name === "PreviewImageSizeAspectRatio") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);

                // STRICTLY REMOVE ALL OUTPUT SLOTS
                this.outputs = [];
                if (this.outputs) this.outputs.length = 0;

                this.aspect_ratio_data = {
                    ratio: 1.0,
                    display_text: "1 x 1"
                };

                this.size = [240, 260];
                this.aspect_ratio = false;
                this.resizable = true;

                // DOM Container for ComfyUI V2 Vue UI
                const viewContainer = document.createElement("div");
                viewContainer.className = "flowcontrol-ar-preview-container";
                viewContainer.style.width = "100%";
                viewContainer.style.height = "calc(100% - 110px)";
                viewContainer.style.minHeight = "80px";
                viewContainer.style.display = "flex";
                viewContainer.style.alignItems = "center";
                viewContainer.style.justifyContent = "center";
                viewContainer.style.padding = "10px 15px 25px 35px";
                viewContainer.style.boxSizing = "border-box";
                viewContainer.style.pointerEvents = "none";
                viewContainer.style.position = "relative";
                viewContainer.style.overflow = "hidden";

                viewContainer.innerHTML = `
                    <div class="ar-box-container" style="position: relative; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                        <svg class="ar-box-svg" style="position: absolute; overflow: visible; pointer-events: none;" width="50" height="50" viewBox="0 0 50 50">
                            <path class="ar-crop-path" d="" stroke="#ffffff" stroke-width="2.8" stroke-linecap="square" fill="none"/>
                        </svg>
                        <div class="ar-label-height" style="position: absolute; right: 100%; margin-right: 6px; top: 50%; transform: translateY(-50%); font-size: 13px; font-weight: 700; color: #ffffff; font-family: Inter, system-ui, sans-serif; white-space: nowrap;">1</div>
                        <div class="ar-label-width" style="position: absolute; top: 100%; margin-top: 6px; left: 50%; transform: translateX(-50%); font-size: 13px; font-weight: 700; color: #ffffff; font-family: Inter, system-ui, sans-serif; white-space: nowrap;">1</div>
                    </div>
                `;

                this.updateDomPreview = function() {
                    if (!viewContainer) return;
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

                    const widthEl = viewContainer.querySelector(".ar-label-width");
                    const heightEl = viewContainer.querySelector(".ar-label-height");
                    const svgEl = viewContainer.querySelector(".ar-box-svg");
                    const pathEl = viewContainer.querySelector(".ar-crop-path");

                    if (widthEl) widthEl.innerText = partW;
                    if (heightEl) heightEl.innerText = partH;

                    if (svgEl && pathEl) {
                        const availW = Math.max(30, (this.size[0] || 240) - 75);
                        const availH = Math.max(30, (this.size[1] || 260) - 150);

                        let w, h;
                        if (ratio >= availW / availH) {
                            w = availW;
                            h = availW / ratio;
                        } else {
                            h = availH;
                            w = availH * ratio;
                        }

                        w = Math.round(w);
                        h = Math.round(h);

                        svgEl.setAttribute("width", w);
                        svgEl.setAttribute("height", h);
                        svgEl.setAttribute("viewBox", `0 0 ${w} ${h}`);

                        const cLen = Math.max(6, Math.min(16, Math.min(w, h) * 0.22));
                        const eLen = Math.max(6, Math.min(14, Math.min(w, h) * 0.18));

                        let d = `M 0,${cLen} L 0,0 L ${cLen},0 ` +
                                `M ${w - cLen},0 L ${w},0 L ${w},${cLen} ` +
                                `M 0,${h - cLen} L 0,${h} L ${cLen},${h} ` +
                                `M ${w - cLen},${h} L ${w},${h} L ${w},${h - cLen} `;

                        if (w > cLen * 3) {
                            const midX = w / 2;
                            d += `M ${midX - eLen / 2},0 L ${midX + eLen / 2},0 `;
                            d += `M ${midX - eLen / 2},${h} L ${midX + eLen / 2},${h} `;
                        }
                        if (h > cLen * 3) {
                            const midY = h / 2;
                            d += `M 0,${midY - eLen / 2} L 0,${midY + eLen / 2} `;
                            d += `M ${w},${midY - eLen / 2} L ${w},${midY + eLen / 2} `;
                        }

                        pathEl.setAttribute("d", d);
                    }
                };

                this.addDOMWidget("ar_preview_display", "HTML", viewContainer, {
                    getValue() { return ""; },
                    setValue(val) {},
                    serialize: false
                });

                // Canvas drawing fallback for LiteGraph (Classic V1) - Crop Bracket Style
                const origOnDrawForeground = this.onDrawForeground;
                this.onDrawForeground = function(ctx) {
                    if (origOnDrawForeground) origOnDrawForeground.apply(this, arguments);
                    if (this.flags?.collapsed) return;

                    if (this.outputs && this.outputs.length > 0) {
                        this.outputs.length = 0;
                    }

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

                    const startY = 30 + (this.inputs ? this.inputs.length * 20 : 80);

                    const marginLeft = 45;
                    const marginRight = 25;
                    const marginTop = startY + 10;
                    const marginBottom = 35;

                    const availW = Math.max(20, this.size[0] - marginLeft - marginRight);
                    const availH = Math.max(20, this.size[1] - marginTop - marginBottom);

                    let boxW, boxH;
                    if (ratio >= availW / availH) {
                        boxW = availW;
                        boxH = availW / ratio;
                    } else {
                        boxH = availH;
                        boxW = availH * ratio;
                    }

                    const boxX = marginLeft + (availW - boxW) / 2;
                    const boxY = marginTop + (availH - boxH) / 2;

                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 2.8;
                    ctx.lineCap = "square";
                    ctx.beginPath();

                    const cLen = Math.max(6, Math.min(16, Math.min(boxW, boxH) * 0.22));
                    const eLen = Math.max(6, Math.min(14, Math.min(boxW, boxH) * 0.18));

                    // Top-Left Corner
                    ctx.moveTo(boxX, boxY + cLen);
                    ctx.lineTo(boxX, boxY);
                    ctx.lineTo(boxX + cLen, boxY);

                    // Top-Right Corner
                    ctx.moveTo(boxX + boxW - cLen, boxY);
                    ctx.lineTo(boxX + boxW, boxY);
                    ctx.lineTo(boxX + boxW, boxY + cLen);

                    // Bottom-Left Corner
                    ctx.moveTo(boxX, boxY + boxH - cLen);
                    ctx.lineTo(boxX, boxY + boxH);
                    ctx.lineTo(boxX + cLen, boxY + boxH);

                    // Bottom-Right Corner
                    ctx.moveTo(boxX + boxW - cLen, boxY + boxH);
                    ctx.lineTo(boxX + boxW, boxY + boxH);
                    ctx.lineTo(boxX + boxW, boxY + boxH - cLen);

                    // Top Center Handle
                    if (boxW > cLen * 3) {
                        const midX = boxX + boxW / 2;
                        ctx.moveTo(midX - eLen / 2, boxY);
                        ctx.lineTo(midX + eLen / 2, boxY);
                    }

                    // Bottom Center Handle
                    if (boxW > cLen * 3) {
                        const midX = boxX + boxW / 2;
                        ctx.moveTo(midX - eLen / 2, boxY + boxH);
                        ctx.lineTo(midX + eLen / 2, boxY + boxH);
                    }

                    // Left Center Handle
                    if (boxH > cLen * 3) {
                        const midY = boxY + boxH / 2;
                        ctx.moveTo(boxX, midY - eLen / 2);
                        ctx.lineTo(boxX, midY + eLen / 2);
                    }

                    // Right Center Handle
                    if (boxH > cLen * 3) {
                        const midY = boxY + boxH / 2;
                        ctx.moveTo(boxX + boxW, midY - eLen / 2);
                        ctx.lineTo(boxX + boxW, midY + eLen / 2);
                    }

                    ctx.stroke();

                    ctx.fillStyle = "#ffffff";
                    ctx.font = "bold 13px Inter, -apple-system, sans-serif";

                    if (partH) {
                        ctx.textAlign = "right";
                        ctx.textBaseline = "middle";
                        ctx.fillText(partH, boxX - 8, boxY + boxH / 2);
                    }

                    if (partW) {
                        ctx.textAlign = "center";
                        ctx.textBaseline = "top";
                        ctx.fillText(partW, boxX + boxW / 2, boxY + boxH + 8);
                    }

                    ctx.restore();
                };

                nodeType.prototype.computeSize = function() {
                    return [Math.max(200, this.size[0]), Math.max(200, this.size[1])];
                };

                nodeType.prototype.onResize = function(size) {
                    this.size[0] = Math.max(200, size[0]);
                    this.size[1] = Math.max(200, size[1]);
                    if (typeof this.updateDomPreview === "function") {
                        this.updateDomPreview();
                    }
                };
            };
        }
    }
});

api.addEventListener("flowcontrol_update_preview_aspect_ratio", (event) => {
    const detail = event.detail;
    if (!detail || !detail.node_id) return;

    const node = app.graph.getNodeById(detail.node_id);
    if (node && (node.type === "PreviewImageSizeAspectRatio" || node.type === "TextAspectRatioFinder")) {
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
