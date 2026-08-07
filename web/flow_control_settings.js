import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

app.registerExtension({
    name: "ComfyUI.FlowControl.Settings",
    async setup() {
        // 1. Enable Civitai Scraping Toggle
        app.ui.settings.addSetting({
            id: "FlowControl.EnableCivitaiScraping",
            name: "🍃 FlowControl: Enable Civitai Auto-Scraping",
            type: "boolean",
            defaultValue: true,
            tooltip: "Toggles automated downloading of preview thumbnails for new LoRAs from Civitai via SHA256 file hashes. Disabling this blocks Civitai network calls (local preview images next to LoRAs will still work).",
            onChange(value) {
                api.fetchApi("/flow_control/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ enable_civitai_scraping: value ? "true" : "false" })
                }).catch(() => {});
            }
        });

        // 1b. Enable LoRA Usage Tracking Setting
        app.ui.settings.addSetting({
            id: "FlowControl.EnableLoraUsage",
            name: "🍃 FlowControl: Enable LoRA Usage Tracking",
            type: "boolean",
            defaultValue: true,
            tooltip: "Toggles tracking and displaying LoRA usage counts & visual rank badges (🔥, Gold, Silver, Bronze). Existing usage history is preserved when disabled.",
            onChange(value) {
                api.fetchApi("/flow_control/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ enable_lora_usage: value ? "true" : "false" })
                }).catch(() => {});
            }
        });

        // 2. Civitai API Key Setting with Password Masking & Eye Icon Toggle
        app.ui.settings.addSetting({
            id: "FlowControl.CivitaiAPIKey",
            name: "🍃 FlowControl: Civitai API Key",
            type: "text",
            defaultValue: "",
            tooltip: "Optional. Civitai SHA256 search works publicly without a key for normal models. Only needed for NSFW/private models or higher rate limits. Whitespace is automatically stripped.",
            onChange(value) {
                const cleanKey = (value || "").trim();
                api.fetchApi("/flow_control/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ civitai_api_key: cleanKey })
                }).catch(() => {});
            }
        });

        // 3. Enable TMDB Scraping Toggle
        app.ui.settings.addSetting({
            id: "FlowControl.EnableTMDBScraping",
            name: "🍃 FlowControl: Enable TMDB Auto-Scraping",
            type: "boolean",
            defaultValue: true,
            tooltip: "Toggles automated downloading of celebrity preview thumbnails from TMDB. Disabling this blocks TMDB network calls.",
            onChange(value) {
                api.fetchApi("/flow_control/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ enable_tmdb_scraping: value ? "true" : "false" })
                }).catch(() => {});
            }
        });

        // 4. TMDB API Key Setting with Password Masking & Eye Icon Toggle
        app.ui.settings.addSetting({
            id: "FlowControl.TMDBAPIKey",
            name: "🍃 FlowControl: TMDB API Key / Read Access Token",
            type: "text",
            defaultValue: "",
            tooltip: "Optional. Accepts TMDB v3 API keys or TMDB v4 Read Access Tokens (eyJ...). Whitespace is automatically stripped.",
            onChange(value) {
                const cleanKey = (value || "").trim();
                api.fetchApi("/flow_control/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tmdb_api_key: cleanKey })
                }).catch(() => {});
            }
        });

        // 5. Default Pause Queue State (Paused vs Running)
        app.ui.settings.addSetting({
            id: "FlowControl.DefaultPauseState",
            name: "🍃 FlowControl: Default Pause Queue State on Launch",
            type: "combo",
            options: ["Paused", "Running"],
            defaultValue: "Paused",
            tooltip: "Choose whether the queue starts in Paused state or Running state on normal ComfyUI startup.",
            onChange(value) {
                api.fetchApi("/flow_control/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ default_pause_state: value })
                }).catch(() => {});
            }
        });

        // 6. Default Pause Queue Mode (Finish Active Prompt vs Instant Resume Node)
        app.ui.settings.addSetting({
            id: "FlowControl.DefaultPauseMode",
            name: "🍃 FlowControl: Default Pause Queue Mode on Launch",
            type: "combo",
            options: ["Finish Active Prompt", "Instant Resume Node"],
            defaultValue: "Finish Active Prompt",
            tooltip: "Choose default pause behavior mode on ComfyUI startup.",
            onChange(value) {
                const modeKey = (value === "Instant Resume Node" || value === "Pause (Instant)") ? "instantly" : "after_finish";
                api.fetchApi("/flow_control/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ default_pause_mode: modeKey })
                }).catch(() => {});
            }
        });

        // 7. Persistent Queue Restored Launch State Override
        app.ui.settings.addSetting({
            id: "FlowControl.PersistentQueueRestoredState",
            name: "🍃 FlowControl: Persistent Queue Restored Launch State",
            type: "combo",
            options: ["Match Default", "Force Paused", "Force Running"],
            defaultValue: "Match Default",
            tooltip: "Override launch state when unfinished queue items are restored on startup (e.g., keep normal launch Running, but force Restored queue startup Paused).",
            onChange(value) {
                api.fetchApi("/flow_control/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ persistent_queue_restored_state: value })
                }).catch(() => {});
            }
        });

        // 8. Toolbar Button Unpaused Color
        app.ui.settings.addSetting({
            id: "FlowControl.PauseButtonUnpausedColor",
            name: "🍃 FlowControl: Pause Button Unpaused Color",
            type: "text",
            defaultValue: "#059669",
            tooltip: "Hex color code for the Pause toolbar button when execution is unpaused/running (default: #059669).",
            onChange(value) {
                document.documentElement.style.setProperty("--pq-unpaused-color", value || "#059669");
            }
        });

        // 9. Toolbar Button Paused Color
        app.ui.settings.addSetting({
            id: "FlowControl.PauseButtonPausedColor",
            name: "🍃 FlowControl: Pause Button Paused Color",
            type: "text",
            defaultValue: "#ea580c",
            tooltip: "Hex color code for the Pause toolbar button when execution is paused (default: #ea580c).",
            onChange(value) {
                document.documentElement.style.setProperty("--pq-paused-color", value || "#ea580c");
            }
        });

        // 10. Pause Queue Toolbar Toggle Setting
        app.ui.settings.addSetting({
            id: "FlowControl.EnablePauseQueue",
            name: "🍃 FlowControl: Enable Pause Queue Toolbar Button",
            type: "boolean",
            defaultValue: true,
            tooltip: "Displays the green/orange Pause & Continue button group in top action bar.",
            onChange(value) {
                const group = document.querySelector(".pq-button-group");
                if (group) {
                    group.style.display = value ? "inline-flex" : "none";
                }
            }
        });

        // 11. Enable Persistent Queue Setting
        app.ui.settings.addSetting({
            id: "FlowControl.EnablePersistentQueue",
            name: "🍃 FlowControl: Enable Persistent Queue (Auto-Recovery)",
            type: "boolean",
            defaultValue: true,
            tooltip: "Automatically saves unfinished queue items to disk and restores them after restart/crash.",
            onChange(value) {
                api.fetchApi("/flow_control/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ enable_persistent_queue: value ? "true" : "false" })
                }).catch(() => {});
            }
        });

        // Masking password inputs, adding color pickers and reset buttons in ComfyUI settings dialog
        const applyKeyMasking = () => {
            const inputs = document.querySelectorAll('input');
            inputs.forEach(input => {
                // Skip if already a color picker or attached
                if (input.type === "color" || input.dataset.isColorPicker === "true" || input.dataset.colorPickerAttached === "true") {
                    return;
                }

                const settingRow = input.closest('tr') || 
                                   input.closest('.p-4') || 
                                   input.parentElement?.parentElement || 
                                   input.parentElement;
                
                if (!settingRow) return;
                const text = settingRow.textContent || "";
                
                // Password masking for API keys
                if ((text.includes("Civitai API Key") || text.includes("TMDB API Key")) && !input.dataset.masked) {
                    input.dataset.masked = "true";
                    input.type = "password";
                    input.style.paddingRight = "2.2rem";
                    
                    const toggleBtn = document.createElement("button");
                    toggleBtn.type = "button";
                    toggleBtn.innerHTML = "👁️";
                    toggleBtn.style.cssText = "position: absolute; right: 0.5rem; background: none; border: none; cursor: pointer; font-size: 1rem; color: #a1a1aa; padding: 2px;";
                    toggleBtn.title = "Toggle Show/Hide Key";
                    
                    toggleBtn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (input.type === "password") {
                            input.type = "text";
                            toggleBtn.innerHTML = "🙈";
                        } else {
                            input.type = "password";
                            toggleBtn.innerHTML = "👁️";
                        }
                    };

                    const container = input.parentElement;
                    if (container) {
                        container.style.position = "relative";
                        container.appendChild(toggleBtn);
                    }
                }

                // Color picker popup & Reset Default button for Pause button colors
                if ((text.includes("Pause Button Unpaused Color") || text.includes("Pause Button Paused Color")) && !input.dataset.colorPickerAttached) {
                    input.dataset.colorPickerAttached = "true";
                    const isUnpaused = text.includes("Unpaused Color");
                    const defaultHex = isUnpaused ? "#059669" : "#ea580c";
                    
                    const colorPicker = document.createElement("input");
                    colorPicker.type = "color";
                    colorPicker.dataset.isColorPicker = "true";
                    colorPicker.dataset.colorPickerAttached = "true";
                    colorPicker.value = input.value || defaultHex;
                    colorPicker.style.cssText = "width: 28px; height: 28px; border: none; border-radius: 4px; cursor: pointer; padding: 0; background: none; vertical-align: middle; margin-left: 8px;";
                    
                    const resetBtn = document.createElement("button");
                    resetBtn.type = "button";
                    resetBtn.innerText = "↺ Reset";
                    resetBtn.title = `Reset to default color (${defaultHex})`;
                    resetBtn.style.cssText = "margin-left: 8px; padding: 2px 8px; background: #333; color: #ccc; border: 1px solid #444; border-radius: 4px; font-size: 11px; cursor: pointer;";
                    resetBtn.onmouseover = () => resetBtn.style.background = "#444";
                    resetBtn.onmouseout = () => resetBtn.style.background = "#333";
                    
                    resetBtn.onclick = (e) => {
                        e.preventDefault();
                        input.value = defaultHex;
                        colorPicker.value = defaultHex;
                        input.dispatchEvent(new Event("change", { bubbles: true }));
                        const varName = isUnpaused ? "--pq-unpaused-color" : "--pq-paused-color";
                        document.documentElement.style.setProperty(varName, defaultHex);
                    };

                    colorPicker.oninput = (e) => {
                        input.value = e.target.value;
                        input.dispatchEvent(new Event("change", { bubbles: true }));
                        const varName = isUnpaused ? "--pq-unpaused-color" : "--pq-paused-color";
                        document.documentElement.style.setProperty(varName, e.target.value);
                    };

                    input.oninput = (e) => {
                        colorPicker.value = e.target.value;
                        const varName = isUnpaused ? "--pq-unpaused-color" : "--pq-paused-color";
                        document.documentElement.style.setProperty(varName, e.target.value);
                    };

                    const container = input.parentElement;
                    if (container) {
                        container.style.display = "flex";
                        container.style.alignItems = "center";
                        container.appendChild(colorPicker);
                        container.appendChild(resetBtn);
                    }
                }
            });
        };

        setInterval(() => {
            applyKeyMasking();
        }, 1000);
    }
});
