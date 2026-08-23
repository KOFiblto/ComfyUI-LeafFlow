import { app } from "/scripts/app.js";

const COLOR_MAP = {
    // Loaders (Emerald green)
    "VisualLoraLoader": { color: "#059669", bgcolor: "#047857" },
    "FolderLoraLoader": { color: "#059669", bgcolor: "#047857" },
    "FolderLoraLoaderPretty": { color: "#059669", bgcolor: "#047857" },
    "FolderLoraLoaderVisualPrettyV2": { color: "#059669", bgcolor: "#047857" },
    "VisualImageLoader": { color: "#059669", bgcolor: "#047857" },
    "ImageLoaderVisualPrettyV2": { color: "#059669", bgcolor: "#047857" },
    "LoadRecentOutputs": { color: "#059669", bgcolor: "#047857" },
    "FavoritePromptLoader": { color: "#059669", bgcolor: "#047857" },

    // Automation & Utilities (Amber)
    "LoadImageFromFolder": { color: "#d97706", bgcolor: "#b45309" },
    "AutoWatcherNode": { color: "#d97706", bgcolor: "#b45309" },
    "BackToPlaceholder": { color: "#d97706", bgcolor: "#b45309" },
    "UndoPlaceholder": { color: "#d97706", bgcolor: "#b45309" },
    "TextAspectRatioFinder": { color: "#d97706", bgcolor: "#b45309" },
    "AspectRatioFinder": { color: "#d97706", bgcolor: "#b45309" },
    "PreviewImageSizeAspectRatio": { color: "#d97706", bgcolor: "#b45309" },
    "TextLoraFinder": { color: "#d97706", bgcolor: "#b45309" },
    "LoraTextFinder": { color: "#d97706", bgcolor: "#b45309" },
    "PromptQueueIterator": { color: "#d97706", bgcolor: "#b45309" },
    "MultiTextReplacer": { color: "#d97706", bgcolor: "#b45309" },
    "LeafFlowTextSplit": { color: "#d97706", bgcolor: "#b45309" },
    "LeafFlowDecision": { color: "#d97706", bgcolor: "#b45309" },
    "FlowControlDecision": { color: "#d97706", bgcolor: "#b45309" },

    // Previews (Violet)
    "PreviewLatentLive": { color: "#7c3aed", bgcolor: "#6d28d9" },
    "SaveFavoritePreview": { color: "#7c3aed", bgcolor: "#6d28d9" },
    "PauseQueueNode": { color: "#059669", bgcolor: "#047857" },
    "PersistentQueueNode": { color: "#059669", bgcolor: "#047857" }
};

app.registerExtension({
    name: "ComfyUI.LeafFlow.Colors",
    async nodeCreated(node) {
        if (node && node.type && COLOR_MAP[node.type]) {
            const theme = COLOR_MAP[node.type];
            node.color = theme.color;
            node.bgcolor = theme.bgcolor;
        }
    }
});
