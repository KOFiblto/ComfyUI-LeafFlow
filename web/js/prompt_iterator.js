import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

app.registerExtension({
    name: "ComfyUI.FlowControl.PromptQueueIterator",
    async setup() {
        api.addEventListener("flowcontrol_update_prompt_iterator", (event) => {
            const data = event.detail;
            if (!data || !data.node_id) return;

            const nodeId = String(data.node_id);
            const node = app.graph._nodes?.find(n => n && String(n.id) === nodeId);
            if (node) {
                const widget = node.widgets?.find(w => w.name === "prompt_text");
                if (widget) {
                    widget.value = data.remaining_text;
                    app.graph.setDirtyCanvas(true, true);
                }
            }
        });
    }
});
