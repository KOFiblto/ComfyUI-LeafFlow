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
        let val;
        if (app.extensionManager?.setting?.get) {
            val = app.extensionManager.setting.get(settingKey);
        }
        if ((val === undefined || val === null || val === "") && app.ui?.settings?.getSettingValue) {
            val = app.ui.settings.getSettingValue(settingKey);
        }
        if (val === undefined || val === null || val === "") {
            return true;
        }
        return val !== false && val !== "false" && val !== 0 && val !== "0";
    } catch (_) {
        return true;
    }
}

/**
 * Client-side binary PNG chunk parser to extract prompt/parameters directly from ArrayBuffer.
 */
async function extractPromptFromImageUrl(imgSrc) {
    try {
        const resp = await fetch(imgSrc);
        if (!resp.ok) return null;
        const arrayBuffer = await resp.arrayBuffer();
        const dataView = new DataView(arrayBuffer);

        // Verify PNG magic header: 0x89504E47 0x0D0A1A0A
        if (dataView.byteLength < 16) return null;
        if (dataView.getUint32(0) !== 0x89504E47 || dataView.getUint32(4) !== 0x0D0A1A0A) {
            return null;
        }

        let offset = 8;
        const textDecoder = new TextDecoder("utf-8");
        const metadata = {};

        while (offset < dataView.byteLength - 8) {
            const length = dataView.getUint32(offset);
            const type = String.fromCharCode(
                dataView.getUint8(offset + 4),
                dataView.getUint8(offset + 5),
                dataView.getUint8(offset + 6),
                dataView.getUint8(offset + 7)
            );

            if (type === "tEXt" || type === "iTXt") {
                const chunkData = new Uint8Array(arrayBuffer, offset + 8, length);
                let nullIndex = 0;
                while (nullIndex < chunkData.length && chunkData[nullIndex] !== 0) nullIndex++;
                const keyword = textDecoder.decode(chunkData.subarray(0, nullIndex));

                let textValue = "";
                if (type === "tEXt") {
                    textValue = textDecoder.decode(chunkData.subarray(nullIndex + 1));
                } else if (type === "iTXt") {
                    const compFlag = chunkData[nullIndex + 1];
                    let textStart = nullIndex + 3;
                    while (textStart < chunkData.length && chunkData[textStart] !== 0) textStart++;
                    textStart++;
                    while (textStart < chunkData.length && chunkData[textStart] !== 0) textStart++;
                    textStart++;
                    if (compFlag === 0) {
                        textValue = textDecoder.decode(chunkData.subarray(textStart));
                    }
                }
                if (keyword && textValue) {
                    metadata[keyword.toLowerCase()] = textValue;
                }
            }
            offset += 12 + length;
        }

        // 1. Check A1111 / WebUI / Forge / Civitai parameters
        if (metadata["parameters"]) {
            const lines = metadata["parameters"].split("\n");
            const pos = [];
            for (const line of lines) {
                if (line.trim().startsWith("Negative prompt:") || line.trim().startsWith("Steps:")) break;
                pos.push(line);
            }
            const res = pos.join("\n").trim();
            if (res) return res;
        }

        // 2. Check native ComfyUI prompt graph JSON
        if (metadata["prompt"]) {
            try {
                const promptData = JSON.parse(metadata["prompt"]);
                if (typeof promptData === "object" && promptData !== null) {
                    const startNodes = [];
                    for (const [nid, ndata] of Object.entries(promptData)) {
                        const ctype = ndata?.class_type || "";
                        const inputs = ndata?.inputs || {};
                        if (ctype.includes("Sampler") || ctype.includes("KSampler") || ctype.includes("Guider") || ctype.includes("CFG")) {
                            for (const linkKey of ["positive", "conditioning", "guider"]) {
                                const link = inputs[linkKey];
                                if (Array.isArray(link) && link.length > 0) {
                                    startNodes.push(String(link[0]));
                                }
                            }
                        }
                    }

                    const visited = new Set();
                    const texts = [];

                    function walk(nid) {
                        if (!nid || visited.has(nid)) return;
                        visited.add(nid);
                        const ndata = promptData[nid];
                        if (!ndata || typeof ndata !== "object") return;
                        const inputs = ndata.inputs || {};

                        for (const tkey of ["text", "prompt", "text_g", "text_l", "text_positive", "positive_prompt", "value", "string"]) {
                            const val = inputs[tkey];
                            if (typeof val === "string" && val.trim()) {
                                const s = val.trim();
                                if (!texts.includes(s)) texts.push(s);
                            } else if (Array.isArray(val) && val.length > 0) {
                                walk(String(val[0]));
                            }
                        }

                        for (const [inName, inVal] of Object.entries(inputs)) {
                            if (Array.isArray(inVal) && inVal.length > 0) {
                                const low = inName.toLowerCase();
                                if (low.includes("negative")) continue;
                                if (["conditioning", "positive", "cond", "text", "prompt", "guider"].some(k => low.includes(k))) {
                                    walk(String(inVal[0]));
                                }
                            }
                        }
                    }

                    for (const sn of startNodes) {
                        walk(sn);
                    }

                    if (texts.length) return texts.join("\n");

                    // Fallback: search all text / prompt nodes
                    for (const [nid, ndata] of Object.entries(promptData)) {
                        const ctype = ndata?.class_type || "";
                        const inputs = ndata?.inputs || {};
                        if (ctype.includes("CLIPTextEncode") || ctype.includes("Text") || ctype.includes("Prompt")) {
                            for (const tkey of ["text", "prompt", "text_g", "text_l"]) {
                                const t = inputs[tkey];
                                if (typeof t === "string" && t.trim().length > 1) {
                                    const s = t.trim();
                                    if (!texts.includes(s)) texts.push(s);
                                }
                            }
                        }
                    }
                    if (texts.length) return texts.join("\n");
                }
            } catch (_) {}
        }
    } catch (e) {
        console.warn("[LeafFlow] Direct PNG metadata extraction failed:", e);
    }
    return null;
}

/**
 * Helper to fetch image metadata and extract the positive prompt text.
 */

async function getImagePromptAndMeta(imgSrc) {
    if (!imgSrc) return null;
    let url = new URL(imgSrc, window.location.origin);
    let filename = url.searchParams.get("filename");
    let type = url.searchParams.get("type") || "output";
    let subfolder = url.searchParams.get("subfolder") || "";

    if (!filename) {
        const parts = url.pathname.split("/");
        filename = decodeURIComponent(parts[parts.length - 1]);
    }

    let promptText = null;
    try {
        promptText = await extractPromptFromImageUrl(imgSrc);
    } catch (_) {}

    if (!promptText && filename) {
        try {
            const promptUrl = `/leafflow/get_image_prompt?filename=${encodeURIComponent(filename)}&type=${encodeURIComponent(type)}&subfolder=${encodeURIComponent(subfolder)}`;
            const response = await api.fetchApi(promptUrl);
            if (response.ok) {
                const data = await response.json();
                if (data && data.prompt) promptText = data.prompt;
            }
        } catch (_) {}
    }

    return {
        promptText: promptText || "",
        filename: filename || "bookmark",
        subfolder: subfolder || "",
        type: type || "output"
    };
}

async function saveImageToPromptBookmarks(imgSrc) {
    const meta = await getImagePromptAndMeta(imgSrc);
    if (!meta) return false;

    const event = new CustomEvent("prompt-bookmarks-create", {
        detail: {
            name: meta.filename.replace(/\.[^/.]+$/, ""),
            text: meta.promptText,
            media: [{
                filename: meta.filename,
                subfolder: meta.subfolder,
                type: meta.type,
                media_type: "image"
            }]
        }
    });
    window.dispatchEvent(event);
    return true;
}

async function copyImagePrompt(imgSrc) {
    if (!imgSrc) return false;
    let promptText = null;

    // 1. Try client-side direct binary extraction first
    try {
        promptText = await extractPromptFromImageUrl(imgSrc);
    } catch (_) {}

    // 2. Fallback to server endpoint
    if (!promptText) {
        try {
            let url = new URL(imgSrc, window.location.origin);
            let filename = url.searchParams.get("filename");
            let type = url.searchParams.get("type") || "output";
            let subfolder = url.searchParams.get("subfolder") || "";

            if (!filename) {
                const parts = url.pathname.split("/");
                filename = decodeURIComponent(parts[parts.length - 1]);
            }

            if (filename) {
                const promptUrl = `/leafflow/get_image_prompt?filename=${encodeURIComponent(filename)}&type=${encodeURIComponent(type)}&subfolder=${encodeURIComponent(subfolder)}`;
                const response = await api.fetchApi(promptUrl);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.prompt) {
                        promptText = data.prompt;
                    }
                }
            }
        } catch (e) {
            console.warn("[LeafFlow] Direct prompt fetch failed:", e);
        }
    }

    if (promptText) {
        const copied = await copyToClipboard(promptText);
        if (copied && app.extensionManager?.toast?.add) {
            app.extensionManager.toast.add({
                severity: "success",
                summary: "📋 Prompt Copied",
                detail: promptText.length > 80 ? promptText.slice(0, 80) + "..." : promptText,
                life: 3000
            });
        }
        return copied;
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

                if (isCopyEnabled("LeafFlow.3 - 📋 Prompt Actions.03_EnableSaveToPromptSaver")) {
                    options.push({
                        content: "🔖 Bookmark in Prompt Saver",
                        callback: async () => {
                            const img = imgs[this.imageIndex || 0];
                            const src = typeof img === "string" ? img : (img?.src || img?.value);
                            if (!src) return;
                            await saveImageToPromptBookmarks(src);
                        },
                    });
                }
            }
        };
    }
});

// 2. Active Interaction Tracking & Image URL Resolution
let lastInteractedAssetCard = null;

function isQueueItemElement(el) {
    if (!el || typeof el.closest !== "function") return false;
    // An asset card is explicitly an asset card in the gallery/history, never a queue job row
    if (el.closest("div[data-virtual-grid-item], [data-asset-id], .asset-card, [data-testid='asset-card']")) {
        return !!el.closest("[data-job-id]");
    }
    return !!el.closest("[data-job-id], .comfy-queue-item, .queue-item, .queue-list-item, .queue-entry");
}

function registerAssetInteraction(target) {
    if (!target) return;
    const card = target.closest?.(
        "div[data-virtual-grid-item], [data-asset-id], .asset-card, [data-testid='asset-card'], [data-node-id], .lg-node, .comfy-image-preview, .group"
    );
    if (card && !isQueueItemElement(card)) {
        lastInteractedAssetCard = card;
    }
}

document.addEventListener("pointerdown", (e) => registerAssetInteraction(e.target), true);
document.addEventListener("click", (e) => registerAssetInteraction(e.target), true);
document.addEventListener("contextmenu", (e) => registerAssetInteraction(e.target), true);

function getActiveImageSrc() {
    // 1. From last clicked / right-clicked / interacted asset card
    if (lastInteractedAssetCard) {
        const img = lastInteractedAssetCard.querySelector("img");
        if (img && img.src) return img.src;
    }
    // 2. From currently selected asset card in DOM
    const selected = document.querySelector(
        'div[data-virtual-grid-item] [data-selected="true"], [data-asset-id][data-selected="true"], .group[data-selected="true"]'
    );
    if (selected) {
        const img = selected.querySelector("img");
        if (img && img.src) return img.src;
    }
    // 3. Any active hover card
    const hovered = document.querySelector("div[data-virtual-grid-item]:hover, .asset-card:hover, .group:hover");
    if (hovered) {
        const img = hovered.querySelector("img");
        if (img && img.src) return img.src;
    }
    return null;
}

// 3. Inject Copy Prompt Directly Next to Download Button on Asset Cards
function injectCopyPromptNextToDownload(downloadBtn) {
    if (!downloadBtn || !downloadBtn.parentElement) return;
    if (downloadBtn.parentElement.querySelector(".leafflow-hover-copy")) return;
    if (!isCopyEnabled("LeafFlow.3 - 📋 Prompt Actions.01_EnableAssetsCopyPromptButton")) return;

    if (isQueueItemElement(downloadBtn)) return;

    const card = downloadBtn.closest(
        "div[data-virtual-grid-item], [data-asset-id], .asset-card, [data-testid='asset-card'], [data-node-id], .lg-node, .comfy-image-preview, .group"
    );
    if (!card) return;
    if (isQueueItemElement(card)) return;

    const img = card.querySelector("img");
    if (!img || !img.src) return;
    if (img.classList.contains("size-8") || img.closest(".size-8, .size-10, .h-12")) return;

    const hasModernIcons = !!(
        downloadBtn.querySelector("[class*='icon-']") ||
        document.querySelector("[class*='icon-[lucide']")
    );

    // Build copy prompt button inheriting matching visual classes from downloadBtn
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.title = "Copy Prompt";
    copyBtn.setAttribute("aria-label", "Copy Prompt");

    let baseClasses = downloadBtn.className
        .replace(/\brounded-[a-z0-9-]+\b/g, "")
        .replace(/\brounded\b/g, "")
        .replace(/\bborder-r\b/g, "")
        .replace(/\bborder-modal-card-badge-border\b/g, "")
        .trim();

    if (!baseClasses || baseClasses.length < 5) {
        baseClasses = "inline-flex items-center justify-center font-medium font-inter transition-colors focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 border border-transparent shadow-xs cursor-pointer bg-modal-card-badge-background text-modal-card-badge-foreground hover:bg-modal-card-badge-background-hover size-8 p-0";
    }

    const hasNext = !!downloadBtn.nextElementSibling;
    const borderClass = hasNext ? "border-r border-modal-card-badge-border" : "";
    const roundClass = hasNext ? "rounded-none" : "rounded-r-lg rounded-l-none";

    copyBtn.className = `leafflow-hover-btn leafflow-hover-copy ${baseClasses} ${roundClass} ${borderClass} shrink-0`;

    if (hasModernIcons) {
        copyBtn.innerHTML = `<i class="icon-[lucide--copy] size-4 pointer-events-none"></i>`;
    } else {
        copyBtn.innerHTML = `<svg class="size-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
    }

    copyBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const activeImg = card.querySelector("img") || img;
        const success = await copyImagePrompt(activeImg.src);
        if (hasModernIcons) {
            copyBtn.innerHTML = success
                ? `<i class="icon-[lucide--check] size-4 text-emerald-600 pointer-events-none"></i>`
                : `<i class="icon-[lucide--x] size-4 text-rose-600 pointer-events-none"></i>`;
            setTimeout(() => {
                copyBtn.innerHTML = `<i class="icon-[lucide--copy] size-4 pointer-events-none"></i>`;
            }, 2000);
        } else {
            copyBtn.innerHTML = success
                ? `<svg class="size-4 text-emerald-600 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
                : `<svg class="size-4 text-rose-600 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
            setTimeout(() => {
                copyBtn.innerHTML = `<svg class="size-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
            }, 2000);
        }
    };

    // Insert directly next to the Download button
    downloadBtn.parentElement.insertBefore(copyBtn, downloadBtn.nextSibling);

    // If bookmark is enabled, insert Bookmark button right next to Copy Prompt
    if (isCopyEnabled("LeafFlow.3 - 📋 Prompt Actions.03_EnableSaveToPromptSaver") && !downloadBtn.parentElement.querySelector(".leafflow-hover-bookmark")) {
        const bookmarkBtn = document.createElement("button");
        bookmarkBtn.type = "button";
        bookmarkBtn.title = "Save to Prompt Bookmarks";
        bookmarkBtn.setAttribute("aria-label", "Save to Prompt Bookmarks");

        const hasNextAfterBookmark = !!copyBtn.nextElementSibling;
        const bBorderClass = hasNextAfterBookmark ? "border-r border-modal-card-badge-border" : "";
        const bRoundClass = hasNextAfterBookmark ? "rounded-none" : "rounded-r-lg rounded-l-none";

        copyBtn.classList.remove("rounded-r-lg");
        copyBtn.classList.add("rounded-none", "border-r", "border-modal-card-badge-border");

        bookmarkBtn.className = `leafflow-hover-btn leafflow-hover-bookmark ${baseClasses} ${bRoundClass} ${bBorderClass} shrink-0`;

        if (hasModernIcons) {
            bookmarkBtn.innerHTML = `<i class="icon-[lucide--bookmark] size-4 pointer-events-none"></i>`;
        } else {
            bookmarkBtn.innerHTML = `<svg class="size-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`;
        }

        bookmarkBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const activeImg = card.querySelector("img") || img;
            const success = await saveImageToPromptBookmarks(activeImg.src);
            if (hasModernIcons) {
                bookmarkBtn.innerHTML = success
                    ? `<i class="icon-[lucide--check] size-4 text-emerald-600 pointer-events-none"></i>`
                    : `<i class="icon-[lucide--x] size-4 text-rose-600 pointer-events-none"></i>`;
                setTimeout(() => {
                    bookmarkBtn.innerHTML = `<i class="icon-[lucide--bookmark] size-4 pointer-events-none"></i>`;
                }, 2000);
            } else {
                bookmarkBtn.innerHTML = success
                    ? `<svg class="size-4 text-emerald-600 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
                    : `<svg class="size-4 text-rose-600 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
                setTimeout(() => {
                    bookmarkBtn.innerHTML = `<svg class="size-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`;
                }, 2000);
            }
        };

        downloadBtn.parentElement.insertBefore(bookmarkBtn, copyBtn.nextSibling);
    }
}

// 4. Inject Copy Prompt into PrimeVue Context Menu Next to Download Item
function injectContextMenuCopy(contextMenu) {
    if (!contextMenu) return;
    if (contextMenu.querySelector(".leafflow-contextmenu-copy")) return;
    if (!isCopyEnabled("LeafFlow.3 - 📋 Prompt Actions.02_EnableContextMenuCopyPrompt")) return;

    let downloadLi = contextMenu.querySelector(
        'li[aria-label="Download"], li[aria-label*="ownload" i], [data-pc-section="item"][aria-label*="ownload" i]'
    );
    if (!downloadLi) {
        const items = contextMenu.querySelectorAll('li, [data-pc-section="item"]');
        for (const item of items) {
            const text = item.textContent?.trim().toLowerCase() || "";
            if (text.includes("download") || item.querySelector('.icon-[lucide--download], [class*="download" i]')) {
                downloadLi = item;
                break;
            }
        }
    }
    if (!downloadLi || !downloadLi.parentElement) return;

    const refBtn = downloadLi.querySelector("button");
    const btnClass = refBtn
        ? refBtn.className
        : "relative inline-flex items-center gap-2 cursor-pointer touch-manipulation whitespace-nowrap appearance-none border-none font-medium font-inter transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 text-secondary-foreground bg-secondary-background hover:bg-secondary-background-hover h-8 rounded-lg p-2 text-xs w-full justify-start p-contextmenu-item-link";

    const hasModernIcons = !!(
        downloadLi.querySelector("[class*='icon-']") ||
        document.querySelector("[class*='icon-[lucide']")
    );

    const copyLi = document.createElement("li");
    copyLi.className = "p-contextmenu-item leafflow-contextmenu-copy";
    copyLi.setAttribute("role", "menuitem");
    copyLi.setAttribute("aria-label", "Copy prompt");
    copyLi.setAttribute("data-pc-section", "item");
    copyLi.setAttribute("data-p-active", "false");
    copyLi.setAttribute("data-p-focused", "false");

    const copyIconHtml = hasModernIcons
        ? `<i class="icon-[lucide--copy] size-4"></i>`
        : `<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;

    copyLi.innerHTML = `
<div class="p-contextmenu-item-content" data-pc-section="itemcontent">
  <button class="${btnClass}" tabindex="-1" data-pc-section="itemlink">
    ${copyIconHtml}
    <span>Copy prompt</span>
  </button>
</div>
`;

    copyLi.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const span = copyLi.querySelector("span");
        const src = getActiveImageSrc();
        if (src) {
            const success = await copyImagePrompt(src);
            if (span) span.textContent = success ? "Copied! ✅" : "Failed to copy ❌";
        } else {
            if (span) span.textContent = "No image found ❌";
        }
        setTimeout(() => {
            contextMenu.style.display = "none";
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        }, 500);
    });

    downloadLi.parentElement.insertBefore(copyLi, downloadLi.nextSibling);

    if (isCopyEnabled("LeafFlow.3 - 📋 Prompt Actions.03_EnableSaveToPromptSaver") && !contextMenu.querySelector(".leafflow-contextmenu-bookmark")) {
        const bookmarkLi = document.createElement("li");
        bookmarkLi.className = "p-contextmenu-item leafflow-contextmenu-bookmark";
        bookmarkLi.setAttribute("role", "menuitem");
        bookmarkLi.setAttribute("aria-label", "Save to prompt bookmarks");
        bookmarkLi.setAttribute("data-pc-section", "item");
        bookmarkLi.setAttribute("data-p-active", "false");
        bookmarkLi.setAttribute("data-p-focused", "false");

        const bIconHtml = hasModernIcons
            ? `<i class="icon-[lucide--bookmark] size-4"></i>`
            : `<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`;

        bookmarkLi.innerHTML = `
<div class="p-contextmenu-item-content" data-pc-section="itemcontent">
  <button class="${btnClass}" tabindex="-1" data-pc-section="itemlink">
    ${bIconHtml}
    <span>Save to prompt bookmarks</span>
  </button>
</div>
`;

        bookmarkLi.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const span = bookmarkLi.querySelector("span");
            const src = getActiveImageSrc();
            if (src) {
                const success = await saveImageToPromptBookmarks(src);
                if (span) span.textContent = success ? "Bookmarked! ✅" : "Failed ❌";
            }
            setTimeout(() => {
                contextMenu.style.display = "none";
                document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
            }, 500);
        });

        downloadLi.parentElement.insertBefore(bookmarkLi, copyLi.nextSibling);
    }
}

// 5. Fallback Hook for Older Frontend Action Bars
function injectHoverCopyAction(overlayBar) {
    if (!overlayBar || overlayBar.querySelector(".leafflow-hover-copy")) return;
    if (!isCopyEnabled("LeafFlow.3 - 📋 Prompt Actions.01_EnableAssetsCopyPromptButton")) return;

    if (isQueueItemElement(overlayBar)) return;

    const downloadBtn = overlayBar.querySelector('button[aria-label="Download"], button[aria-label*="ownload" i]');
    if (downloadBtn) {
        injectCopyPromptNextToDownload(downloadBtn);
        return;
    }

    const iconGroup =
        overlayBar.querySelector(".flex.shrink-0") ||
        overlayBar.querySelector('button[aria-label="Zoom in"]')?.parentElement ||
        overlayBar.querySelector('button[aria-label*="zoom" i]')?.parentElement ||
        overlayBar;

    const parentCard = overlayBar.closest(
        "div[data-virtual-grid-item], .asset-card, [data-testid='asset-card'], [data-node-id], .lg-node, .comfy-image-preview"
    );
    if (!parentCard) return;
    if (isQueueItemElement(parentCard)) return;

    const img = parentCard.querySelector("img");
    if (!img || !img.src) return;
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

// 6. Active Scanner for Dynamic Virtual Grid & Context Menus
function scanAndInject() {
    const downloadBtns = document.querySelectorAll(
        'button[aria-label="Download"], button[aria-label*="ownload" i]'
    );
    downloadBtns.forEach(injectCopyPromptNextToDownload);

    const menus = document.querySelectorAll('.p-contextmenu, .p-menu, .p-tieredmenu, [data-pc-name="contextmenu"], [data-pc-name="menu"], [data-pc-name="tieredmenu"]');
    menus.forEach(injectContextMenuCopy);

    const olderOverlays = document.querySelectorAll(
        '[data-testid="asset-card-actions"], .asset-card-overlay, .asset-item-overlay'
    );
    olderOverlays.forEach(injectHoverCopyAction);
}

// Delegated hover listener for instant injection during virtual scrolling
document.addEventListener("pointerover", (e) => {
    const btn = e.target.closest?.('button[aria-label="Download"], button[aria-label*="ownload" i]');
    if (btn) {
        injectCopyPromptNextToDownload(btn);
        return;
    }
    const card = e.target.closest?.('div[data-virtual-grid-item], [data-asset-id], .asset-card, .group');
    if (card) {
        registerAssetInteraction(card);
        const cardDl = card.querySelector('button[aria-label="Download"], button[aria-label*="ownload" i]');
        if (cardDl) injectCopyPromptNextToDownload(cardDl);
    }
    const menu = e.target.closest?.('.p-contextmenu, .p-menu, .p-tieredmenu, [data-pc-name="contextmenu"], [data-pc-name="menu"], [data-pc-name="tieredmenu"]');
    if (menu) {
        injectContextMenuCopy(menu);
    }
}, { passive: true });

// MutationObserver for DOM changes
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === "childList") {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (isQueueItemElement(node)) continue;

                    if (node.matches?.('button[aria-label="Download"], button[aria-label*="ownload" i]')) {
                        injectCopyPromptNextToDownload(node);
                    } else if (node.matches?.('.p-contextmenu, .p-menu, .p-tieredmenu, [data-pc-name="contextmenu"], [data-pc-name="menu"], [data-pc-name="tieredmenu"]')) {
                        injectContextMenuCopy(node);
                    } else if (node.matches?.('[data-testid="asset-card-actions"], .asset-card-overlay, .asset-item-overlay')) {
                        injectHoverCopyAction(node);
                    } else if (node.querySelectorAll) {
                        const dlBtns = node.querySelectorAll('button[aria-label="Download"], button[aria-label*="ownload" i]');
                        dlBtns.forEach(injectCopyPromptNextToDownload);

                        const ctxMenus = node.querySelectorAll('.p-contextmenu, .p-menu, .p-tieredmenu, [data-pc-name="contextmenu"], [data-pc-name="menu"], [data-pc-name="tieredmenu"]');
                        ctxMenus.forEach(injectContextMenuCopy);

                        const overlays = node.querySelectorAll('[data-testid="asset-card-actions"], .asset-card-overlay, .asset-item-overlay');
                        overlays.forEach(injectHoverCopyAction);
                    }
                }
            }
        }
    }
});
observer.observe(document.body, { childList: true, subtree: true });

// Run scanner immediately, on DOM ready, and periodic sweep
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scanAndInject);
} else {
    scanAndInject();
}
setInterval(scanAndInject, 500);


