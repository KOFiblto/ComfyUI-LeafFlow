import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

app.registerExtension({
    name: "ComfyUI.LeafFlow.PersistentQueue",
    async setup() {
        const patchRgthree = async () => {
            try {
                const rgthree = await import("/extensions/rgthree-comfy/common/prompt_service.js");
                if (rgthree && rgthree.SERVICE) {
                    const queue = await api.getQueue();
                    const allItems = [...(queue.Running || []), ...(queue.Pending || [])];
                    let patched = false;
                    for (const item of allItems) {
                        const promptId = item[1];
                        const promptData = item[2];
                        if (promptId && promptData) {
                            const promptExecution = rgthree.SERVICE.getOrMakePrompt(promptId);
                            if (!promptExecution.totalNodes) {
                                promptExecution.setPrompt({ output: promptData });
                                patched = true;
                            }
                        }
                    }
                    if (patched) {
                        rgthree.SERVICE.dispatchProgressUpdate();
                        console.log("[LeafFlow] Synced recovered queue with rgthree-comfy.");
                    }
                }
            } catch (e) {
                // rgthree-comfy not installed or path changed, ignore
            }
        };

        const claimQueueOwnership = async () => {
            if (api && api.clientId) {
                try {
                    await api.fetchApi("/persistent_queue/claim", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ client_id: api.clientId })
                    });
                    
                    // Wait for server to sync queue state back to clients, then patch rgthree
                    setTimeout(patchRgthree, 500);
                } catch (e) {
                    console.error("[LeafFlow] Error claiming queue ownership:", e);
                }
            }
        };

        // Delay execution until after app & API client ID initialization
        setTimeout(claimQueueOwnership, 1000);

        if (api && api.addEventListener) {
            api.addEventListener("status", () => {
                claimQueueOwnership();
            }, { once: true });
            
            // Also run patch anytime an execution starts just in case it was triggered externally
            api.addEventListener("execution_start", () => {
                setTimeout(patchRgthree, 100);
            });
        }
    }
});
