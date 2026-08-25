import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

app.registerExtension({
    name: "ComfyUI.LeafFlow.PromptQueueIterator",
    async setup() {
        if (api && api.addEventListener) {
            api.addEventListener("leafflow_prompt_iterator_progress", (event) => {
                const data = event.detail;
                if (!data || !data.node_id) return;
                const node = app.graph?.getNodeById(data.node_id);
                if (node && node.widgets) {
                    const statusWidget = node.widgets.find(w => w.name === "🍃 Progress");
                    if (statusWidget) {
                        statusWidget.value = `🍃 Run ${data.current_run} / ${data.total_runs}`;
                        app.graph?.setDirtyCanvas(true, true);
                    }
                }
            });
        }
    },
    async nodeCreated(node) {
        if (node.comfyClass === "PromptQueueIterator") {
            // 1. Live Progress Status Widget
            const statusWidget = node.addWidget("text", "🍃 Progress", "🍃 Ready (-- / --)", () => {}, { serialize: false });
            statusWidget.disabled = true;

            // 2. Reset Counter (0) Button
            const resetBtn = node.addWidget("button", "🔄 Reset Counter (0)", null, async () => {
                try {
                    resetBtn.name = "⏳ Resetting...";
                    app.graph?.setDirtyCanvas(true, true);
                    const resp = await api.fetchApi("/leafflow/prompt_iterator/reset_node", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ node_id: String(node.id) })
                    });
                    const res = await resp.json();
                    if (res && res.status === "ok") {
                        resetBtn.name = "✅ Reset to 0!";
                        statusWidget.value = "🍃 Reset (0 / --)";
                    } else {
                        resetBtn.name = "⚠️ Error";
                    }
                } catch (e) {
                    console.error("[LeafFlow] 🍃 Error resetting counter:", e);
                    resetBtn.name = "❌ Failed";
                }
                setTimeout(() => {
                    resetBtn.name = "🔄 Reset Counter (0)";
                    app.graph?.setDirtyCanvas(true, true);
                }, 1200);
            });
            resetBtn.serialize = false;

            // 3. Open Queue File in Default OS Editor Button
            const openFileBtn = node.addWidget("button", "📂 Open Queue File", null, async () => {
                try {
                    openFileBtn.name = "⏳ Opening...";
                    app.graph?.setDirtyCanvas(true, true);
                    const resp = await api.fetchApi("/leafflow/prompt_iterator/open_file", { method: "POST" });
                    const res = await resp.json();
                    if (res && res.status === "ok") {
                        openFileBtn.name = "✅ Opened in Editor!";
                    } else {
                        openFileBtn.name = "⚠️ Error";
                    }
                } catch (e) {
                    console.error("[LeafFlow] 🍃 Error opening state file:", e);
                    openFileBtn.name = "❌ Failed";
                }
                setTimeout(() => {
                    openFileBtn.name = "📂 Open Queue File";
                    app.graph?.setDirtyCanvas(true, true);
                }, 1500);
            });
            openFileBtn.serialize = false;
        }
    }
});
