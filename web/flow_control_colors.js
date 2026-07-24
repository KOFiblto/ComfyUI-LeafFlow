import { app } from "/scripts/app.js";

const COLOR_MAP = {
    "PauseQueueNode": { color: "#059669", bgcolor: "#047857" },
    "PersistentQueueNode": { color: "#059669", bgcolor: "#047857" },
    "FolderLoraLoaderVisualPrettyV2": { color: "#059669", bgcolor: "#047857" },
    "ImageLoaderVisualPrettyV2": { color: "#059669", bgcolor: "#047857" },
    "LoadRecentOutputs": { color: "#059669", bgcolor: "#047857" },
    "AutoWatcherNode": { color: "#d97706", bgcolor: "#b45309" },
    "UndoPlaceholder": { color: "#d97706", bgcolor: "#b45309" },
    "PreviewLatentLive": { color: "#7c3aed", bgcolor: "#6d28d9" }
};

app.registerExtension({
    name: "ComfyUI.FlowControl.Colors",
    async nodeCreated(node) {
        if (node && node.type && COLOR_MAP[node.type]) {
            const theme = COLOR_MAP[node.type];
            node.color = theme.color;
            node.bgcolor = theme.bgcolor;
        }
    }
});
