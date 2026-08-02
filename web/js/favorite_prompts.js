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
            // Optional: Native OS notification or Comfy UI toast
            console.log(`[FlowControl] Saved Favorite to ${res.dest}`);
            
            // Highlight the button momentarily green if triggered via DOM
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

async function loadWorkflowFromImage(imgSrc) {
    if (!imgSrc) return false;
    let url;
    try { url = new URL(imgSrc, window.location.origin); } catch (e) { return false; }
    
    let filename = url.searchParams.get("filename");
    if (!filename) return false;
    
    try {
        const response = await fetch(imgSrc);
        const blob = await response.blob();
        const file = new File([blob], filename, { type: blob.type });
        if (app.handleFile) {
            await app.handleFile(file);
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
               
               // Optional: an empty category that acts as root. We won't show it if they want to hide "root".
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
                   // default to the first one instead of empty root
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

// 1. Hook into Node Context Menu (Right Click)
app.registerExtension({
    name: "ComfyUI.FlowControl.FavoritePrompts",
    
    async beforeRegisterNodeDef(nodeType, nodeData) {
        // --- 1. Right Click Context Menu (Applies to ALL nodes with images) ---
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
                        let defaultName = filename.replace(/\.[^/.]+$/, ""); // strip extension
                        
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

        // --- 2. Custom Node Native Button ---
        if (nodeData.name === "SaveFavoritePreview") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                
                // Add the star button directly onto the node widgets
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

// --- 3. Hook into V2 Assets Pane UI ---
// Uses a global MutationObserver to watch for the Vue DOM overlay
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === "childList") {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    
                    // The user specified looking for "Inspect" and "More" buttons.
                    // Let's find any container with buttons to inject our Star
                    if (node.tagName === "BUTTON" || node.querySelector("button") || node.tagName === "DIV") {
                        injectAssetsStarButton();
                    }
                }
            });
        }
    }
});
observer.observe(document.body, { childList: true, subtree: true });

function injectAssetsStarButton() {
    // We want to avoid injecting multiple times.
    // In Vue, buttons might be recreated frequently.
    
    // Find containers that hold the "Inspect" and "More" buttons.
    // They usually have a class like 'flex', 'gap-2', etc. inside an asset panel.
    const allButtons = document.querySelectorAll("button");
    let targetContainer = null;
    let inspectBtn = null;
    let moreBtn = null;
    
    for (const btn of allButtons) {
        const text = (btn.innerText || btn.textContent || "").trim();
        const ariaLabel = btn.getAttribute("aria-label") || "";
        
        if (text === "Inspect" || ariaLabel === "Zoom in") inspectBtn = btn;
        if (text === "More" || ariaLabel === "More options") moreBtn = btn;
        
        if (inspectBtn && moreBtn && inspectBtn.parentElement === moreBtn.parentElement) {
            targetContainer = inspectBtn.parentElement;
            // Only inject if it hasn't been injected yet
            if (!targetContainer.querySelector(".flowcontrol-star-btn")) {
                break;
            } else {
                // Keep looking if we already injected in this container (multiple might exist on screen)
                inspectBtn = null;
                moreBtn = null;
                targetContainer = null;
            }
        }
    }
    
    if (targetContainer) {
        const starBtn = document.createElement("button");
        starBtn.className = inspectBtn.className + " flowcontrol-star-btn"; // Steal classes for exact styling match
        
        // Use a <span> for the text to match whatever internal structure Vue might use, or just direct text
        // If it's the icon-only menu, we just use the icon
        if (inspectBtn.getAttribute("aria-label") === "Zoom in") {
            starBtn.innerHTML = "🍃";
            starBtn.setAttribute("aria-label", "Save to Favorites");
            starBtn.title = "Save to Favorites";
        } else {
            starBtn.innerHTML = "<span>🍃 Star</span>";
        }
        
        starBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // To find the image source, we look for the nearest image.
            // Often, this button overlay is a sibling or child of the image container.
            let container = targetContainer;
            let img = null;
            
            // Walk up until we find an element containing an img
            while (container && container !== document.body) {
                const found = container.querySelector("img");
                if (found && found.src && found.src.includes("filename=")) {
                    img = found;
                    break;
                }
                
                // If it's a sibling structure, check previous siblings
                if (container.previousElementSibling && container.previousElementSibling.tagName === "IMG") {
                    img = container.previousElementSibling;
                    break;
                }
                
                container = container.parentElement;
            }
            
            if (img) {
                let url = new URL(img.src, window.location.origin);
                let filename = url.searchParams.get("filename") || "";
                let defaultName = filename.replace(/\.[^/.]+$/, "");
                
                const details = await promptForFavoriteDetails("", defaultName);
                if (details) {
                    saveToFavorites(img.src, details.subcategory, details.custom_name).then(success => {
                        if (success) {
                            starBtn.innerHTML = "<span>✅ Saved</span>";
                            setTimeout(() => starBtn.innerHTML = "<span>🍃 Star</span>", 2000);
                        }
                    });
                }
            } else {
                alert("FlowControl: Could not locate the image source in the DOM.");
            }
        };
        
        const copyBtn = document.createElement("button");
        copyBtn.className = inspectBtn.className + " flowcontrol-copy-btn";
        if (inspectBtn.getAttribute("aria-label") === "Zoom in") {
            copyBtn.innerHTML = "🍃";
            copyBtn.setAttribute("aria-label", "Copy Prompt");
            copyBtn.title = "Copy Prompt";
        } else {
            copyBtn.innerHTML = "<span>🍃 Copy</span>";
        }
        
        copyBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            let container = targetContainer;
            let img = null;
            while (container && container !== document.body) {
                const found = container.querySelector("img");
                if (found && found.src && found.src.includes("filename=")) { img = found; break; }
                if (container.previousElementSibling && container.previousElementSibling.tagName === "IMG") { img = container.previousElementSibling; break; }
                container = container.parentElement;
            }
            if (img) {
                copyImagePrompt(img.src).then(success => {
                    if (success) {
                        const oldText = copyBtn.innerHTML;
                        copyBtn.innerHTML = inspectBtn.getAttribute("aria-label") === "Zoom in" ? "✅" : "<span>✅ Copied</span>";
                        setTimeout(() => copyBtn.innerHTML = oldText, 2000);
                    }
                });
            }
        };
        
        // Insert buttons
        targetContainer.insertBefore(copyBtn, moreBtn);
        targetContainer.insertBefore(starBtn, copyBtn);
    }

    // 2. Inject into Asset Grid Items directly (for the main assets pane)
    const gridItems = document.querySelectorAll('div[data-virtual-grid-item]');
    gridItems.forEach(item => {
        if (item.querySelector('.flowcontrol-grid-star')) return;
        
        // Find the bottom right container that holds the layers/outputs button
        const bottomRow = item.querySelector('.flex.items-end.justify-between');
        const shrinkContainer = bottomRow ? bottomRow.querySelector('.shrink-0') : null;
        
        if (shrinkContainer) {
            const img = item.querySelector('img');
            if (!img || !img.src) return;
            
            const existingBtn = shrinkContainer.querySelector('button');
            const btnClass = existingBtn ? existingBtn.className : "relative inline-flex items-center justify-center gap-2 cursor-pointer appearance-none border-none font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-secondary-foreground bg-secondary-background hover:bg-secondary-background-hover h-8 rounded-lg p-2 text-xs";
            
            const starBtn = document.createElement("button");
            starBtn.className = btnClass + " flowcontrol-grid-star";
            starBtn.innerHTML = "<span>🍃</span>";
            starBtn.title = "Save to Favorites";
            
            const copyBtn = document.createElement("button");
            copyBtn.className = btnClass + " flowcontrol-grid-copy";
            copyBtn.innerHTML = "<span>🍃</span>";
            copyBtn.title = "Copy Prompt";
            
            shrinkContainer.style.display = "flex";
            shrinkContainer.style.gap = "4px";
            shrinkContainer.style.flexDirection = "row";
            shrinkContainer.style.alignItems = "center";
            
            starBtn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                let url = new URL(img.src, window.location.origin);
                let filename = url.searchParams.get("filename") || "";
                let defaultName = filename.replace(/\.[^/.]+$/, "");
                
                const details = await promptForFavoriteDetails("", defaultName);
                if (details) {
                    saveToFavorites(img.src, details.subcategory, details.custom_name).then(success => {
                        if (success) {
                            starBtn.innerHTML = "<span>✅</span>";
                            setTimeout(() => starBtn.innerHTML = "<span>🍃</span>", 2000);
                        }
                    });
                }
            };
            
            copyBtn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (await copyImagePrompt(img.src)) {
                    copyBtn.innerHTML = "<span>✅</span>";
                    setTimeout(() => copyBtn.innerHTML = "<span>🍃</span>", 2000);
                }
            };
            
            shrinkContainer.insertBefore(starBtn, shrinkContainer.firstChild);
            shrinkContainer.insertBefore(copyBtn, shrinkContainer.firstChild);
        }
    });
}
