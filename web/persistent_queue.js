import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

app.registerExtension({
    name: "ComfyUI.FlowControl.PersistentQueue",
    async setup() {
        const claimQueueOwnership = async () => {
            if (api.clientId) {
                try {
                    await api.fetchApi("/persistent_queue/claim", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ client_id: api.clientId })
                    });
                } catch (e) {
                    console.error("[FlowControl] Error claiming queue ownership:", e);
                }
            }
        };

        claimQueueOwnership();

        api.addEventListener("status", () => {
            claimQueueOwnership();
        }, { once: true });
    }
});
