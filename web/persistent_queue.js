import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

app.registerExtension({
    name: "ComfyUI.FlowControl.PersistentQueue",
    setup() {
        // Claim queue ownership after a delay to avoid blocking frontend init
        const claimQueueOwnership = () => {
            if (api && api.clientId) {
                api.fetchApi("/persistent_queue/claim", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ client_id: api.clientId })
                }).catch(e => {
                    console.error("[FlowControl] Error claiming queue ownership:", e);
                });
            }
        };

        // Wait for everything to settle, then claim
        setTimeout(claimQueueOwnership, 3000);
    }
});
