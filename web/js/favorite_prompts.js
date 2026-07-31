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

    try {
        const response = await api.fetchApi(`/flowcontrol/save_favorite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename, type, subfolder, subcategory, custom_name })
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

async function promptForFavoriteDetails(defaultCategory = "Default") {
    return new Promise((resolve) => {
        api.fetchApi('/image_loader/get_images?folder=favorites')
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
               dialog.style.padding = "20px";
               dialog.style.borderRadius = "8px";
               dialog.style.background = "#222";
               dialog.style.color = "#eee";
               dialog.style.border = "1px solid #444";
               dialog.style.fontFamily = "Inter, sans-serif";
               dialog.style.minWidth = "300px";
               
               const title = document.createElement("h3");
               title.innerText = "🍃 Save to Favorites";
               title.style.marginTop = "0";
               title.style.marginBottom = "20px";
               dialog.appendChild(title);
               
               const labelCat = document.createElement("label");
               labelCat.innerText = "Category / Subfolder:";
               labelCat.style.display = "block";
               labelCat.style.marginBottom = "5px";
               labelCat.style.fontSize = "12px";
               dialog.appendChild(labelCat);
               
               const inputCat = document.createElement("input");
               inputCat.type = "text";
               inputCat.value = defaultCategory;
               inputCat.setAttribute("list", "flowcontrol-categories");
               inputCat.style.width = "100%";
               inputCat.style.padding = "8px";
               inputCat.style.background = "#111";
               inputCat.style.border = "1px solid #444";
               inputCat.style.color = "#eee";
               inputCat.style.marginBottom = "15px";
               inputCat.style.borderRadius = "4px";
               inputCat.style.boxSizing = "border-box";
               dialog.appendChild(inputCat);
               
               const datalist = document.createElement("datalist");
               datalist.id = "flowcontrol-categories";
               categories.forEach(cat => {
                   const opt = document.createElement("option");
                   opt.value = cat;
                   datalist.appendChild(opt);
               });
               dialog.appendChild(datalist);
               
               const labelName = document.createElement("label");
               labelName.innerText = "Custom Name (Optional):";
               labelName.style.display = "block";
               labelName.style.marginBottom = "5px";
               labelName.style.fontSize = "12px";
               dialog.appendChild(labelName);
               
               const inputName = document.createElement("input");
               inputName.type = "text";
               inputName.placeholder = "Leave blank for original name";
               inputName.style.width = "100%";
               inputName.style.padding = "8px";
               inputName.style.background = "#111";
               inputName.style.border = "1px solid #444";
               inputName.style.color = "#eee";
               inputName.style.marginBottom = "20px";
               inputName.style.borderRadius = "4px";
               inputName.style.boxSizing = "border-box";
               dialog.appendChild(inputName);
               
               const btnContainer = document.createElement("div");
               btnContainer.style.display = "flex";
               btnContainer.style.justifyContent = "flex-end";
               btnContainer.style.gap = "10px";
               
               const cancelBtn = document.createElement("button");
               cancelBtn.innerText = "Cancel";
               cancelBtn.style.padding = "8px 16px";
               cancelBtn.style.background = "#444";
               cancelBtn.style.color = "#fff";
               cancelBtn.style.border = "none";
               cancelBtn.style.borderRadius = "4px";
               cancelBtn.style.cursor = "pointer";
               cancelBtn.onclick = () => { dialog.close(); resolve(null); dialog.remove(); };
               
               const saveBtn = document.createElement("button");
               saveBtn.innerText = "Save";
               saveBtn.style.padding = "8px 16px";
               saveBtn.style.background = "#308530";
               saveBtn.style.color = "#fff";
               saveBtn.style.border = "none";
               saveBtn.style.borderRadius = "4px";
               saveBtn.style.cursor = "pointer";
               saveBtn.onclick = () => { dialog.close(); resolve({subcategory: inputCat.value, custom_name: inputName.value}); dialog.remove(); };
               
               btnContainer.appendChild(cancelBtn);
               btnContainer.appendChild(saveBtn);
               dialog.appendChild(btnContainer);
               
               document.body.appendChild(dialog);
               dialog.showModal();
               inputCat.focus();
           }).catch(e => {
               const subcategory = prompt("Enter subcategory:", defaultCategory);
               if (subcategory) resolve({subcategory, custom_name: ""});
               else resolve(null);
           });
    });
}

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
                        const details = await promptForFavoriteDetails("Default");
                        if (!details || !details.subcategory) return;
                        
                        let img = this.imgs[this.imageIndex || 0];
                        // Also update saveToFavorites to accept custom_name
                        saveToFavorites(img.src, details.subcategory, details.custom_name).then(success => {
                            if (success) alert(`Saved to Favorites -> ${details.subcategory}!`);
                        });
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
                    
                    const details = await promptForFavoriteDetails("Default");
                    if (!details || !details.subcategory) return;
                    
                    let img = this.imgs[this.imageIndex || 0];
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
        if (text === "Inspect") inspectBtn = btn;
        if (text === "More") moreBtn = btn;
        
        if (inspectBtn && moreBtn && inspectBtn.parentElement === moreBtn.parentElement) {
            targetContainer = inspectBtn.parentElement;
            break;
        }
    }
    
    if (targetContainer && !targetContainer.querySelector(".flowcontrol-star-btn")) {
        const starBtn = document.createElement("button");
        starBtn.className = inspectBtn.className + " flowcontrol-star-btn"; // Steal classes for exact styling match
        
        // Use a <span> for the text to match whatever internal structure Vue might use, or just direct text
        starBtn.innerHTML = "<span>🍃 Star</span>";
        
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
                const details = await promptForFavoriteDetails("Default");
                if (details && details.subcategory) {
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
        
        // Insert between Inspect and More
        targetContainer.insertBefore(starBtn, moreBtn);
    }

    // 2. Inject into Asset Grid Items directly (for the main assets pane)
    const gridItems = document.querySelectorAll('div[data-virtual-grid-item]');
    gridItems.forEach(item => {
        if (item.querySelector('.flowcontrol-grid-star')) return;
        
        const shrinkContainer = item.querySelector('.shrink-0');
        if (shrinkContainer) {
            const img = item.querySelector('img');
            if (!img || !img.src) return;
            
            const existingBtn = shrinkContainer.querySelector('button');
            const btnClass = existingBtn ? existingBtn.className : "relative inline-flex items-center justify-center gap-2 cursor-pointer appearance-none border-none font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-secondary-foreground bg-secondary-background hover:bg-secondary-background-hover h-8 rounded-lg p-2 text-xs";
            
            const starBtn = document.createElement("button");
            starBtn.className = btnClass + " flowcontrol-grid-star";
            starBtn.innerHTML = "<span>🍃</span>";
            starBtn.title = "Save to Favorites";
            
            shrinkContainer.style.display = "flex";
            shrinkContainer.style.gap = "4px";
            shrinkContainer.style.flexDirection = "row";
            shrinkContainer.style.alignItems = "center";
            
            starBtn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const details = await promptForFavoriteDetails("Default");
                if (details && details.subcategory) {
                    saveToFavorites(img.src, details.subcategory, details.custom_name).then(success => {
                        if (success) {
                            starBtn.innerHTML = "<span>✅</span>";
                            setTimeout(() => starBtn.innerHTML = "<span>🍃</span>", 2000);
                        }
                    });
                }
            };
            
            shrinkContainer.insertBefore(starBtn, shrinkContainer.firstChild);
        }
    });
}
