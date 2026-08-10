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
                display_text: "1 x 1",
                show_dimensions: true
            };

            // Ensure node has a comfortable preview height
            this.size = [220, 160];

            const origOnDrawForeground = this.onDrawForeground;
            this.onDrawForeground = function(ctx) {
                if (origOnDrawForeground) origOnDrawForeground.apply(this, arguments);
                if (this.flags?.collapsed) return;

                const data = this.aspect_ratio_data || { ratio: 1.0, display_text: "1 x 1", show_dimensions: true };
                const ratio = Math.max(0.05, Math.min(20.0, data.ratio || 1.0));
                
                // Read show_dimensions widget value if present
                const showDimWidget = this.widgets ? this.widgets.find(w => w.name === "show_dimensions") : null;
                const showDim = showDimWidget ? showDimWidget.value : data.show_dimensions;

                ctx.save();
                
                // Calculate drawing area below inputs/widgets
                const startY = 65;
                const maxW = Math.max(40, this.size[0] - 30);
                const maxH = Math.max(40, this.size[1] - startY - 30);

                let boxW, boxH;
                if (ratio >= maxW / maxH) {
                    boxW = maxW;
                    boxH = maxW / ratio;
                } else {
                    boxH = maxH;
                    boxW = maxH * ratio;
                }

                const centerX = this.size[0] / 2;
                const centerY = startY + maxH / 2;
                const boxX = centerX - boxW / 2;
                const boxY = centerY - boxH / 2;

                // Draw Preview Box Container
                ctx.fillStyle = "#16161a";
                ctx.strokeStyle = "#383842";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.roundRect(boxX, boxY, boxW, boxH, 6);
                ctx.fill();
                ctx.stroke();

                // Draw Aspect Ratio Fill Box
                ctx.fillStyle = "rgba(0, 122, 204, 0.25)";
                ctx.strokeStyle = "#007acc";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(boxX + 2, boxY + 2, Math.max(1, boxW - 4), Math.max(1, boxH - 4), 4);
                ctx.fill();
                ctx.stroke();

                // Draw Dimension Summary Text if show_dimensions is enabled
                if (showDim && data.display_text) {
                    ctx.fillStyle = "#ffffff";
                    ctx.font = "bold 11px Inter, sans-serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";

                    // Text background pill inside or below box
                    const textStr = String(data.display_text);
                    const textMetrics = ctx.measureText(textStr);
                    const pillW = textMetrics.width + 12;
                    const pillH = 18;
                    const pillX = centerX - pillW / 2;
                    const pillY = boxY + boxH / 2 - pillH / 2;

                    ctx.fillStyle = "rgba(18, 18, 22, 0.85)";
                    ctx.beginPath();
                    ctx.roundRect(pillX, pillY, pillW, pillH, 4);
                    ctx.fill();

                    ctx.fillStyle = "#61afef";
                    ctx.fillText(textStr, centerX, boxY + boxH / 2);
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
            display_text: detail.display_text,
            show_dimensions: detail.show_dimensions
        };
        app.graph.setDirtyCanvas(true, true);
    }
});
