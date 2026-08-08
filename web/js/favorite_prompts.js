import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

async function saveToFavorites(imgSrc, subcategory = "Default", custom_name = "") {
    if (!imgSrc) return;
    
    let url;
    try {
        url = new URL(imgSrc, window.location.origin);
    } catch (e) {
        return;
    }

    let filename = url.searchParams.get("filename");
    let type = url.searchParams.get("type");
    let subfolder = url.searchParams.get("subfolder") || "";

    if (!filename) {
        alert("FlowControl: Could not resolve image filename to save.");
        return;
    }

    const favFolder = app.ui.settings.getSettingValue("FlowControl.FavoritesFolder", "output/favorites");
    try {
        const response = await api.fetchApi(`/flowcontrol/save_favorite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename, type, subfolder, subcategory, custom_name, dest_folder: favFolder })
        });
        const res = await response.json();
        
        if (res.success) {
            console.log(`[FlowControl] Saved Favorite to ${res.dest}`);
            return true;
        } else {
            alert("Failed to save favorite: " + res.error);
            return false;
        }
    } catch (e) {
        alert("Error saving favorite: " + e);
        return false;
    }
}

async function copyImagePrompt(imgSrc) {
    if (!imgSrc) return false;
    let url;
    try { url = new URL(imgSrc, window.location.origin); } catch (e) { return false; }
    
    let filename = url.searchParams.get("filename");
    let type = url.searchParams.get("type") || "temp";
    let subfolder = url.searchParams.get("subfolder") || "";
    
    if (!filename) return false;
    
    try {
        const response = await api.fetchApi(`/flowcontrol/get_image_prompt?filename=${encodeURIComponent(filename)}&type=${encodeURIComponent(type)}&subfolder=${encodeURIComponent(subfolder)}`);
        const res = await response.json();
        if (res.success && res.prompt) {
            await navigator.clipboard.writeText(res.prompt);
            return true;
        }
    } catch(e) {
        console.error(e);
    }
    return false;
}

async function promptForFavoriteDetails(defaultCategory = "", defaultName = "") {
    return new Promise((resolve) => {
        const favFolder = app.ui.settings.getSettingValue("FlowControl.FavoritesFolder", "output/favorites");
        api.fetchApi(`/image_loader/get_images?folder=${encodeURIComponent(favFolder)}`)
           .then(r => r.json())
           .then(data => {
                const categories = new Set();
                (data.names || []).forEach(p => {
                    const parts = p.split("/");
                    if (parts.length > 1) {
                        categories.add(parts.slice(0, -1).join("/"));
                    }
                });
                
                const dialog = document.createElement("dialog");
                dialog.style.padding = "24px";
                dialog.style.borderRadius = "12px";
                dialog.style.background = "#1e1e24";
                dialog.style.color = "#eee";
                dialog.style.border = "1px solid #333";
                dialog.style.boxShadow = "0 10px 25px rgba(0,0,0,0.5)";
                dialog.style.fontFamily = "Inter, sans-serif";
                dialog.style.minWidth = "320px";
                
                const title = document.createElement("h3");
                title.innerText = "🍃 Save to Favorites";
                title.style.marginTop = "0";
                title.style.marginBottom = "24px";
                title.style.fontWeight = "600";
                dialog.appendChild(title);
                
                const labelCat = document.createElement("label");
                labelCat.innerText = "Category / Subfolder (Empty = Root):";
                labelCat.style.display = "block";
                labelCat.style.marginBottom = "6px";
                labelCat.style.fontSize = "13px";
                labelCat.style.color = "#bbb";
                dialog.appendChild(labelCat);
                
                const selectCat = document.createElement("select");
                selectCat.style.width = "100%";
                selectCat.style.padding = "10px 12px";
                selectCat.style.background = "#141418";
                selectCat.style.border = "1px solid #444";
                selectCat.style.color = "#eee";
                selectCat.style.marginBottom = "12px";
                selectCat.style.borderRadius = "8px";
                selectCat.style.boxSizing = "border-box";
                selectCat.style.outline = "none";
                selectCat.onfocus = () => selectCat.style.borderColor = "#007acc";
                selectCat.onblur = () => selectCat.style.borderColor = "#444";
                
                if(categories.size === 0) {
                    const defaultOpt = document.createElement("option");
                    defaultOpt.value = "";
                    defaultOpt.innerText = "(No existing categories)";
                    selectCat.appendChild(defaultOpt);
                }
                
                categories.forEach(cat => {
                    const opt = document.createElement("option");
                    opt.value = cat;
                    opt.innerText = cat;
                    selectCat.appendChild(opt);
                });
                
                const newOpt = document.createElement("option");
                newOpt.value = "__NEW__";
                newOpt.innerText = "+ Create New Category...";
                selectCat.appendChild(newOpt);
                
                if (categories.has(defaultCategory) && defaultCategory !== "") {
                    selectCat.value = defaultCategory;
                } else if (categories.size > 0) {
                    selectCat.value = Array.from(categories)[0];
                }
                
                dialog.appendChild(selectCat);
                
                const inputNewCat = document.createElement("input");
                inputNewCat.type = "text";
                inputNewCat.placeholder = "Enter new category name...";
                inputNewCat.style.width = "100%";
                inputNewCat.style.padding = "10px 12px";
                inputNewCat.style.background = "#141418";
                inputNewCat.style.border = "1px solid #444";
                inputNewCat.style.color = "#eee";
                inputNewCat.style.marginBottom = "18px";
                inputNewCat.style.borderRadius = "8px";
                inputNewCat.style.boxSizing = "border-box";
                inputNewCat.style.outline = "none";
                inputNewCat.style.display = "none";
                inputNewCat.onfocus = () => inputNewCat.style.borderColor = "#007acc";
                inputNewCat.onblur = () => inputNewCat.style.borderColor = "#444";
                dialog.appendChild(inputNewCat);
                
                selectCat.onchange = () => {
                    if (selectCat.value === "__NEW__") {
                        inputNewCat.style.display = "block";
                        inputNewCat.focus();
                    } else {
                        inputNewCat.style.display = "none";
                    }
                };
                
                const labelName = document.createElement("label");
                labelName.innerText = "Image Name:";
                labelName.style.display = "block";
                labelName.style.marginBottom = "6px";
                labelName.style.fontSize = "13px";
                labelName.style.color = "#bbb";
                dialog.appendChild(labelName);
                
                const inputName = document.createElement("input");
                inputName.type = "text";
                inputName.value = defaultName;
                inputName.placeholder = "Image Name";
                inputName.style.width = "100%";
                inputName.style.padding = "10px 12px";
                inputName.style.background = "#141418";
                inputName.style.border = "1px solid #444";
                inputName.style.color = "#eee";
                inputName.style.marginBottom = "24px";
                inputName.style.borderRadius = "8px";
                inputName.style.boxSizing = "border-box";
                inputName.style.outline = "none";
                inputName.onfocus = () => inputName.style.borderColor = "#007acc";
                inputName.onblur = () => inputName.style.borderColor = "#444";
                dialog.appendChild(inputName);
                
                const btnContainer = document.createElement("div");
                btnContainer.style.display = "flex";
                btnContainer.style.justifyContent = "flex-end";
                btnContainer.style.gap = "12px";
                
                const cancelBtn = document.createElement("button");
                cancelBtn.innerText = "Cancel";
                cancelBtn.style.padding = "8px 18px";
                cancelBtn.style.background = "#333";
                cancelBtn.style.color = "#fff";
                cancelBtn.style.border = "none";
                cancelBtn.style.borderRadius = "8px";
                cancelBtn.style.cursor = "pointer";
                cancelBtn.style.fontWeight = "500";
                cancelBtn.onmouseover = () => cancelBtn.style.background = "#444";
                cancelBtn.onmouseout = () => cancelBtn.style.background = "#333";
                cancelBtn.onclick = () => { dialog.close(); resolve(null); dialog.remove(); };
                
                const saveBtn = document.createElement("button");
                saveBtn.innerText = "Save to Favorites";
                saveBtn.style.padding = "8px 18px";
                saveBtn.style.background = "#2b7d2b";
                saveBtn.style.color = "#fff";
                saveBtn.style.border = "none";
                saveBtn.style.borderRadius = "8px";
                saveBtn.style.cursor = "pointer";
                saveBtn.style.fontWeight = "500";
                saveBtn.onmouseover = () => saveBtn.style.background = "#359635";
                saveBtn.onmouseout = () => saveBtn.style.background = "#2b7d2b";
                saveBtn.onclick = () => { 
                    let finalCat = selectCat.value;
                    if (finalCat === "__NEW__") finalCat = inputNewCat.value;
                    dialog.close(); 
                    resolve({subcategory: finalCat, custom_name: inputName.value}); 
                    dialog.remove(); 
                };
                
                btnContainer.appendChild(cancelBtn);
                btnContainer.appendChild(saveBtn);
                dialog.appendChild(btnContainer);
                
                document.body.appendChild(dialog);
                dialog.showModal();
                selectCat.focus();
            }).catch(e => {
                console.error("[FlowControl] Error fetching favorites folder data:", e);
                alert("FlowControl: Error fetching favorites folder. Check your FlowControl Favorites Folder setting or console logs.");
                resolve(null);
            });
    });
}

// Register settings
app.ui.settings.addSetting({
    id: "FlowControl.FavoritesFolder",
    name: "🍃 FlowControl Favorites Folder",
    type: "text",
    defaultValue: "output/favorites",
    tooltip: "Path to store and load favorite prompts. Relative to ComfyUI directory, or absolute.",
});

// 1. Hook into Node Context Menu (Right Click on Canvas Nodes)
app.registerExtension({
    name: "ComfyUI.FlowControl.FavoritePrompts",
    
    async beforeRegisterNodeDef(nodeType, nodeData) {
        const origGetExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
        nodeType.prototype.getExtraMenuOptions = function(_, options) {
            if (origGetExtraMenuOptions) origGetExtraMenuOptions.apply(this, arguments);
            
            if (this.imgs && this.imgs.length > 0) {
                options.push({
                    content: "🍃 Save to Favorites",
                    callback: async () => {
                        let img = this.imgs[this.imageIndex || 0];
                        if (!img || !img.src) return;
                        
                        let url = new URL(img.src, window.location.origin);
                        let filename = url.searchParams.get("filename") || "";
                        let defaultName = filename.replace(/\.[^/.]+$/, "");
                        
                        const details = await promptForFavoriteDetails("", defaultName);
                        if (!details) return;
                        
                        saveToFavorites(img.src, details.subcategory, details.custom_name).then(success => {
                            if (success) alert(`Saved to Favorites -> ${details.subcategory || 'Root'}!`);
                        });
                    }
                });
                options.push({
                    content: "📋 Copy Prompt",
                    callback: async () => {
                        let img = this.imgs[this.imageIndex || 0];
                        if (!img || !img.src) return;
                        const success = await copyImagePrompt(img.src);
                        if (success) alert("Prompt copied to clipboard!");
                        else alert("Failed to copy prompt.");
                    }
                });
            }
        };

        if (nodeData.name === "SaveFavoritePreview") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                
                const saveBtn = this.addWidget("button", "🍃 Save Active to Favorites", "save", async () => {
                    if (!this.imgs || this.imgs.length === 0) {
                        alert("No image to save yet!");
                        return;
                    }
                    
                    let img = this.imgs[this.imageIndex || 0];
                    let url = new URL(img.src, window.location.origin);
                    let filename = url.searchParams.get("filename") || "";
                    let defaultName = filename.replace(/\.[^/.]+$/, "");
                    
                    const details = await promptForFavoriteDetails("", defaultName);
                    if (!details) return;
                    
                    saveToFavorites(img.src, details.subcategory, details.custom_name).then(success => {
                        if (success) {
                            saveBtn.name = "✅ Saved!";
                            setTimeout(() => saveBtn.name = "🍃 Save Active to Favorites", 2000);
                            app.graph.setDirtyCanvas(true, true);
                        }
                    });
                });
            };
        }
    }
});

// --- 2. Hook into Standard Top Hover Action Bar (White Popup Hover Menu over Asset/Preview Images) ---
function injectHoverOverlayActions(overlayBar) {
    if (!overlayBar || overlayBar.querySelector(".flowcontrol-hover-fav")) return;
    
    // Locate the white icon group container (div.flex.shrink-0) inside the overlay
    const iconGroup = overlayBar.querySelector('.flex.shrink-0') || 
                      overlayBar.querySelector('button[aria-label="Zoom in"]')?.parentElement ||
                      overlayBar;

    // Locate parent image card or asset item container
    const parentCard = overlayBar.closest('div[data-virtual-grid-item], .asset-card, [data-node-id], .lg-node, div.relative');
    const img = parentCard ? parentCard.querySelector("img") : overlayBar.parentElement?.querySelector("img");
    if (!img || !img.src) return;

    // Find the 'More options' button (3-dots ellipsis) to insert before it
    const moreBtn = iconGroup.querySelector('button[aria-label="More options"]') ||
                    iconGroup.querySelector('button[aria-label="More"]') ||
                    iconGroup.lastElementChild;

    const baseBtnClass = "flowcontrol-hover-btn relative inline-flex items-center justify-center gap-1 cursor-pointer touch-manipulation whitespace-nowrap appearance-none border-none text-xs font-medium font-inter transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-white text-gray-700 hover:bg-gray-100 h-8 px-2 rounded-none pointer-events-auto border-r border-gray-100";

    // 1. Save to Favorites Button
    const favBtn = document.createElement("button");
    favBtn.className = baseBtnClass + " flowcontrol-hover-fav";
    favBtn.title = "Save to Favorites";
    favBtn.innerHTML = "<span>🍃 Favorites</span>";
    favBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        let url = new URL(img.src, window.location.origin);
        let filename = url.searchParams.get("filename") || "";
        let defaultName = filename.replace(/\.[^/.]+$/, "");
        
        const details = await promptForFavoriteDetails("", defaultName);
        if (details) {
            saveToFavorites(img.src, details.subcategory, details.custom_name).then(success => {
                if (success) {
                    favBtn.innerHTML = "<span>✅ Saved!</span>";
                    setTimeout(() => favBtn.innerHTML = "<span>🍃 Favorites</span>", 2000);
                }
            });
        }
    };

    // 2. Copy Prompt Button
    const copyBtn = document.createElement("button");
    copyBtn.className = baseBtnClass + " flowcontrol-hover-copy";
    copyBtn.title = "Copy Prompt";
    copyBtn.innerHTML = "<span>📋 Copy Prompt</span>";
    copyBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        copyImagePrompt(img.src).then(success => {
            if (success) {
                copyBtn.innerHTML = "<span>✅ Copied!</span>";
                setTimeout(() => copyBtn.innerHTML = "<span>📋 Copy Prompt</span>", 2000);
            }
        });
    };

    // Insert between Zoom in and More options inside the white button group
    if (moreBtn && moreBtn.parentElement === iconGroup) {
        iconGroup.insertBefore(favBtn, moreBtn);
        iconGroup.insertBefore(copyBtn, moreBtn);
    } else {
        iconGroup.appendChild(favBtn);
        iconGroup.appendChild(copyBtn);
    }
}

// Observe DOM mutations to attach buttons whenever a top hover overlay bar appears over an image
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === "childList") {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Target top hover overlay bars (e.g. .absolute.top-2, .asset-card-overlay, .hover-overlay)
                    const selectors = '.absolute.top-2, .absolute.top-1, .asset-card-overlay, [data-testid="asset-card-actions"]';
                    if (node.matches?.(selectors)) {
                        injectHoverOverlayActions(node);
                    } else if (node.querySelectorAll) {
                        const overlays = node.querySelectorAll(selectors);
                        overlays.forEach(overlay => injectHoverOverlayActions(overlay));
                    }
                }
            });
        }
    }
});
observer.observe(document.body, { childList: true, subtree: true });
