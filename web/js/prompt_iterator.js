import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

app.registerExtension({
    name: "ComfyUI.LeafFlow.PromptQueueIterator",
    async nodeCreated(node) {
        if (node.comfyClass === "PromptQueueIterator") {
            const btn = node.addWidget("button", "🔄 Reset / Clear State", null, async () => {
                try {
                    btn.name = "⏳ Clearing...";
                    app.graph?.setDirtyCanvas(true, true);
                    const resp = await api.fetchApi("/leafflow/prompt_iterator/clear", { method: "POST" });
                    const res = await resp.json();
                    if (res && res.status === "ok") {
                        btn.name = "✅ State Reset!";
                    } else {
                        btn.name = "⚠️ Reset Error";
                    }
                } catch (e) {
                    console.error("[LeafFlow] 🍃 Error resetting prompt iterator state:", e);
                    btn.name = "❌ Failed";
                }
                setTimeout(() => {
                    btn.name = "🔄 Reset / Clear State";
                    app.graph?.setDirtyCanvas(true, true);
                }, 1500);
            });
            btn.serialize = false;
        }
    }
});
