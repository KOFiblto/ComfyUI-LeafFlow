import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

app.registerExtension({
    name: "ComfyUI.FlowControl.Settings",
    async setup() {
        // 1. Civitai API Key Setting with Password Masking & Eye Icon Toggle
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

        // 2. TMDB API Key Setting with Password Masking & Eye Icon Toggle
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

        // 3. Default Pause Queue State (Paused vs Running)
        app.ui.settings.addSetting({
            id: "FlowControl.DefaultPauseState",
            name: "🍃 FlowControl: Default Pause Queue State on Launch",
            type: "combo",
            options: ["Paused", "Running"],
            defaultValue: "Paused",
            tooltip: "Choose whether the queue starts in Paused state or Running state on ComfyUI startup.",
            onChange(value) {
                api.fetchApi("/flow_control/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ default_pause_state: value })
                }).catch(() => {});
            }
        });

        // 4. Default Pause Queue Mode (Finish vs Instant)
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

        // 5. Pause Queue Toolbar Toggle Setting
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

        // 6. Enable Persistent Queue Setting
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

        // 7. Pause Alert Sounds Setting
        app.ui.settings.addSetting({
            id: "FlowControl.EnableSoundAlerts",
            name: "🍃 FlowControl: Enable Sound Alert on Pause",
            type: "boolean",
            defaultValue: false,
            tooltip: "Plays a gentle audio notification when queue execution pauses."
        });

        // Add eye icon toggle handler to censor API key input elements in ComfyUI settings dialog
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
