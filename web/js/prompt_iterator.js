import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

app.registerExtension({
    name: "ComfyUI.FlowControl.PromptQueueIterator",
    async setup() {
        // Passive registration; prompt iteration state is managed cleanly in backend
    }
});

