import { app } from "/scripts/app.js";

// Vibrant Leaf Green palette matching the 🍃 emoji
const LEAF_GREEN = { color: "#16a34a", bgcolor: "#14532d" };
const LEAF_LIGHT = { color: "#22c55e", bgcolor: "#166534" };
const LEAF_EMERALD = { color: "#059669", bgcolor: "#064e3b" };

const COLOR_MAP = {
    // Visual Loaders
    "VisualLoraLoader": LEAF_GREEN,
    "FolderLoraLoader": LEAF_GREEN,
    "FolderLoraLoaderPretty": LEAF_GREEN,
    "FolderLoraLoaderVisualPrettyV2": LEAF_GREEN,
    "VisualImageLoader": LEAF_GREEN,
    "ImageLoaderVisualPrettyV2": LEAF_GREEN,
    "LoadRecentOutputs": LEAF_GREEN,

    // Automation, Flow & Utilities
    "LoadImageFromFolder": LEAF_LIGHT,
    "AutoWatcherNode": LEAF_LIGHT,
    "BackToPlaceholder": LEAF_LIGHT,
    "UndoPlaceholder": LEAF_LIGHT,
    "TextAspectRatioFinder": LEAF_LIGHT,
    "AspectRatioFinder": LEAF_LIGHT,
    "PreviewImageSizeAspectRatio": LEAF_LIGHT,
    "TextLoraFinder": LEAF_LIGHT,
    "LoraTextFinder": LEAF_LIGHT,
    "PromptQueueIterator": LEAF_LIGHT,
    "MultiTextReplacer": LEAF_LIGHT,
    "LeafFlowTextSplit": LEAF_LIGHT,
    "LeafFlowDecision": LEAF_LIGHT,
    "FlowControlDecision": LEAF_LIGHT,

    // Queue & Previews
    "PreviewLatentLive": LEAF_EMERALD,
    "PauseQueueNode": LEAF_EMERALD,
    "PersistentQueueNode": LEAF_EMERALD
};

app.registerExtension({
    name: "ComfyUI.LeafFlow.Colors",
    async nodeCreated(node) {
        const enabled = app.ui.settings.getSettingValue(
            "LeafFlow.1. 🖼️ Visual Loaders.00_EnableCustomColors",
            true
        );
        if (!enabled) return;

        if (node && node.type && COLOR_MAP[node.type]) {
            const theme = COLOR_MAP[node.type];
            node.color = theme.color;
            node.bgcolor = theme.bgcolor;
        }
    }
});
