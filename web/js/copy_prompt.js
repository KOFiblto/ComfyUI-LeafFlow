import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

/**
 * Fallback clipboard copy helper that works in non-secure HTTP and headless contexts.
 */
async function copyToClipboard(text) {
    if (!text) return false;
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (e) {
            console.warn("[LeafFlow] Navigator clipboard failed, trying textarea fallback:", e);
        }
    }
    try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "-9999px";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textarea);
        return successful;
    } catch (err) {
        console.error("[LeafFlow] Clipboard copy fallback failed:", err);
        return false;
    }
}

/**
 * Helper to fetch image metadata and extract the positive prompt text.
 */
async function copyImagePrompt(imgSrc) {
    if (!imgSrc) return false;
    try {
        let url = new URL(imgSrc, window.location.origin);
        let filename = url.searchParams.get("filename");
        let type = url.searchParams.get("type") || "output";
        let subfolder = url.searchParams.get("subfolder") || "";

        if (!filename) return false;

        // Try extracting via LeafFlow /view_image_prompt endpoint if available or direct PNG extraction
        const promptUrl = `/leafflow/view_image_prompt?filename=${encodeURIComponent(filename)}&type=${encodeURIComponent(type)}&subfolder=${encodeURIComponent(subfolder)}`;
        const response = await api.fetchApi(promptUrl);
        if (response.ok) {
            const data = await response.json();
            if (data && data.prompt) {
                return await copyToClipboard(data.prompt);
            }
        }
    } catch (e) {
        console.warn("[LeafFlow] Direct prompt fetch failed:", e);
    }
    return false;
}

// 1. Hook into Node Context Menu (Right Click on Image Nodes)
app.registerExtension({
    name: "ComfyUI.LeafFlow.CopyPrompt",

    async beforeRegisterNodeDef(nodeType, nodeData) {
        const origGetExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
        nodeType.prototype.getExtraMenuOptions = function (_, options) {
            if (origGetExtraMenuOptions) origGetExtraMenuOptions.apply(this, arguments);

            const enabled = app.ui.settings.getSettingValue(
                "LeafFlow.3. 📋 Prompt Actions.02_EnableContextMenuCopyPrompt",
                true
            );
            if (!enabled) return;

            if (this.imgs && this.imgs.length > 0) {
                options.push({
                    content: "📋 Copy Prompt",
                    callback: async () => {
                        const img = this.imgs[this.imageIndex || 0];
                        if (!img || !img.src) return;
                        const success = await copyImagePrompt(img.src);
                        if (success) {
                            alert("Prompt copied to clipboard!");
                        } else {
                            alert("LeafFlow: Could not extract positive prompt from this image.");
                        }
                    },
                });
            }
        };
    },
});

// 2. Hook into Standard Top Hover Action Bar over Image Cards in Assets Pane & Canvas Previews
function injectHoverCopyAction(overlayBar) {
    if (!overlayBar || overlayBar.querySelector(".leafflow-hover-copy")) return;

    const enabled = app.ui.settings.getSettingValue(
        "LeafFlow.3. 📋 Prompt Actions.01_EnableAssetsCopyPromptButton",
        true
    );
    if (!enabled) return;

    // Locate the white icon group container (div.flex.shrink-0) inside the overlay
    const iconGroup =
        overlayBar.querySelector(".flex.shrink-0") ||
        overlayBar.querySelector('button[aria-label="Zoom in"]')?.parentElement ||
        overlayBar;

    // Locate parent image card or asset item container
    const parentCard = overlayBar.closest(
        "div[data-virtual-grid-item], .asset-card, [data-node-id], .lg-node, div.relative"
    );
    const img = parentCard ? parentCard.querySelector("img") : overlayBar.parentElement?.querySelector("img");
    if (!img || !img.src) return;

    // Find the 'More options' button (3-dots ellipsis) to insert before it
    const moreBtn =
        iconGroup.querySelector('button[aria-label="More options"]') ||
        iconGroup.querySelector('button[aria-label="More"]') ||
        iconGroup.lastElementChild;

    const copyBtn = document.createElement("button");
    copyBtn.className =
        "leafflow-hover-btn leafflow-hover-copy relative inline-flex items-center justify-center cursor-pointer touch-manipulation appearance-none border-none text-xs font-medium font-inter transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-white text-gray-700 hover:bg-gray-100 size-8 p-0 rounded-none pointer-events-auto border-r border-gray-200 shrink-0";
    copyBtn.title = "Copy Prompt";
    copyBtn.setAttribute("aria-label", "Copy Prompt");
    copyBtn.setAttribute("data-pd-tooltip", "true");
    copyBtn.innerHTML = "<span class='text-sm pointer-events-none'>📋</span>";

    copyBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const success = await copyImagePrompt(img.src);
        if (success) {
            copyBtn.innerHTML = "<span class='text-sm pointer-events-none'>✅</span>";
            setTimeout(() => (copyBtn.innerHTML = "<span class='text-sm pointer-events-none'>📋</span>"), 2000);
        } else {
            copyBtn.innerHTML = "<span class='text-sm pointer-events-none'>❌</span>";
            setTimeout(() => (copyBtn.innerHTML = "<span class='text-sm pointer-events-none'>📋</span>"), 2000);
        }
    };

    if (moreBtn && moreBtn.parentElement === iconGroup) {
        iconGroup.insertBefore(copyBtn, moreBtn);
    } else {
        iconGroup.appendChild(copyBtn);
    }
}

// Observe DOM mutations to attach the copy button whenever a hover overlay bar appears
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const selectors =
                        '.absolute.top-2, .absolute.top-1, .asset-card-overlay, [data-testid="asset-card-actions"]';
                    if (node.matches?.(selectors)) {
                        injectHoverCopyAction(node);
                    } else if (node.querySelectorAll) {
                        const overlays = node.querySelectorAll(selectors);
                        overlays.forEach((overlay) => injectHoverCopyAction(overlay));
                    }
                }
            });
        }
    }
});
observer.observe(document.body, { childList: true, subtree: true });
