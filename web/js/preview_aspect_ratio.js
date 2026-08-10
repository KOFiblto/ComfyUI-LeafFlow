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

            // Set compact initial node size (resizes smoothly with user dragging)
            this.size = [190, 110];

            const origOnDrawForeground = this.onDrawForeground;
            this.onDrawForeground = function(ctx) {
                if (origOnDrawForeground) origOnDrawForeground.apply(this, arguments);
                if (this.flags?.collapsed) return;

                const data = this.aspect_ratio_data || { ratio: 1.0, display_text: "1 x 1" };
                const ratio = Math.max(0.05, Math.min(20.0, data.ratio || 1.0));

                ctx.save();
                
                // Determine drawing area below widgets
                const widgetHeight = this.widgets ? (this.widgets.length * 24 + 30) : 40;
                const startY = Math.max(45, widgetHeight);
                
                const containerX = 12;
                const containerY = startY;
                const containerW = Math.max(60, this.size[0] - 24);
                const containerH = Math.max(45, this.size[1] - startY - 10);

                // White Aspect Ratio Outline Box (No dark card background, slightly rounded squared edges)
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

                // Align outline box in top-right / top-center area
                const boxX = containerX + containerW - boxW - 8;
                const boxY = containerY + 6;

                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                // Very slight squared corners (r = 3) for clean aesthetic
                ctx.roundRect(Math.round(boxX), Math.round(boxY), Math.round(boxW), Math.round(boxH), 3);
                ctx.stroke();

                // Dimension Summary Text (Bottom Left, Crisp White Font)
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
        app.graph.setDirtyCanvas(true, true);
    }
});
