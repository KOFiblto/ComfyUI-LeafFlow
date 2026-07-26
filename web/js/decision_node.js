import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

// Create global styles for the decision buttons
const styles = document.createElement("style");
styles.textContent = `
    .flowcontrol-decision-btn {
        margin: 4px;
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        font-weight: bold;
        cursor: pointer;
        color: white;
        transition: all 0.2s;
    }
    .flowcontrol-decision-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        filter: grayscale(100%);
    }
    .flowcontrol-btn-continue { background-color: #2e7d32; }
    .flowcontrol-btn-continue:hover:not(:disabled) { background-color: #388e3c; }
    .flowcontrol-btn-cancel { background-color: #f57c00; }
    .flowcontrol-btn-cancel:hover:not(:disabled) { background-color: #fb8c00; }
    .flowcontrol-btn-stop { background-color: #d32f2f; }
    .flowcontrol-btn-stop:hover:not(:disabled) { background-color: #f44336; }
    
    .flowcontrol-decision-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        padding: 4px;
        box-sizing: border-box;
    }
`;
document.head.appendChild(styles);

app.registerExtension({
    name: "Comfy.FlowControlDecision",
    async setup() {
        api.addEventListener("flowcontrol_decision_waiting", (event) => {
            const data = event.detail;
            if (data && data.node_id) {
                const node = app.graph.getNodeById(data.node_id);
                if (node && node.enableDecisionButtons) {
                    node.enableDecisionButtons();
                }
            }
        });

        api.addEventListener("flowcontrol_decision_resolved", (event) => {
            const data = event.detail;
            if (data && data.node_id) {
                const node = app.graph.getNodeById(data.node_id);
                if (node && node.disableDecisionButtons) {
                    node.disableDecisionButtons();
                }
            }
        });
    },
    async nodeCreated(node) {
        if (node.comfyClass === "FlowControlDecision") {
            const container = document.createElement("div");
            container.className = "flowcontrol-decision-container";

            const btnContinue = document.createElement("button");
            btnContinue.className = "flowcontrol-decision-btn flowcontrol-btn-continue";
            btnContinue.innerText = "Continue Workflow";
            btnContinue.disabled = true;

            const btnCancel = document.createElement("button");
            btnCancel.className = "flowcontrol-decision-btn flowcontrol-btn-cancel";
            btnCancel.innerText = "Cancel (Return True)";
            btnCancel.disabled = true;

            const btnStop = document.createElement("button");
            btnStop.className = "flowcontrol-decision-btn flowcontrol-btn-stop";
            btnStop.innerText = "Stop Workflow";
            btnStop.disabled = true;

            container.appendChild(btnContinue);
            container.appendChild(btnCancel);
            container.appendChild(btnStop);

            const sendDecision = async (action) => {
                node.disableDecisionButtons();
                try {
                    await api.fetchApi("/flowcontrol/decision", {
                        method: "POST",
                        body: JSON.stringify({
                            node_id: node.id.toString(),
                            action: action
                        }),
                    });
                } catch (e) {
                    console.error("[FlowControl] Failed to send decision:", e);
                }
            };

            btnContinue.addEventListener("click", () => sendDecision("continue"));
            btnCancel.addEventListener("click", () => sendDecision("cancel"));
            btnStop.addEventListener("click", () => sendDecision("stop"));

            const domWidget = node.addDOMWidget("decision_ui", "HTML", container, {
                serialize: false
            });
            
            // Adjust node size to fit buttons
            node.size = [300, 240];
            const originalComputeSize = node.computeSize;
            node.computeSize = function() {
                const sz = originalComputeSize ? originalComputeSize.apply(this, arguments) : [300, 240];
                return [Math.max(300, sz[0]), Math.max(240, sz[1])];
            };
            
            domWidget.computeSize = function() {
                return [node.size[0] - 20, 120];
            };

            node.enableDecisionButtons = () => {
                btnContinue.disabled = false;
                btnCancel.disabled = false;
                btnStop.disabled = false;
                node.color = "#3a4a15";
                node.bgcolor = "#4a6311";
                if (app.graph) app.graph.setDirtyCanvas(true, true);
            };

            node.disableDecisionButtons = () => {
                btnContinue.disabled = true;
                btnCancel.disabled = true;
                btnStop.disabled = true;
                node.color = "";
                node.bgcolor = "";
                if (app.graph) app.graph.setDirtyCanvas(true, true);
            };
        }
    }
});
