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

            // Set compact initial node size (resizes smoothly with user dragging)
            this.size = [190, 110];

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
                
                // Determine card container position below widgets
                const widgetHeight = this.widgets ? (this.widgets.length * 24 + 30) : 40;
                const startY = Math.max(45, widgetHeight);
                
                const cardX = 8;
                const cardY = startY;
                const cardW = Math.max(60, this.size[0] - 16);
                const cardH = Math.max(45, this.size[1] - startY - 8);

                // 1. Dark Card Container (Matching UI aesthetic)
                ctx.fillStyle = "#222226";
                ctx.beginPath();
                ctx.roundRect(cardX, cardY, cardW, cardH, 10);
                ctx.fill();

                // 2. White Aspect Ratio Outline Rectangle (Square Edged, Aesthetic White Line)
                const textSpace = (showDim && data.display_text) ? 26 : 14;
                const availW = Math.max(20, cardW - 24);
                const availH = Math.max(20, cardH - textSpace - 16);

                let boxW, boxH;
                if (ratio >= availW / availH) {
                    boxW = availW;
                    boxH = availW / ratio;
                } else {
                    boxH = availH;
                    boxW = availH * ratio;
                }

                // Align outline box in upper right / top center of card
                const boxX = cardX + cardW - boxW - 12;
                const boxY = cardY + 12;

                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2.2;
                ctx.lineJoin = "miter";
                // Square edged sharp rectangle
                ctx.strokeRect(Math.round(boxX), Math.round(boxY), Math.round(boxW), Math.round(boxH));

                // 3. Dimension Summary Text (Bottom Left, Crisp White Font)
                if (showDim && data.display_text) {
                    ctx.fillStyle = "#ffffff";
                    ctx.font = "600 13px Inter, -apple-system, sans-serif";
                    ctx.textAlign = "left";
                    ctx.textBaseline = "bottom";

                    // Truncate text if card width is very small
                    const textStr = String(data.display_text);
                    const maxTextW = cardW - 24;
                    ctx.fillText(textStr, cardX + 12, cardY + cardH - 10, maxTextW);
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
