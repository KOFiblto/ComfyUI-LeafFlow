import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

app.registerExtension({
    name: "ComfyUI.FlowControl.Settings",
    async setup() {
        // 1. Enable Civitai Scraping Toggle
        app.ui.settings.addSetting({
            id: "FlowControl.EnableCivitaiScraping",
            name: "🍃 FlowControl: Enable Civitai Auto-Scraping",
            type: "boolean",
            defaultValue: true,
            tooltip: "Enable/disable downloading LoRA preview thumbnails from Civitai.",
            onChange(value) {
                api.fetchApi("/flow_control/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ enable_civitai_scraping: value ? "true" : "false" })
                }).catch(() => {});
            }
        });

        // 2. Civitai API Key Setting with Password Masking & Eye Icon Toggle
        app.ui.settings.addSetting({
            id: "FlowControl.CivitaiAPIKey",
            name: "🍃 FlowControl: Civitai API Key",
            type: "text",
            defaultValue: "",
            tooltip: "Optional. Civitai API works publicly without a key for normal models. Only required for NSFW models, private models, or higher API rate limits.",
            onChange(value) {
                api.fetchApi("/flow_control/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ civitai_api_key: value })
                }).catch(() => {});
            }
        });

        // 3. Enable TMDB Scraping Toggle
        app.ui.settings.addSetting({
            id: "FlowControl.EnableTMDBScraping",
            name: "🍃 FlowControl: Enable TMDB Auto-Scraping",
            type: "boolean",
            defaultValue: true,
            tooltip: "Enable/disable downloading celebrity preview thumbnails from TMDB.",
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
            name: "🍃 FlowControl: TMDB API Key",
            type: "text",
            defaultValue: "",
            tooltip: "Optional. Only needed if auto-scraping celebrity preview thumbnails from TMDB.",
            onChange(value) {
                api.fetchApi("/flow_control/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tmdb_api_key: value })
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

        // 6. Default Pause Queue Mode (Finish vs Instant)
        app.ui.settings.addSetting({
            id: "FlowControl.DefaultPauseMode",
            name: "🍃 FlowControl: Default Pause Queue Mode on Launch",
            type: "combo",
            options: ["Pause (Finish)", "Pause (Instant)"],
            defaultValue: "Pause (Finish)",
            tooltip: "Choose default pause behavior mode on ComfyUI startup.",
            onChange(value) {
                const modeKey = value === "Pause (Instant)" ? "instantly" : "after_finish";
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

        // Masking password inputs for API keys in ComfyUI settings dialog
        const applyKeyMasking = () => {
            const inputs = document.querySelectorAll('input');
            inputs.forEach(input => {
                const settingRow = input.closest('tr') || input.parentElement;
                if (!settingRow) return;
                const text = settingRow.textContent || "";
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
            });
        };

        const observer = new MutationObserver(() => {
            applyKeyMasking();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
});
