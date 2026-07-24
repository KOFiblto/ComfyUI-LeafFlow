import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";

// Hash folder name to get a consistent color for the border
function getFolderBorderColor(folderName) {
    if (!folderName || folderName === "Root" || folderName === "[ NONE ]" || folderName === "[ RANDOM ]") return null;
    let hash = 5381;
    for (let i = 0; i < folderName.length; i++) {
        hash = ((hash << 5) + hash) + folderName.charCodeAt(i);
    }
    // Multiply by a large prime to distribute close values (like "1", "2", "3") widely across the 360 hue spectrum
    let h = Math.abs(hash * 2246822519) % 360;
    // Shift away from green spectrum (80-160) to avoid confusion with the selection highlight
    if (h >= 80 && h <= 160) {
        h = (h + 100) % 360;
    }
    return `hsl(${h}, 65%, 50%)`;
}

// Global CSS injection for the visual node styling
const visualStyles = document.createElement("style");
visualStyles.textContent = `
    .lora-visual-container {
        width: 100%;
        height: 100%;
        min-height: 150px;
        overflow-y: auto;
        gap: 8px;
        padding: 10px;
        background: #111;
        border: 2px solid #222;
        border-radius: 6px;
        box-sizing: border-box;
    }
    .lora-visual-container.grid-layout {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(var(--lora-tile-size, 80px), 1fr));
    }
    .lora-visual-container.flex-layout {
        display: flex;
        flex-direction: column;
    }
    .lora-visual-container::-webkit-scrollbar {
        width: 6px;
    }
    .lora-visual-container::-webkit-scrollbar-track {
        background: rgba(0,0,0,0.1);
        border-radius: 4px;
    }
    .lora-visual-container::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.15);
        border-radius: 4px;
    }
    .lora-visual-container::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.3);
    }
    .lora-none-container {
        width: 100%;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(var(--lora-tile-size, 80px), 1fr));
        margin-bottom: 10px;
    }
    .lora-control-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 4px 6px;
        background: #181818;
        border: 1px solid #282828;
        border-radius: 5px;
        margin-bottom: 8px;
        width: 100%;
        box-sizing: border-box;
    }
    .lora-toggle-container {
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .lora-toggle-label {
        font-size: 10px;
        color: #888;
        font-weight: bold;
        margin-right: 4px;
    }
    .lora-toggle-btn {
        background: #252525;
        border: 1px solid #353535;
        color: #aaa;
        font-size: 9px;
        font-weight: bold;
        padding: 3px 8px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s ease-in-out;
    }
    .lora-toggle-btn:hover {
        background: #303030;
        color: #fff;
    }
    .lora-toggle-btn.active {
        background: #007acc;
        border-color: #0098ff;
        color: #fff;
        box-shadow: 0 0 5px rgba(0, 122, 204, 0.4);
    }
    .lora-folder-container {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 12px;
        width: 100%;
    }
    .lora-folder-header {
        display: flex;
        align-items: center;
        padding: 6px 10px;
        background: linear-gradient(90deg, #1d1d1d, #141414);
        border: 1px solid #262626;
        border-radius: 5px;
        cursor: pointer;
        user-select: none;
        transition: background 0.15s, border-color 0.15s;
    }
    .lora-folder-header:hover {
        background: linear-gradient(90deg, #242424, #1a1a1a);
        border-color: #383838;
    }
    .lora-folder-toggle {
        font-size: 9px;
        color: #888;
        margin-right: 8px;
        transition: transform 0.2s ease-in-out;
    }
    .lora-folder-header.collapsed .lora-folder-toggle {
        transform: rotate(-90deg);
    }
    .lora-folder-name {
        font-size: 11px;
        font-weight: bold;
        color: #d1d1d1;
        flex-grow: 1;
    }
    .lora-folder-count {
        font-size: 10px;
        color: #555;
        margin-right: 10px;
    }
    .lora-folder-checkbox {
        cursor: pointer;
        width: 13px;
        height: 13px;
        accent-color: #007acc;
        margin: 0;
    }
    .lora-folder-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(var(--lora-tile-size, 80px), 1fr));
        gap: 8px;
        padding: 4px 2px;
    }
    .lora-folder-container.collapsed .lora-folder-grid {
        display: none !important;
    }
    .lora-tile {
        aspect-ratio: 3/4;
        background: #1a1a1a;
        border: 2px solid #333;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: center;
        overflow: hidden;
        position: relative;
        box-sizing: border-box;
        transition: all 0.15s ease-in-out;
    }
    .lora-tile:hover {
        border-color: #007acc;
        transform: scale(1.03);
    }
    .lora-tile.selected {
        border-color: #00ff66 !important;
        border-width: 4px !important;
        box-shadow: 0 0 12px rgba(0, 255, 102, 0.5);
    }
    .lora-tile img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        position: absolute;
        top: 0;
        left: 0;
    }
    .lora-tile-fallback {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #222, #111);
        color: #888;
        font-size: 10px;
        text-align: center;
        padding: 10px;
        box-sizing: border-box;
    }
    .lora-tile-none {
        background: linear-gradient(135deg, #a80000, #3a0000) !important;
        color: #fff !important;
        font-weight: bold;
    }
    .lora-tile-random {
        background: linear-gradient(135deg, #a85500, #3a1a00) !important;
        color: #fff !important;
        font-weight: bold;
    }
    .lora-tile-label {
        position: absolute;
        bottom: 0;
        width: 100%;
        background: rgba(0, 0, 0, 0.85);
        color: #fff;
        font-size: 10px;
        padding: 4px 2px;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        border-top: 1px solid #222;
    }
    .lora-tile-badge {
        position: absolute;
        top: 4px;
        right: 4px;
        background: rgba(0, 122, 204, 0.85);
        color: #fff;
        font-size: 8px;
        font-weight: bold;
        padding: 1px 4px;
        border-radius: 8px;
        pointer-events: none;
        z-index: 2;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    /* Top 3 Badges styling */
    .lora-tile-badge.rank-1 {
        background: linear-gradient(135deg, #ffd700, #ffaa00) !important;
        color: #000 !important;
        border: 1px solid #fff !important;
        box-shadow: 0 0 6px rgba(255, 215, 0, 0.8) !important;
    }
    .lora-tile-badge.rank-2 {
        background: linear-gradient(135deg, #e0e0e0, #9e9e9e) !important;
        color: #000 !important;
        border: 1px solid #fff !important;
        box-shadow: 0 0 6px rgba(224, 224, 224, 0.8) !important;
    }
    .lora-tile-badge.rank-3 {
        background: linear-gradient(135deg, #cd7f32, #8c521f) !important;
        color: #fff !important;
        border: 1px solid #fff !important;
        box-shadow: 0 0 6px rgba(205, 127, 50, 0.8) !important;
    }
    /* Top 3 Glow styling for non-selected tiles */
    .lora-tile.rank-1:not(.selected) {
        border-color: #ffd700 !important;
        box-shadow: 0 0 8px rgba(255, 215, 0, 0.3) !important;
    }
    .lora-tile.rank-2:not(.selected) {
        border-color: #c0c0c0 !important;
        box-shadow: 0 0 8px rgba(192, 192, 192, 0.3) !important;
    }
    .lora-tile.rank-3:not(.selected) {
        border-color: #cd7f32 !important;
        box-shadow: 0 0 8px rgba(205, 127, 50, 0.3) !important;
    }
`;
document.head.appendChild(visualStyles);

app.registerExtension({
    name: "Comfy.FolderLoraLoader",
    async nodeCreated(node) {
        // --- 1. ORIGINAL DROPDOWN NODES ---
        if (node.comfyClass === "FolderLoraLoader" || node.comfyClass === "FolderLoraLoaderPretty") {
            const folderWidget = node.widgets.find(w => w.name === "folder");
            const loraWidget = node.widgets.find(w => w.name === "lora_name");
            
            let hiddenWidget = node.widgets.find(w => w.name === "_selected_lora");
            if (!hiddenWidget) {
                hiddenWidget = node.addWidget("text", "_selected_lora", "[ NONE ]", () => {}, { serialize: true });
                hiddenWidget.type = "hidden";
            }

            if (folderWidget && loraWidget) {
                let activeRequest = null;
                let debounceTimer = null;

                const updateLoras = async (forceValue = null) => {
                    const folder = folderWidget.value || "";
                    const pretty = node.comfyClass === "FolderLoraLoaderPretty";
                    const currentRequest = Symbol();
                    activeRequest = currentRequest;

                    try {
                        const response = await api.fetchApi(`/folder_lora_loader/get_loras?folder=${encodeURIComponent(folder)}&pretty=${pretty}`);
                        if (activeRequest !== currentRequest) return;
                        const data = await response.json();
                        
                        let targetValue = forceValue !== null ? forceValue : (hiddenWidget.value || loraWidget.value);
                        loraWidget.options.values = data.names;

                        if (data.names.includes(targetValue)) {
                            loraWidget.value = targetValue;
                        } else {
                            let found = false;
                            for (const [displayName, systemPath] of Object.entries(data.mapping)) {
                                if (systemPath === targetValue || displayName === targetValue) {
                                    loraWidget.value = displayName;
                                    hiddenWidget.value = displayName;
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                loraWidget.value = "[ NONE ]";
                                hiddenWidget.value = "[ NONE ]";
                            }
                        }
                        node.triggerSlotEvent?.(0);
                    } catch (e) {
                        console.error("Failed to fetch filtered LoRAs", e);
                    }
                };

                loraWidget.callback = function(value) {
                    hiddenWidget.value = value;
                };

                folderWidget.callback = () => {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => updateLoras(), 350);
                };

                const originalOnConfigure = node.onConfigure;
                node.onConfigure = function(config) {
                    if (originalOnConfigure) originalOnConfigure.apply(this, arguments);
                    
                    const widgetIndex = node.widgets.indexOf(hiddenWidget);
                    const savedHiddenValue = (config.widgets_values && widgetIndex !== -1) ? config.widgets_values[widgetIndex] : hiddenWidget.value;
                    
                    if (savedHiddenValue) {
                        hiddenWidget.value = savedHiddenValue;
                        loraWidget.options.values = [savedHiddenValue, "[ NONE ]"];
                        loraWidget.value = savedHiddenValue;
                        setTimeout(() => updateLoras(savedHiddenValue), 100);
                    }
                };

                setTimeout(() => {
                    const initValue = hiddenWidget.value || loraWidget.value;
                    if (initValue && initValue !== "[ NONE ]") {
                        loraWidget.options.values = [initValue, "[ NONE ]"];
                        loraWidget.value = initValue;
                    }
                    updateLoras(initValue);
                }, 50);
            }
        }

        // --- 2. VISUAL PRETTY PICKER V1 ---
        if (node.comfyClass === "FolderLoraLoaderVisualPretty") {
            // Force node size to look wide and accommodate the visual picker viewport
            node.size = [380, 320];

            node.computeSize = function() {
                return [380, 320];
            };

            const folderWidget = node.widgets.find(w => w.name === "folder");
            
            const getHiddenWidget = () => {
                const widgets = node.widgets.filter(w => w.name === "_selected_lora");
                if (widgets.length > 1) {
                    const keep = widgets.find(w => w.value && w.value !== "[ NONE ]") || widgets[0];
                    node.widgets = node.widgets.filter(w => w.name !== "_selected_lora" || w === keep);
                    return keep;
                }
                if (widgets.length === 1) {
                    return widgets[0];
                }
                const w = node.addWidget("text", "_selected_lora", "[ NONE ]", () => {}, { serialize: true });
                w.type = "hidden";
                return w;
            };
            const hiddenWidget = getHiddenWidget();

            // Create Visual HTML DOM Element
            const viewContainer = document.createElement("div");
            viewContainer.className = "lora-visual-container grid-layout";
            const initialZoom = localStorage.getItem("comfy_lora_picker_zoom") || "80";
            viewContainer.style.setProperty("--lora-tile-size", `${initialZoom}px`);

            // Embed DOM Widget inside the node container
            const domWidget = node.addDOMWidget("lora_visual_picker", "HTML", viewContainer, {
                getValue() { return getHiddenWidget().value; },
                setValue(val) { getHiddenWidget().value = val; },
                serialize: false
            });

            // Adjust sizing constraints dynamically
            domWidget.computeSize = function() {
                return [node.size[0] - 30, node.size[1] - 160];
            };

            // Add Zoom slider widget
            const zoomWidget = node.addWidget(
                "slider",
                "tile_size",
                parseInt(initialZoom),
                (val) => {
                    localStorage.setItem("comfy_lora_picker_zoom", val);
                    viewContainer.style.setProperty("--lora-tile-size", `${val}px`);
                },
                { min: 50, max: 180, step: 1 }
            );
            zoomWidget.serialize = false;

            let activeRequest = null;
            let debounceTimer = null;

            const updateVisualGrid = async () => {
                const folder = folderWidget.value || "";
                const currentRequest = Symbol();
                activeRequest = currentRequest;

                try {
                    const response = await api.fetchApi(`/folder_lora_loader/get_loras?folder=${encodeURIComponent(folder)}&pretty=true`);
                    if (activeRequest !== currentRequest) return;
                    const data = await response.json();

                    viewContainer.innerHTML = "";

                    // Calculate Top 3 Ranks by versionless pretty name
                    const getTop3Ranks = () => {
                        const prettyCounts = {};
                        if (data.usage && data.mapping) {
                            Object.entries(data.mapping).forEach(([displayName, systemPath]) => {
                                const count = data.usage[systemPath] || 0;
                                if (count > 0) {
                                    let prettyName = displayName;
                                    if (prettyName.includes(" - ")) {
                                        prettyName = prettyName.split(" - ", 2)[1];
                                    }
                                    prettyName = prettyName.replace(/\s+V\d+(\.\d+)?$/i, "").trim();
                                    prettyCounts[prettyName] = Math.max(prettyCounts[prettyName] || 0, count);
                                }
                            });
                        }
                        
                        const sorted = Object.entries(prettyCounts)
                            .sort((a, b) => b[1] - a[1]);
                            
                        const ranks = { rank1: [], rank2: [], rank3: [] };
                        const uniqueCounts = [...new Set(sorted.map(x => x[1]))];
                        
                        sorted.forEach(([name, count]) => {
                            if (count === uniqueCounts[0]) ranks.rank1.push(name);
                            else if (count === uniqueCounts[1]) ranks.rank2.push(name);
                            else if (count === uniqueCounts[2]) ranks.rank3.push(name);
                        });
                        return ranks;
                    };
                    const ranks = getTop3Ranks();

                    // Helper to create special tiles (NONE and RANDOM)
                    const createSpecialTile = (name, labelText, borderCol, bgClass) => {
                        const tile = document.createElement("div");
                        tile.className = "lora-tile " + bgClass;
                        tile.dataset.loraName = name;
                        tile.style.borderColor = borderCol;
                        tile.dataset.folderColor = borderCol;

                        const curWidget = getHiddenWidget();
                        const hiddenVal = curWidget.value;
                        if (hiddenVal === name) {
                            tile.className += " selected";
                            tile.style.borderColor = "#00ff66";
                        }

                        const fallback = document.createElement("div");
                        fallback.className = "lora-tile-fallback " + bgClass;
                        fallback.innerText = labelText;
                        tile.appendChild(fallback);

                        const label = document.createElement("div");
                        label.className = "lora-tile-label";
                        label.innerText = labelText;
                        tile.appendChild(label);

                        tile.addEventListener("click", () => {
                            const siblings = viewContainer.querySelectorAll(".lora-tile");
                            siblings.forEach(s => {
                                s.classList.remove("selected");
                                if (s.dataset.folderColor) {
                                    s.style.borderColor = s.dataset.folderColor;
                                } else {
                                    s.style.borderColor = "";
                                }
                            });
                            tile.classList.add("selected");
                            tile.style.borderColor = "#00ff66";
                            
                            const w = getHiddenWidget();
                            w.value = name;
                            if (w.callback) w.callback(name);
                            node.triggerSlotEvent?.(0);
                        });

                        viewContainer.appendChild(tile);
                    };

                    // NONE and RANDOM tiles at the top
                    createSpecialTile("[ NONE ]", "NONE", "#ff3333", "lora-tile-none");
                    createSpecialTile("[ RANDOM ]", "RANDOM", "#ffaa00", "lora-tile-random");

                    data.names.forEach(loraName => {
                        if (loraName === "[ NONE ]" || loraName === "[ RANDOM ]") return;

                        const tile = document.createElement("div");
                        tile.className = "lora-tile";
                        tile.dataset.loraName = loraName;
                        
                        const subFolder = loraName.includes(" - ") ? loraName.split(" - ")[0] : "";
                        const borderCol = getFolderBorderColor(subFolder);
                        if (borderCol) {
                            tile.style.borderColor = borderCol;
                            tile.dataset.folderColor = borderCol;
                        }

                        const curWidget = getHiddenWidget();
                        if (curWidget.value === loraName) {
                            tile.className += " selected";
                            tile.style.borderColor = "#00ff66";
                        }

                        const img = document.createElement("img");
                        img.src = `/folder_lora_loader/get_preview?lora=${encodeURIComponent(loraName)}&folder=${encodeURIComponent(folder)}&pretty=true`;
                        
                        img.onerror = () => {
                            img.remove();
                            const fallback = document.createElement("div");
                            fallback.className = "lora-tile-fallback";
                            fallback.innerText = loraName;
                            tile.prepend(fallback);
                        };
                        tile.appendChild(img);

                        // Rank classification based on versionless pretty name
                        let tilePrettyName = loraName;
                        if (tilePrettyName.includes(" - ")) {
                            tilePrettyName = tilePrettyName.split(" - ", 2)[1];
                        }
                        tilePrettyName = tilePrettyName.replace(/\s+V\d+(\.\d+)?$/i, "").trim();

                        let rankClass = "";
                        if (ranks.rank1.includes(tilePrettyName)) rankClass = "rank-1";
                        else if (ranks.rank2.includes(tilePrettyName)) rankClass = "rank-2";
                        else if (ranks.rank3.includes(tilePrettyName)) rankClass = "rank-3";

                        if (rankClass) {
                            tile.classList.add(rankClass);
                        }

                        const systemPath = data.mapping[loraName];
                        const usageCount = (data.usage && systemPath) ? (data.usage[systemPath] || 0) : 0;
                        if (usageCount > 0) {
                            const badge = document.createElement("div");
                            badge.className = "lora-tile-badge";
                            if (rankClass) badge.classList.add(rankClass);
                            badge.innerText = usageCount;
                            tile.appendChild(badge);
                        }

                        // Add bottom caption label
                        const label = document.createElement("div");
                        label.className = "lora-tile-label";
                        label.innerText = loraName;
                        tile.appendChild(label);

                        // Trigger click selection
                        tile.addEventListener("click", () => {
                            const siblings = viewContainer.querySelectorAll(".lora-tile");
                            siblings.forEach(s => {
                                s.classList.remove("selected");
                                if (s.dataset.folderColor) {
                                    s.style.borderColor = s.dataset.folderColor;
                                } else {
                                    s.style.borderColor = "";
                                }
                            });
                            tile.classList.add("selected");
                            tile.style.borderColor = "#00ff66";
                            
                            const w = getHiddenWidget();
                            w.value = loraName;
                            if (w.callback) w.callback(loraName);
                            node.triggerSlotEvent?.(0);
                        });

                        viewContainer.appendChild(tile);
                    });
                } catch (e) {
                    console.error("Failed to build visual picker", e);
                }
            };

            folderWidget.callback = () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => updateVisualGrid(), 350);
            };

            const originalOnConfigure = node.onConfigure;
            node.onConfigure = function(config) {
                if (originalOnConfigure) originalOnConfigure.apply(this, arguments);
                
                const curWidget = getHiddenWidget();
                const widgetIndex = node.widgets.indexOf(curWidget);
                const savedValue = (config.widgets_values && widgetIndex !== -1) ? config.widgets_values[widgetIndex] : curWidget.value;
                
                if (savedValue) {
                    curWidget.value = savedValue;
                    setTimeout(() => updateVisualGrid(), 100);
                }
            };

            setTimeout(() => updateVisualGrid(), 100);
        }

        // --- 3. VISUAL PRETTY PICKER V2 (Collapsible folders & Multi-selection) ---
        if (node.comfyClass === "FolderLoraLoaderVisualPrettyV2") {
            node.size = [380, 360];

            node.computeSize = function() {
                return [380, 320];
            };

            const folderWidget = node.widgets.find(w => w.name === "folder");
            
            const getHiddenWidget = () => {
                const widgets = node.widgets.filter(w => w.name === "_selected_lora");
                if (widgets.length > 1) {
                    const keep = widgets.find(w => w.value && w.value !== "[ NONE ]" && w.value !== "[]") || widgets[0];
                    node.widgets = node.widgets.filter(w => w.name !== "_selected_lora" || w === keep);
                    return keep;
                }
                if (widgets.length === 1) {
                    return widgets[0];
                }
                const w = node.addWidget("text", "_selected_lora", "[]", () => {}, { serialize: true });
                w.type = "hidden";
                return w;
            };
            const hiddenWidget = getHiddenWidget();

            const getHiddenModeWidget = () => {
                const widgets = node.widgets.filter(w => w.name === "_selection_mode");
                if (widgets.length > 1) {
                    const keep = widgets.find(w => w.value && w.value !== "All") || widgets[0];
                    node.widgets = node.widgets.filter(w => w.name !== "_selection_mode" || w === keep);
                    return keep;
                }
                if (widgets.length === 1) {
                    return widgets[0];
                }
                const w = node.addWidget("text", "_selection_mode", "All", () => {}, { serialize: true });
                w.type = "hidden";
                return w;
            };
            const hiddenModeWidget = getHiddenModeWidget();

            const getHiddenScrapeWidget = () => {
                const widgets = node.widgets.filter(w => w.name === "_scrape_on_new");
                if (widgets.length > 1) {
                    const keep = widgets.find(w => w.value && (w.value === "true" || w.value === "false")) || widgets[0];
                    node.widgets = node.widgets.filter(w => w.name !== "_scrape_on_new" || w === keep);
                    return keep;
                }
                if (widgets.length === 1) {
                    return widgets[0];
                }
                const w = node.addWidget("text", "_scrape_on_new", "true", () => {}, { serialize: true });
                w.type = "hidden";
                return w;
            };
            const hiddenScrapeWidget = getHiddenScrapeWidget();

            const viewContainer = document.createElement("div");
            viewContainer.className = "lora-visual-container flex-layout";
            const initialZoom = localStorage.getItem("comfy_lora_picker_zoom") || "80";
            viewContainer.style.setProperty("--lora-tile-size", `${initialZoom}px`);

            // Isolate mouse wheel scroll events from triggering canvas zooming/panning
            viewContainer.addEventListener("wheel", (e) => {
                e.stopPropagation();
            });

            // --- Control Bar for 2-Way HTML Toggle Button ---
            const controlBar = document.createElement("div");
            controlBar.className = "lora-control-bar";

            const toggleContainer = document.createElement("div");
            toggleContainer.className = "lora-toggle-container";

            const toggleLabel = document.createElement("span");
            toggleLabel.className = "lora-toggle-label";
            toggleLabel.innerText = "Mode:";
            toggleContainer.appendChild(toggleLabel);

            const allBtn = document.createElement("button");
            allBtn.className = "lora-toggle-btn active";
            allBtn.innerText = "All Celebs";

            const randomBtn = document.createElement("button");
            randomBtn.className = "lora-toggle-btn";
            randomBtn.innerText = "Random Celeb";

            const syncModeToggleUI = () => {
                const curModeWidget = getHiddenModeWidget();
                if (curModeWidget.value === "Random") {
                    randomBtn.classList.add("active");
                    allBtn.classList.remove("active");
                } else {
                    allBtn.classList.add("active");
                    randomBtn.classList.remove("active");
                }
            };

            allBtn.addEventListener("click", () => {
                getHiddenModeWidget().value = "All";
                syncModeToggleUI();
                node.triggerSlotEvent?.(0);
            });

            randomBtn.addEventListener("click", () => {
                getHiddenModeWidget().value = "Random";
                syncModeToggleUI();
                node.triggerSlotEvent?.(0);
            });

            toggleContainer.appendChild(allBtn);
            toggleContainer.appendChild(randomBtn);
            controlBar.appendChild(toggleContainer);

            // Scrape Toggle Container
            const scrapeToggleContainer = document.createElement("div");
            scrapeToggleContainer.className = "lora-toggle-container";

            const scrapeLabel = document.createElement("span");
            scrapeLabel.className = "lora-toggle-label";
            scrapeLabel.innerText = "Scrape:";
            scrapeToggleContainer.appendChild(scrapeLabel);

            const scrapeOnBtn = document.createElement("button");
            scrapeOnBtn.className = "lora-toggle-btn active";
            scrapeOnBtn.innerText = "ON";

            const scrapeOffBtn = document.createElement("button");
            scrapeOffBtn.className = "lora-toggle-btn";
            scrapeOffBtn.innerText = "OFF";

            const syncScrapeToggleUI = () => {
                const curScrapeWidget = getHiddenScrapeWidget();
                if (curScrapeWidget.value === "false") {
                    scrapeOffBtn.classList.add("active");
                    scrapeOnBtn.classList.remove("active");
                } else {
                    scrapeOnBtn.classList.add("active");
                    scrapeOffBtn.classList.remove("active");
                }
            };

            scrapeOnBtn.addEventListener("click", () => {
                getHiddenScrapeWidget().value = "true";
                syncScrapeToggleUI();
                updateVisualGrid();
            });

            scrapeOffBtn.addEventListener("click", () => {
                getHiddenScrapeWidget().value = "false";
                syncScrapeToggleUI();
                updateVisualGrid();
            });

            scrapeToggleContainer.appendChild(scrapeOnBtn);
            scrapeToggleContainer.appendChild(scrapeOffBtn);
            controlBar.appendChild(scrapeToggleContainer);

            viewContainer.appendChild(controlBar);

            const domWidget = node.addDOMWidget("lora_visual_picker", "HTML", viewContainer, {
                getValue() { return getHiddenWidget().value; },
                setValue(val) { getHiddenWidget().value = val; },
                serialize: false
            });

            domWidget.computeSize = function() {
                return [node.size[0] - 30, node.size[1] - 190];
            };

            const zoomWidget = node.addWidget(
                "slider",
                "tile_size",
                parseInt(initialZoom),
                (val) => {
                    localStorage.setItem("comfy_lora_picker_zoom", val);
                    viewContainer.style.setProperty("--lora-tile-size", `${val}px`);
                },
                { min: 50, max: 180, step: 1 }
            );
            zoomWidget.serialize = false;

            let activeRequest = null;
            let debounceTimer = null;
            let foldersMap = {};

            const getSelectedLoras = () => {
                const curWidget = getHiddenWidget();
                let currentSelected = [];
                try {
                    currentSelected = JSON.parse(curWidget.value || "[]");
                    if (!Array.isArray(currentSelected)) {
                        currentSelected = [curWidget.value];
                    }
                } catch (e) {
                    if (curWidget.value && curWidget.value !== "[ NONE ]" && curWidget.value !== "[]") {
                        currentSelected = [curWidget.value];
                    } else {
                        currentSelected = [];
                    }
                }
                // Filter out "[ NONE ]"
                currentSelected = currentSelected.filter(n => n !== "[ NONE ]" && n);
                return currentSelected;
            };

            const updateFolderCheckboxes = () => {
                const selectedList = getSelectedLoras();
                
                Object.keys(foldersMap).forEach(folder => {
                    const headerEl = viewContainer.querySelector(`.lora-folder-header[data-folder="${CSS.escape(folder)}"]`);
                    if (!headerEl) return;
                    const checkbox = headerEl.querySelector(".lora-folder-checkbox");
                    if (!checkbox) return;

                    const items = foldersMap[folder];
                    if (!items || items.length === 0) return;

                    const selectedCount = items.filter(item => selectedList.includes(item.loraName)).length;

                    if (selectedCount === items.length) {
                        checkbox.checked = true;
                        checkbox.indeterminate = false;
                    } else if (selectedCount > 0) {
                        checkbox.checked = false;
                        checkbox.indeterminate = true;
                    } else {
                        checkbox.checked = false;
                        checkbox.indeterminate = false;
                    }
                });
            };

            const updateSelection = (selectedList) => {
                // Filter out "[ NONE ]"
                selectedList = selectedList.filter(n => n !== "[ NONE ]" && n);

                const curWidget = getHiddenWidget();
                curWidget.value = JSON.stringify(selectedList);

                const tiles = viewContainer.querySelectorAll(".lora-tile");
                tiles.forEach(t => {
                    const name = t.dataset.loraName;
                    if (selectedList.includes(name)) {
                        t.classList.add("selected");
                        t.style.borderColor = "#00ff66";
                    } else {
                        t.classList.remove("selected");
                        if (t.dataset.folderColor) {
                            t.style.borderColor = t.dataset.folderColor;
                        } else {
                            t.style.borderColor = "";
                        }
                    }
                });

                updateFolderCheckboxes();
                node.triggerSlotEvent?.(0);
            };

            const updateVisualGrid = async () => {
                const folder = folderWidget.value || "";
                const scrapeOnNew = getHiddenScrapeWidget().value;
                const currentRequest = Symbol();
                activeRequest = currentRequest;

                try {
                    const response = await api.fetchApi(`/folder_lora_loader/get_loras?folder=${encodeURIComponent(folder)}&pretty=true&scrape_on_new=${encodeURIComponent(scrapeOnNew)}`);
                    if (activeRequest !== currentRequest) return;
                    const data = await response.json();

                    // Keep the control bar and clear the rest
                    const noneContainerExist = viewContainer.querySelector(".lora-none-container");
                    if (noneContainerExist) noneContainerExist.remove();
                    const foldersExist = viewContainer.querySelectorAll(".lora-folder-container");
                    foldersExist.forEach(f => f.remove());

                    foldersMap = {};
                    foldersMap["Root"] = [];

                    const selectedList = getSelectedLoras();

                    // Calculate Top 3 Ranks by versionless pretty name
                    const getTop3Ranks = () => {
                        const prettyCounts = {};
                        if (data.usage && data.mapping) {
                            Object.entries(data.mapping).forEach(([displayName, systemPath]) => {
                                const count = data.usage[systemPath] || 0;
                                if (count > 0) {
                                    let prettyName = displayName;
                                    if (prettyName.includes(" - ")) {
                                        prettyName = prettyName.split(" - ", 2)[1];
                                    }
                                    prettyName = prettyName.replace(/\s+V\d+(\.\d+)?$/i, "").trim();
                                    prettyCounts[prettyName] = Math.max(prettyCounts[prettyName] || 0, count);
                                }
                            });
                        }
                        
                        const sorted = Object.entries(prettyCounts)
                            .sort((a, b) => b[1] - a[1]);
                            
                        const ranks = { rank1: [], rank2: [], rank3: [] };
                        const uniqueCounts = [...new Set(sorted.map(x => x[1]))];
                        
                        sorted.forEach(([name, count]) => {
                            if (count === uniqueCounts[0]) ranks.rank1.push(name);
                            else if (count === uniqueCounts[1]) ranks.rank2.push(name);
                            else if (count === uniqueCounts[2]) ranks.rank3.push(name);
                        });
                        return ranks;
                    };
                    const ranks = getTop3Ranks();

                    // --- Group items by folder ---
                    data.names.forEach(loraName => {
                        if (loraName === "[ NONE ]") return;
                        const parts = loraName.split(" - ");
                        const subFolder = parts.length > 1 ? parts[0] : "Root";
                        const prettyName = parts.length > 1 ? parts.slice(1).join(" - ") : loraName;
                        const systemPath = data.mapping[loraName];
                        const usageCount = (data.usage && systemPath) ? (data.usage[systemPath] || 0) : 0;

                        if (!foldersMap[subFolder]) {
                            foldersMap[subFolder] = [];
                        }
                        foldersMap[subFolder].push({ loraName, prettyName, usageCount, systemPath });
                    });

                    // Sort folders: Root first, others alphabetically
                    const sortedFolders = Object.keys(foldersMap).sort((a, b) => {
                        if (a === "Root") return -1;
                        if (b === "Root") return 1;
                        return a.localeCompare(b);
                    });

                    // --- Render folder groups ---
                    sortedFolders.forEach(subFolder => {
                        const items = foldersMap[subFolder];
                        if (items.length === 0) return;

                        const folderContainer = document.createElement("div");
                        folderContainer.className = "lora-folder-container";
                        const isCollapsed = localStorage.getItem(`comfy_lora_picker_folder_collapsed_${subFolder}`) === "true";
                        if (isCollapsed) {
                            folderContainer.classList.add("collapsed");
                        }

                        // Folder Header
                        const header = document.createElement("div");
                        header.className = "lora-folder-header";
                        header.dataset.folder = subFolder;
                        if (isCollapsed) {
                            header.classList.add("collapsed");
                        }

                        const toggle = document.createElement("span");
                        toggle.className = "lora-folder-toggle";
                        toggle.innerText = "▼";
                        header.appendChild(toggle);

                        const nameSpan = document.createElement("span");
                        nameSpan.className = "lora-folder-name";
                        nameSpan.innerText = subFolder;
                        header.appendChild(nameSpan);

                        const countSpan = document.createElement("span");
                        countSpan.className = "lora-folder-count";
                        countSpan.innerText = `(${items.length})`;
                        header.appendChild(countSpan);

                        const checkbox = document.createElement("input");
                        checkbox.type = "checkbox";
                        checkbox.className = "lora-folder-checkbox";
                        checkbox.title = "Select/Deselect all in folder";
                        
                        // Prevent header toggle click when clicking checkbox
                        checkbox.addEventListener("click", (e) => {
                            e.stopPropagation();
                            const isChecked = checkbox.checked;
                            let currentSelected = getSelectedLoras();

                            items.forEach(item => {
                                if (isChecked) {
                                    if (!currentSelected.includes(item.loraName)) {
                                        currentSelected.push(item.loraName);
                                    }
                                } else {
                                    currentSelected = currentSelected.filter(n => n !== item.loraName);
                                }
                            });

                            updateSelection(currentSelected);
                        });

                        header.appendChild(checkbox);

                        // Collapse/Expand functionality
                        header.addEventListener("click", () => {
                            const collapsed = folderContainer.classList.toggle("collapsed");
                            header.classList.toggle("collapsed", collapsed);
                            localStorage.setItem(`comfy_lora_picker_folder_collapsed_${subFolder}`, collapsed ? "true" : "false");
                        });

                        folderContainer.appendChild(header);

                        // Grid containing items of this folder
                        const grid = document.createElement("div");
                        grid.className = "lora-folder-grid";

                        items.forEach(item => {
                            const tile = document.createElement("div");
                            tile.className = "lora-tile";
                            tile.dataset.loraName = item.loraName;
                            
                            const borderCol = getFolderBorderColor(subFolder);
                            if (borderCol) {
                                tile.style.borderColor = borderCol;
                                tile.dataset.folderColor = borderCol;
                            }

                            if (selectedList.includes(item.loraName)) {
                                tile.className += " selected";
                                tile.style.borderColor = "#00ff66";
                            }

                            const img = document.createElement("img");
                            img.src = `/folder_lora_loader/get_preview?lora=${encodeURIComponent(item.loraName)}&folder=${encodeURIComponent(folder)}&pretty=true`;
                            
                            img.onerror = () => {
                                img.remove();
                                const fallback = document.createElement("div");
                                fallback.className = "lora-tile-fallback";
                                fallback.innerText = item.prettyName; // V2 shows only prettyName inside the folder section!
                                tile.prepend(fallback);
                            };
                            tile.appendChild(img);

                            // Rank classification based on versionless pretty name
                            let tilePrettyName = item.prettyName.replace(/\s+V\d+(\.\d+)?$/i, "").trim();

                            let rankClass = "";
                            if (ranks.rank1.includes(tilePrettyName)) rankClass = "rank-1";
                            else if (ranks.rank2.includes(tilePrettyName)) rankClass = "rank-2";
                            else if (ranks.rank3.includes(tilePrettyName)) rankClass = "rank-3";

                            if (rankClass) {
                                tile.classList.add(rankClass);
                            }

                            if (item.usageCount > 0) {
                                const badge = document.createElement("div");
                                badge.className = "lora-tile-badge";
                                if (rankClass) badge.classList.add(rankClass);
                                badge.innerText = item.usageCount;
                                tile.appendChild(badge);
                            }

                            const label = document.createElement("div");
                            label.className = "lora-tile-label";
                            label.innerText = item.prettyName; // V2 shows only prettyName inside the folder section!
                            tile.appendChild(label);

                            // Tile Click Handler (supporting Multi-Selection via Ctrl / Meta key)
                            tile.addEventListener("click", (e) => {
                                let currentSelected = getSelectedLoras();

                                if (e.ctrlKey || e.metaKey) {
                                    if (currentSelected.includes(item.loraName)) {
                                        currentSelected = currentSelected.filter(n => n !== item.loraName);
                                    } else {
                                        currentSelected.push(item.loraName);
                                    }
                                } else {
                                    if (currentSelected.length === 1 && currentSelected[0] === item.loraName) {
                                        currentSelected = [];
                                    } else {
                                        currentSelected = [item.loraName];
                                    }
                                }

                                updateSelection(currentSelected);
                            });

                            grid.appendChild(tile);
                        });

                        folderContainer.appendChild(grid);
                        viewContainer.appendChild(folderContainer);
                    });

                    // Set initial checkboxes state
                    updateFolderCheckboxes();
                } catch (e) {
                    console.error("Failed to build visual picker v2", e);
                }
            };

            folderWidget.callback = () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => updateVisualGrid(), 350);
            };

            const originalOnConfigure = node.onConfigure;
            node.onConfigure = function(config) {
                if (originalOnConfigure) originalOnConfigure.apply(this, arguments);
                
                const curWidget = getHiddenWidget();
                const widgetIndex = node.widgets.indexOf(curWidget);
                const savedValue = (config.widgets_values && widgetIndex !== -1) ? config.widgets_values[widgetIndex] : curWidget.value;
                if (savedValue) {
                    curWidget.value = savedValue;
                }

                const curModeWidget = getHiddenModeWidget();
                const modeIndex = node.widgets.indexOf(curModeWidget);
                const savedMode = (config.widgets_values && modeIndex !== -1) ? config.widgets_values[modeIndex] : curModeWidget.value;
                if (savedMode) {
                    curModeWidget.value = savedMode;
                }

                const curScrapeWidget = getHiddenScrapeWidget();
                const scrapeIndex = node.widgets.indexOf(curScrapeWidget);
                const savedScrape = (config.widgets_values && scrapeIndex !== -1) ? config.widgets_values[scrapeIndex] : curScrapeWidget.value;
                if (savedScrape) {
                    curScrapeWidget.value = savedScrape;
                }

                syncModeToggleUI();
                syncScrapeToggleUI();
                setTimeout(() => updateVisualGrid(), 100);
            };

            syncModeToggleUI();
            syncScrapeToggleUI();
            setTimeout(() => updateVisualGrid(), 100);
        }
    }
});