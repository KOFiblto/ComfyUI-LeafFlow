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

        // 2. Civitai API Key Setting
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

        // 4. TMDB API Key Setting
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
    }
});
