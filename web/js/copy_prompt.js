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

function isCopyEnabled(settingKey) {
    try {
        const val = app.extensionManager?.setting?.get?.(settingKey) ?? app.ui?.settings?.getSettingValue?.(settingKey);
        if (val !== undefined && val !== null) return Boolean(val);
    } catch (_) {}
    return true;
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

        if (!filename) {
            const parts = url.pathname.split("/");
            filename = parts[parts.length - 1];
        }

        if (!filename) return false;

        const promptUrl = `/leafflow/view_image_prompt?filename=${encodeURIComponent(filename)}&type=${encodeURIComponent(type)}&subfolder=${encodeURIComponent(subfolder)}`;
        const response = await api.fetchApi(promptUrl);
        if (response.ok) {
            const data = await response.json();
            if (data && data.prompt) {
                const copied = await copyToClipboard(data.prompt);
                if (copied && app.extensionManager?.toast?.add) {
                    app.extensionManager.toast.add({
                        severity: "success",
                        summary: "📋 Prompt Copied",
                        detail: data.prompt.length > 80 ? data.prompt.slice(0, 80) + "..." : data.prompt,
                        life: 3000
                    });
                }
                return copied;
            }
        }
    } catch (e) {
        console.warn("[LeafFlow] Direct prompt fetch failed:", e);
    }
    return false;
}

// 1. Hook into Node Context Menu (Right Click)
app.registerExtension({
    name: "ComfyUI.LeafFlow.CopyPrompt",

    async beforeRegisterNodeDef(nodeType, nodeData) {
        const origGetExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
        nodeType.prototype.getExtraMenuOptions = function (_, options) {
            if (origGetExtraMenuOptions) origGetExtraMenuOptions.apply(this, arguments);

            if (!isCopyEnabled("LeafFlow.3 - 📋 Prompt Actions.02_EnableContextMenuCopyPrompt")) return;

            const imgs = this.imgs || this.images || (this.widgets && this.widgets.filter(w => w.type === "image" || w.name === "image"));
            if (imgs && imgs.length > 0) {
                options.push({
                    content: "📋 Copy Prompt",
                    callback: async () => {
                        const img = imgs[this.imageIndex || 0];
                        const src = typeof img === "string" ? img : (img?.src || img?.value);
                        if (!src) return;
                        const success = await copyImagePrompt(src);
                        if (!success) {
                            if (app.extensionManager?.toast?.add) {
                                app.extensionManager.toast.add({
                                    severity: "warn",
                                    summary: "LeafFlow Copy Prompt",
                                    detail: "Could not extract positive prompt from this image.",
                                    life: 3000
                                });
                            } else {
                                alert("LeafFlow: Could not extract positive prompt from this image.");
                            }
                        }
                    },
                });
            }
        };
    }
});

// 2. Hook into Hover Action Bar over Image Cards in Assets Pane & Canvas Previews ONLY (Strictly Exclude Queue)
function injectHoverCopyAction(overlayBar) {
    if (!overlayBar || overlayBar.querySelector(".leafflow-hover-copy")) return;

    if (!isCopyEnabled("LeafFlow.3 - 📋 Prompt Actions.01_EnableAssetsCopyPromptButton")) return;

    // STRICT EXCLUSION: Never inject inside queue job rows or queue panels
    if (overlayBar.closest("[data-job-id], [data-testid*='queue'], .comfy-queue, .queue-item, .queue-list")) {
        return;
    }

    const iconGroup =
        overlayBar.querySelector(".flex.shrink-0") ||
        overlayBar.querySelector('button[aria-label="Zoom in"]')?.parentElement ||
        overlayBar.querySelector('button[aria-label*="zoom" i]')?.parentElement ||
        overlayBar;

    // Only inject if this is actually an asset card or image preview card (not tiny queue thumbnail)
    const parentCard = overlayBar.closest(
        "div[data-virtual-grid-item], .asset-card, [data-testid='asset-card'], [data-node-id], .lg-node, .comfy-image-preview"
    );
    if (!parentCard) return;

    // Exclude queue items
    if (parentCard.closest("[data-job-id], [data-testid*='queue'], .comfy-queue")) return;

    const img = parentCard.querySelector("img");
    if (!img || !img.src) return;

    // Exclude small icon images
    if (img.classList.contains("size-8") || img.closest(".size-8, .size-10, .h-12")) return;

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

    const moreBtn =
        iconGroup.querySelector('button[aria-label="More options"]') ||
        iconGroup.querySelector('button[aria-label="More"]') ||
        iconGroup.lastElementChild;

    if (moreBtn && moreBtn.parentElement === iconGroup) {
        iconGroup.insertBefore(copyBtn, moreBtn);
    } else {
        iconGroup.appendChild(copyBtn);
    }
}

// Observe DOM mutations to attach the copy button whenever hover overlay bar appears
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Strictly skip queue subtree additions
                    if (node.closest?.("[data-job-id], [data-testid*='queue'], .comfy-queue")) return;

                    const selectors =
                        '[data-testid="asset-card-actions"], .asset-card-overlay, .asset-item-overlay, div[data-virtual-grid-item] .absolute.top-2';
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
