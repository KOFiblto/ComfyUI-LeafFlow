import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

/**
 * Custom renderer for real, styled action buttons in ComfyUI Settings Modal.
 */
function renderSettingButton(label, workingText, successText, onClickHandler) {
    return (name, setter, value) => {
        const container = document.createElement("div");
        container.style.cssText = "display: flex; align-items: center; justify-content: flex-end; width: 100%; padding: 2px 0;";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = label;
        btn.className = "p-button leafflow-custom-setting-btn";
        btn.style.cssText = `
            padding: 6px 14px;
            background: #23272e;
            color: #eceff4;
            border: 1px solid #4c566a;
            border-radius: 6px;
            font-weight: bold;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            outline: none;
            min-width: 140px;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        `;

        btn.onmouseover = () => {
            if (!btn.disabled) {
                btn.style.background = "#2e7d32";
                btn.style.borderColor = "#4caf50";
                btn.style.color = "#ffffff";
            }
        };
        btn.onmouseout = () => {
            if (!btn.disabled) {
                btn.style.background = "#23272e";
                btn.style.borderColor = "#4c566a";
                btn.style.color = "#eceff4";
            }
        };

        btn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            btn.disabled = true;
            btn.style.opacity = "0.7";
            btn.textContent = workingText || "⏳ Working...";
            try {
                await onClickHandler();
                btn.textContent = successText || "✅ Done!";
                btn.style.background = "#1b5e20";
                btn.style.borderColor = "#2e7d32";
                btn.style.color = "#ffffff";
            } catch (err) {
                console.error("[LeafFlow] Button action failed:", err);
                btn.textContent = "❌ Error";
                btn.style.background = "#c62828";
                btn.style.borderColor = "#e53935";
            }
            setTimeout(() => {
                btn.textContent = label;
                btn.disabled = false;
                btn.style.opacity = "1";
                btn.style.background = "#23272e";
                btn.style.borderColor = "#4c566a";
                btn.style.color = "#eceff4";
            }, 1800);
        };

        container.appendChild(btn);
        return container;
    };
}

app.registerExtension({
    name: "ComfyUI.LeafFlow.Settings",
    async setup() {
        // =========================================================================
        // GRUPPE 1: 🍃 🖼️ Visual LoRA & Image Loaders (Civitai & TMDB Duo)
        // =========================================================================

        // 1.1 Civitai API Key
        app.ui.settings.addSetting({
            id: "LeafFlow.1.1 🖼️ Civitai API Key",
            name: "Optional key for NSFW/private models and higher rate limits.",
            type: "text",
            defaultValue: "",
            tooltip: "Civitai SHA256 search works publicly without a key for normal models. Only needed for NSFW/private models or higher rate limits. Whitespace is automatically stripped.",
            onChange(value) {
                const cleanKey = (value || "").trim();
                api.fetchApi("/leafflow/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ civitai_api_key: cleanKey })
                }).catch(() => {});
            }
        });

        // 1.2 Enable Civitai Auto-Scraping Toggle (default: true)
        app.ui.settings.addSetting({
            id: "LeafFlow.1.2 🖼️ Enable Civitai Auto-Scraping",
            name: "Auto-download model preview thumbnails via SHA256 hash.",
            type: "boolean",
            defaultValue: true,
            tooltip: "Toggles automated downloading of preview thumbnails for new LoRAs from Civitai via SHA256 file hashes. Note: SHA256 hash searching will always work regardless of this setting when matching local models.",
            onChange(value) {
                api.fetchApi("/leafflow/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ enable_civitai_scraping: value ? "true" : "false" })
                }).catch(() => {});
            }
        });

        // 1.3 TMDB Access Token
        app.ui.settings.addSetting({
            id: "LeafFlow.1.3 🖼️ TMDB Access Token",
            name: "Optional TMDB v3 API Key or v4 Read Access Token (eyJ...).",
            type: "text",
            defaultValue: "",
            tooltip: "Used for automated celebrity poster and preview image lookup. Whitespace is automatically stripped.",
            onChange(value) {
                const cleanKey = (value || "").trim();
                api.fetchApi("/leafflow/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tmdb_api_key: cleanKey })
                }).catch(() => {});
            }
        });

        // 1.4 Enable TMDB Auto-Scraping Toggle (default: false)
        app.ui.settings.addSetting({
            id: "LeafFlow.1.4 🖼️ Enable TMDB Auto-Scraping",
            name: "Auto-download celebrity previews from TMDB (Default: OFF).",
            type: "boolean",
            defaultValue: false,
            tooltip: "Toggles automated downloading of celebrity preview thumbnails from TMDB. Default is disabled.",
            onChange(value) {
                api.fetchApi("/leafflow/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ enable_tmdb_scraping: value ? "true" : "false" })
                }).catch(() => {});
            }
        });

        // 1.5 Enable LoRA Usage Tracking (default: true)
        app.ui.settings.addSetting({
            id: "LeafFlow.1.5 🖼️ Enable LoRA Usage Tracking",
            name: "Track selection count and display badges in LoRA picker.",
            type: "boolean",
            defaultValue: true,
            tooltip: "Toggles tracking and displaying LoRA usage counts & visual rank badges (🔥, Gold, Silver, Bronze) in the LoRA picker. Existing usage history is preserved when disabled.",
            onChange(value) {
                api.fetchApi("/leafflow/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ enable_lora_usage: value ? "true" : "false" })
                }).catch(() => {});
            }
        });

        // 1.6 Reset Scrapes Cache Button
        app.ui.settings.addSetting({
            id: "LeafFlow.1.6 🖼️ Reset Failed Scrapes Cache",
            name: "Clear failed downloads history so missing previews can be rescanned.",
            type: "button",
            defaultValue: "🗑️ Reset Scrapes Cache",
            tooltip: "Immediately clears failed_scrapes.json so Civitai and TMDB can retry downloading missing preview thumbnails on the next folder scan.",
            attrs: {
                onClick: async () => {
                    try {
                        const resp = await api.fetchApi("/leafflow/scrapes/clear", { method: "POST" });
                        const data = await resp.json();
                        if (data && data.status === "ok") {
                            alert("LeafFlow: Failed scrapes cache successfully reset!");
                        } else {
                            alert("LeafFlow: Failed to reset cache.");
                        }
                    } catch (err) {
                        alert("LeafFlow: Error resetting cache: " + err);
                    }
                }
            },
            render: renderSettingButton("🗑️ Reset Scrapes Cache", "⏳ Clearing...", "✅ Cache Reset!", async () => {
                const resp = await api.fetchApi("/leafflow/scrapes/clear", { method: "POST" });
                const data = await resp.json();
                if (data.status !== "ok") {
                    throw new Error(data.message || "Failed to reset scrapes cache");
                }
            })
        });


        // =========================================================================
        // GRUPPE 2: 🍃 🔄 Prompt Queue Iterator
        // =========================================================================

        // 2.1 Clear Prompt Iterator State on Launch (default: false)
        app.ui.settings.addSetting({
            id: "LeafFlow.2.1 🔄 Clear State on Launch",
            name: "Empty prompt queue state file on ComfyUI startup (Privacy).",
            type: "boolean",
            defaultValue: false,
            tooltip: "Privacy setting. When enabled, prompt_iterator_state.json will be emptied automatically every time ComfyUI starts up.",
            onChange(value) {
                api.fetchApi("/leafflow/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ clear_prompt_iterator_on_launch: value ? "true" : "false" })
                }).catch(() => {});
            }
        });

        // 2.2 Reset Prompt Iterator Queues Now
        app.ui.settings.addSetting({
            id: "LeafFlow.2.2 🔄 Reset Active Queues Now",
            name: "Empty all active multiline prompt queues and reset counter state.",
            type: "button",
            defaultValue: "🔄 Reset All Queues",
            tooltip: "Immediately empties all active prompt queues and resets iterator state across all workflows.",
            attrs: {
                onClick: async () => {
                    try {
                        const resp = await api.fetchApi("/leafflow/prompt_iterator/clear", { method: "POST" });
                        const data = await resp.json();
                        if (data && data.status === "ok") {
                            alert("LeafFlow: Prompt Iterator queues successfully reset!");
                        } else {
                            alert("LeafFlow: Failed to reset queues.");
                        }
                    } catch (err) {
                        alert("LeafFlow: Error resetting queues: " + err);
                    }
                }
            },
            render: renderSettingButton("🔄 Reset All Queues", "⏳ Resetting...", "✅ State Reset!", async () => {
                const resp = await api.fetchApi("/leafflow/prompt_iterator/clear", { method: "POST" });
                const data = await resp.json();
                if (data.status !== "ok") {
                    throw new Error(data.message || "Failed to clear prompt iterator state");
                }
            })
        });


        // =========================================================================
        // GRUPPE 3: 🍃 ⭐ Favorite Prompts
        // =========================================================================

        // 3.1 Favorites Folder Path
        app.ui.settings.addSetting({
            id: "LeafFlow.3.1 ⭐ Favorites Save Folder Path",
            name: "Directory path where saved favorite prompts and images are stored.",
            type: "text",
            defaultValue: "output/favorites",
            tooltip: "Directory where favorite prompts and preview images are saved.",
            onChange(value) {
                const cleanPath = (value || "").trim();
                api.fetchApi("/leafflow/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ favorites_folder: cleanPath })
                }).catch(() => {});
            }
        });


        // =========================================================================
        // GRUPPE 4: 🍃 ⏸️ Queue & Workflow Control
        // =========================================================================

        // 4.01 Default Pause Queue State on Launch
        app.ui.settings.addSetting({
            id: "LeafFlow.4.01 ⏸️ Default State on Launch",
            name: "Initial queue execution state when ComfyUI starts up.",
            type: "combo",
            options: ["Paused", "Running"],
            defaultValue: "Paused",
            tooltip: "Choose whether execution starts in Paused state or Running state on ComfyUI startup.",
            onChange(value) {
                api.fetchApi("/leafflow/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ default_pause_state: value })
                }).catch(() => {});
            }
        });

        // 4.02 Default Pause Queue Mode on Launch
        app.ui.settings.addSetting({
            id: "LeafFlow.4.02 ⏸️ Default Pause Action",
            name: "Pause behavior mode when pause trigger is activated.",
            type: "combo",
            options: ["Finish Active Prompt", "Instant Resume Node"],
            defaultValue: "Finish Active Prompt",
            tooltip: "Choose default pause behavior when the pause button or hotkey is triggered.",
            onChange(value) {
                const modeKey = (value === "Instant Resume Node" || value === "Pause (Instant)") ? "instantly" : "after_finish";
                api.fetchApi("/leafflow/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ default_pause_mode: modeKey })
                }).catch(() => {});
            }
        });

        // 4.03 Enable Persistent Queue (Auto-Recovery)
        app.ui.settings.addSetting({
            id: "LeafFlow.4.03 ⏸️ Persistent Queue Auto-Recovery",
            name: "Persist unfinished batch queue items across browser/server crashes.",
            type: "boolean",
            defaultValue: true,
            tooltip: "Automatically persists unfinished batch queue items to disk and restores them after server or browser crashes.",
            onChange(value) {
                api.fetchApi("/leafflow/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ enable_persistent_queue: value ? "true" : "false" })
                }).catch(() => {});
            }
        });

        // 4.04 Persistent Queue Restored Launch State
        app.ui.settings.addSetting({
            id: "LeafFlow.4.04 ⏸️ Recovery Launch State",
            name: "Queue state specifically for recovered items after crash restart.",
            type: "combo",
            options: ["Match Default", "Force Paused", "Force Running"],
            defaultValue: "Match Default",
            tooltip: "Override launch state when unfinished queue items are recovered on startup.",
            onChange(value) {
                api.fetchApi("/leafflow/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ persistent_queue_restored_state: value })
                }).catch(() => {});
            }
        });

        // 4.05 Enable System Tray Icon
        app.ui.settings.addSetting({
            id: "LeafFlow.4.05 ⏸️ Enable System Tray Icon",
            name: "OS system tray icon with real-time status and external controls.",
            type: "boolean",
            defaultValue: true,
            tooltip: "Displays an OS system tray icon with real-time queue status colors and outside-browser queue controls.",
            onChange(value) {
                api.fetchApi("/leafflow/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ enable_tray_icon: value ? "true" : "false" })
                }).catch(() => {});
            }
        });

        // 4.06 Enable Pause Queue Toolbar Button
        app.ui.settings.addSetting({
            id: "LeafFlow.4.06 ⏸️ Enable Top Toolbar Button",
            name: "Show green/orange Pause & Continue button in top navigation bar.",
            type: "boolean",
            defaultValue: true,
            tooltip: "Displays the green/orange Pause & Continue button group in the top action bar.",
            onChange(value) {
                const group = document.querySelector(".pq-button-group");
                if (group) {
                    group.style.display = value ? "inline-flex" : "none";
                }
            }
        });

        // 4.07 Toolbar Button Unpaused Color
        app.ui.settings.addSetting({
            id: "LeafFlow.4.07 ⏸️ Toolbar Button Unpaused Color",
            name: "Hex color for top toolbar button during active execution.",
            type: "text",
            defaultValue: "#059669",
            tooltip: "Hex color code for the Pause toolbar button when execution is unpaused/running (default: #059669).",
            onChange(value) {
                document.documentElement.style.setProperty("--pq-unpaused-color", value || "#059669");
            }
        });

        // 4.08 Toolbar Button Paused Color
        app.ui.settings.addSetting({
            id: "LeafFlow.4.08 ⏸️ Toolbar Button Paused Color",
            name: "Hex color for top toolbar button when execution is paused.",
            type: "text",
            defaultValue: "#ea580c",
            tooltip: "Hex color code for the Pause toolbar button when execution is paused (default: #ea580c).",
            onChange(value) {
                document.documentElement.style.setProperty("--pq-paused-color", value || "#ea580c");
            }
        });

        // 4.09 Enable Assets / History Restore on Launch
        app.ui.settings.addSetting({
            id: "LeafFlow.4.09 ⏸️ Restore Assets on Launch",
            name: "Populate Assets & History tab on startup with latest outputs.",
            type: "boolean",
            defaultValue: true,
            tooltip: "Automatically populates the Assets / History pane upon ComfyUI launch with your latest generated images.",
            onChange(value) {
                api.fetchApi("/leafflow/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ enable_assets_restore: value ? "true" : "false" })
                }).catch(() => {});
            }
        });

        // 4.10 Restored Assets Count
        app.ui.settings.addSetting({
            id: "LeafFlow.4.10 ⏸️ Restored Assets Count",
            name: "Number of newest output images to restore into Assets tab (Max 1000).",
            type: "number",
            defaultValue: 64,
            tooltip: "Number of newest images from the output folder to restore into the Assets / History pane on launch (default: 64).",
            onChange(value) {
                const count = parseInt(value, 10) || 64;
                api.fetchApi("/leafflow/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ restore_assets_count: count })
                }).catch(() => {});
            }
        });
    }
});
