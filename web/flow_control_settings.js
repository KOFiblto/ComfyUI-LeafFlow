import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

app.registerExtension({
    name: "ComfyUI.FlowControl.Settings",
    async setup() {
        // 1. Civitai API Key Setting
        app.ui.settings.addSetting({
            id: "FlowControl.CivitaiAPIKey",
            name: "🍃 FlowControl: Civitai API Key",
            type: "text",
            defaultValue: "",
            tooltip: "Optional Civitai API key for auto-downloading LoRA preview thumbnails by hash.",
            onChange(value) {
                api.fetchApi("/flow_control/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ civitai_api_key: value })
                }).catch(() => {});
            }
        });

        // 2. TMDB API Key Setting
        app.ui.settings.addSetting({
            id: "FlowControl.TMDBAPIKey",
            name: "🍃 FlowControl: TMDB API Key",
            type: "text",
            defaultValue: "",
            tooltip: "Optional TMDB API key for celebrity preview image search.",
            onChange(value) {
                api.fetchApi("/flow_control/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tmdb_api_key: value })
                }).catch(() => {});
            }
        });

        // 3. Pause Queue Toolbar Toggle Setting
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

        // 4. Pause Alert Sounds Setting
        app.ui.settings.addSetting({
            id: "FlowControl.EnableSoundAlerts",
            name: "🍃 FlowControl: Enable Sound Alert on Pause",
            type: "boolean",
            defaultValue: false,
            tooltip: "Plays a gentle audio notification when queue execution pauses."
        });
    }
});
