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
        // GRUPPE 1: 1 🖼️ Visual Loaders (Civitai & TMDB Duo)
        // =========================================================================

        // 1.1 Civitai API Key
        app.ui.settings.addSetting({
            id: "LeafFlow.1 🖼️ Visual Loaders.01_CivitaiApiKey",
            name: "Civitai API Key",
            type: "text",
            defaultValue: "",
            tooltip: "Optional. Civitai SHA256 search works publicly without a key for normal models. Only needed for NSFW/private models or higher rate limits. Whitespace is automatically stripped.",
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
            id: "LeafFlow.1 🖼️ Visual Loaders.02_EnableCivitaiScraping",
            name: "Enable Civitai Auto-Scraping",
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
            id: "LeafFlow.1 🖼️ Visual Loaders.03_TMDBApiKey",
            name: "TMDB Access Token",
            type: "text",
            defaultValue: "",
            tooltip: "Optional. Accepts TMDB v3 API keys or TMDB v4 Read Access Tokens (eyJ...). Used for celebrity poster and preview image lookup. Whitespace is automatically stripped.",
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
            id: "LeafFlow.1 🖼️ Visual Loaders.04_EnableTMDBScraping",
            name: "Enable TMDB Auto-Scraping",
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
            id: "LeafFlow.1 🖼️ Visual Loaders.05_EnableLoraUsage",
            name: "Enable LoRA Usage Tracking",
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
            id: "LeafFlow.1 🖼️ Visual Loaders.06_ResetScrapesCache",
            name: "Reset Failed Scrapes Cache",
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
        // GRUPPE 2: 2 🔄 Prompt Queue Iterator
        // =========================================================================

        // 2.1 Clear Prompt Iterator State on Launch (default: false)
        app.ui.settings.addSetting({
            id: "LeafFlow.2 🔄 Prompt Iterator.01_ClearOnLaunch",
            name: "Clear State on Launch",
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
            id: "LeafFlow.2 🔄 Prompt Iterator.02_ResetActiveQueues",
            name: "Reset Active Queues State",
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
        // GRUPPE 3: 3 ⭐ Favorite Prompts
        // =========================================================================

        // 3.1 Favorites Folder Path
        app.ui.settings.addSetting({
            id: "LeafFlow.3 ⭐ Favorite Prompts.01_FavoritesFolder",
            name: "Favorites Save Folder Path",
            type: "text",
            defaultValue: "output/favorites",
            tooltip: "Directory path where saved favorite prompts and preview images are stored.",
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
        // GRUPPE 4: 4 ⏸️ Pause & Resume Controls
        // =========================================================================

        // 4.1 Default Pause Queue State on Launch
        app.ui.settings.addSetting({
            id: "LeafFlow.4 ⏸️ Pause Controls.01_DefaultStateOnLaunch",
            name: "Default State on Launch",
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

        // 4.2 Default Pause Queue Mode on Launch
        app.ui.settings.addSetting({
            id: "LeafFlow.4 ⏸️ Pause Controls.02_DefaultPauseAction",
            name: "Default Pause Action",
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

        // 4.3 Enable Pause Queue Toolbar Button
        app.ui.settings.addSetting({
            id: "LeafFlow.4 ⏸️ Pause Controls.03_EnableToolbarButton",
            name: "Enable Top Toolbar Button",
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

        // 4.4 Toolbar Button Unpaused Color
        app.ui.settings.addSetting({
            id: "LeafFlow.4 ⏸️ Pause Controls.04_ToolbarButtonUnpausedColor",
            name: "Toolbar Button Unpaused Color",
            type: "text",
            defaultValue: "#059669",
            tooltip: "Hex color code for the Pause toolbar button when execution is unpaused/running (default: #059669).",
            onChange(value) {
                document.documentElement.style.setProperty("--pq-unpaused-color", value || "#059669");
            }
        });

        // 4.5 Toolbar Button Paused Color
        app.ui.settings.addSetting({
            id: "LeafFlow.4 ⏸️ Pause Controls.05_ToolbarButtonPausedColor",
            name: "Toolbar Button Paused Color",
            type: "text",
            defaultValue: "#ea580c",
            tooltip: "Hex color code for the Pause toolbar button when execution is paused (default: #ea580c).",
            onChange(value) {
                document.documentElement.style.setProperty("--pq-paused-color", value || "#ea580c");
            }
        });

        // 4.6 Enable System Tray Icon
        app.ui.settings.addSetting({
            id: "LeafFlow.4 ⏸️ Pause Controls.06_EnableTrayIcon",
            name: "Enable System Tray Icon",
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


        // =========================================================================
        // GRUPPE 5: 5 💾 Persistent Queue (Auto-Recovery)
        // =========================================================================

        // 5.1 Enable Persistent Queue (Auto-Recovery)
        app.ui.settings.addSetting({
            id: "LeafFlow.5 💾 Persistent Queue.01_EnablePersistentQueue",
            name: "Enable Persistent Queue (Auto-Recovery)",
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

        // 5.2 Persistent Queue Restored Launch State
        app.ui.settings.addSetting({
            id: "LeafFlow.5 💾 Persistent Queue.02_RecoveryLaunchState",
            name: "Recovery Launch State",
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


        // =========================================================================
        // GRUPPE 6: 6 🖼️ Assets & History Restore
        // =========================================================================

        // 6.1 Enable Assets / History Restore on Launch
        app.ui.settings.addSetting({
            id: "LeafFlow.6 🖼️ Assets Restore.01_RestoreAssetsOnLaunch",
            name: "Restore Assets on Launch",
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

        // 6.2 Restored Assets Count
        app.ui.settings.addSetting({
            id: "LeafFlow.6 🖼️ Assets Restore.02_RestoredAssetsCount",
            name: "Restored Assets Count",
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


        // =========================================================================
        // GRUPPE 7: 7 🩺 Diagnostics & Debug
        // =========================================================================

        // 7.1 Export Debug Profile Button
        app.ui.settings.addSetting({
            id: "LeafFlow.7 🩺 Diagnostics.01_ExportDebugProfile",
            name: "Export Debug Profile",
            type: "button",
            defaultValue: "📥 Export Debug Profile",
            tooltip: "Exports non-sensitive environment diagnostics (OS, Python, PyTorch, LeafFlow settings, local counts) as a JSON file to share when troubleshooting issues.",
            attrs: {
                onClick: async () => {
                    const approved = confirm("🍃 ComfyUI-LeafFlow Diagnostics Export\n\nExport system diagnostics for troubleshooting?\n\nNOTE: Sensitive API keys, tokens, file paths, and private prompt texts are automatically stripped and NEVER exported.");
                    if (!approved) return;

                    try {
                        const resp = await api.fetchApi("/leafflow/debug/export");
                        const data = await resp.json();
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `leafflow_debug_profile_${new Date().toISOString().slice(0, 10)}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        alert("✅ Diagnostics profile exported successfully! You can attach the downloaded JSON file to your bug report or GitHub issue.");
                    } catch (e) {
                        console.error("[LeafFlow] 🍃 Error exporting debug profile:", e);
                        alert("❌ Failed to export debug profile: " + e.message);
                    }
                }
            }
        });
    }
});
