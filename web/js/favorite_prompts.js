import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

async function saveToFavorites(imgSrc, subcategory = "Default") {
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
            body: JSON.stringify({ filename, type, subfolder, subcategory })
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
                    callback: () => {
                        let subcategory = prompt("Enter subcategory for Favorite (e.g. Minimalist):", "Default");
                        if (!subcategory) return;
                        
                        let img = this.imgs[this.imageIndex || 0];
                        saveToFavorites(img.src, subcategory).then(success => {
                            if (success) alert(`Saved to Favorites -> ${subcategory}!`);
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
                const saveBtn = this.addWidget("button", "🍃 Save Active to Favorites", "save", () => {
                    if (!this.imgs || this.imgs.length === 0) {
                        alert("No image to save yet!");
                        return;
                    }
                    
                    let subcategory = prompt("Enter subcategory for Favorite:", "Default");
                    if (!subcategory) return;
                    
                    let img = this.imgs[this.imageIndex || 0];
                    saveToFavorites(img.src, subcategory).then(success => {
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
        
        starBtn.onclick = (e) => {
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
                let subcategory = prompt("Enter subcategory for Favorite:", "Default");
                if (subcategory) {
                    saveToFavorites(img.src, subcategory).then(success => {
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
            
            starBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                let subcategory = prompt("Enter subcategory for Favorite:", "Default");
                if (subcategory) {
                    saveToFavorites(img.src, subcategory).then(success => {
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
