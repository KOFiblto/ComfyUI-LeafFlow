import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

const EXTENSION_NAME = "LeafFlow.PowerControlSidebar";
const STYLE_ID = "leafflow-power-sidebar-styles";

let currentPowerState = {
    pending_action: null,
    armed_at: null,
    is_paused: false
};

function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        /* Power Sidebar Button */
        .leafflow-power-sidebar-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            padding: 8px;
            border-radius: 6px;
            transition: all 0.2s ease;
            color: var(--descrip-text, #9ca3af);
            background: transparent;
            border: none;
            outline: none;
            width: 100%;
            box-sizing: border-box;
        }

        .leafflow-power-sidebar-btn:hover {
            color: var(--fg-color, #f4f4f5);
            background: rgba(255, 255, 255, 0.08);
        }

        /* Power Sidebar Armed Red Warning State */
        .leafflow-power-btn-armed,
        .side-bar-button:has(.leafflow-power-icon-armed),
        button[aria-label*="Power"]:has(.leafflow-power-icon-armed),
        button[data-testid="leafflow-power-tab-button"].leafflow-power-btn-armed,
        .leafflow-power-sidebar-btn.leafflow-power-btn-armed {
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%) !important;
            color: #ffffff !important;
            border: 1px solid #f87171 !important;
            border-radius: 6px !important;
            box-shadow: 0 0 14px rgba(239, 68, 68, 0.8) !important;
            animation: leafflow-power-pulse 1.8s infinite ease-in-out !important;
        }

        .leafflow-power-btn-armed svg,
        .leafflow-power-btn-armed .side-bar-button-icon,
        .leafflow-power-btn-armed i,
        .leafflow-power-btn-armed span {
            color: #ffffff !important;
            stroke: #ffffff !important;
        }

        @keyframes leafflow-power-pulse {
            0% { box-shadow: 0 0 6px rgba(239, 68, 68, 0.5); transform: scale(1); }
            50% { box-shadow: 0 0 16px rgba(239, 68, 68, 0.95); transform: scale(1.03); }
            100% { box-shadow: 0 0 6px rgba(239, 68, 68, 0.5); transform: scale(1); }
        }

        /* Power Dialog Modal */
        .leafflow-power-modal {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 18px;
            min-width: 330px;
            max-width: 440px;
            background: #18181b;
            color: #f4f4f5;
            border-radius: 12px;
            font-family: inherit;
        }

        .leafflow-power-status-box {
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .leafflow-power-status-armed {
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.5);
            color: #f87171;
            animation: leafflow-power-pulse 2s infinite ease-in-out;
        }

        .leafflow-power-menu-btn {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            border-radius: 8px;
            border: 1px solid #3f3f46;
            background: #27272a;
            color: #f4f4f5;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: left;
            width: 100%;
        }

        .leafflow-power-menu-btn:hover {
            background: #3f3f46;
            border-color: #71717a;
            transform: translateY(-1px);
        }

        .leafflow-power-menu-btn.btn-restart:hover {
            background: rgba(59, 130, 246, 0.25);
            border-color: #60a5fa;
            color: #93c5fd;
        }

        .leafflow-power-menu-btn.btn-shutdown:hover {
            background: rgba(239, 68, 68, 0.25);
            border-color: #f87171;
            color: #fca5a5;
        }

        .leafflow-power-menu-btn.btn-cancel {
            background: rgba(239, 68, 68, 0.85);
            border-color: #ef4444;
            color: #ffffff;
            justify-content: center;
            margin-top: 4px;
        }

        .leafflow-power-menu-btn.btn-cancel:hover {
            background: #dc2626;
            box-shadow: 0 0 10px rgba(239, 68, 68, 0.6);
        }
    `;
    document.head.appendChild(style);
}

function getPowerIconSvg(size = 18) {
    return `<svg class="size-4.5" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>`;
}

function updateSidebarButtonVisuals() {
    const isArmed = Boolean(currentPowerState.pending_action);
    const btns = document.querySelectorAll('[aria-label*="Power"], .side-bar-button:has(.pi-power), [data-testid="leafflow-power-tab-button"], .leafflow-power-sidebar-btn');
    btns.forEach(btn => {
        if (isArmed) {
            btn.classList.add("leafflow-power-btn-armed");
            const icon = btn.querySelector(".side-bar-button-icon, i, svg");
            if (icon) icon.classList.add("leafflow-power-icon-armed");
            btn.setAttribute("title", `⚠️ ComfyUI Power: Armed to ${currentPowerState.pending_action.toUpperCase()} after queue finish! Click to cancel.`);
        } else {
            btn.classList.remove("leafflow-power-btn-armed");
            const icon = btn.querySelector(".side-bar-button-icon, i, svg");
            if (icon) icon.classList.remove("leafflow-power-icon-armed");
            btn.setAttribute("title", "ComfyUI Power Control (Restart / Shutdown)");
        }
    });
}

async function fetchPowerStatus() {
    try {
        const resp = await api.fetchApi("/leafflow/power/status");
        if (resp.ok) {
            currentPowerState = await resp.json();
            updateSidebarButtonVisuals();
        }
    } catch (_) {}
}

function openConfirmModal(title, message, onConfirm, isDanger = false) {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.backgroundColor = "rgba(0,0,0,0.75)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "10005";
    overlay.style.backdropFilter = "blur(3px)";

    const modal = document.createElement("div");
    modal.className = "leafflow-power-modal";
    modal.style.border = isDanger ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid rgba(59, 130, 246, 0.5)";
    modal.style.boxShadow = isDanger ? "0 0 25px rgba(239, 68, 68, 0.35)" : "0 0 25px rgba(59, 130, 246, 0.35)";

    const header = document.createElement("div");
    header.style.fontSize = "16px";
    header.style.fontWeight = "bold";
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.gap = "8px";
    header.innerHTML = isDanger ? `⚠️ ${title}` : `ℹ️ ${title}`;

    const desc = document.createElement("div");
    desc.style.fontSize = "13px";
    desc.style.lineHeight = "1.5";
    desc.style.color = "#d4d4d8";
    desc.textContent = message;

    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.justifyContent = "flex-end";
    btnRow.style.gap = "8px";
    btnRow.style.marginTop = "8px";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.padding = "8px 16px";
    cancelBtn.style.borderRadius = "6px";
    cancelBtn.style.border = "1px solid #52525b";
    cancelBtn.style.background = "#27272a";
    cancelBtn.style.color = "#f4f4f5";
    cancelBtn.style.cursor = "pointer";
    cancelBtn.onclick = () => overlay.remove();

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "Confirm";
    confirmBtn.style.padding = "8px 16px";
    confirmBtn.style.borderRadius = "6px";
    confirmBtn.style.border = "none";
    confirmBtn.style.fontWeight = "600";
    confirmBtn.style.cursor = "pointer";
    if (isDanger) {
        confirmBtn.style.background = "#dc2626";
        confirmBtn.style.color = "#ffffff";
    } else {
        confirmBtn.style.background = "#2563eb";
        confirmBtn.style.color = "#ffffff";
    }

    confirmBtn.onclick = async () => {
        overlay.remove();
        if (onConfirm) await onConfirm();
    };

    btnRow.append(cancelBtn, confirmBtn);
    modal.append(header, desc, btnRow);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

function showPowerMenu() {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.backgroundColor = "rgba(0,0,0,0.65)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "10000";
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };

    const modal = document.createElement("div");
    modal.className = "leafflow-power-modal";

    const titleRow = document.createElement("div");
    titleRow.style.display = "flex";
    titleRow.style.alignItems = "center";
    titleRow.style.justifyContent = "space-between";
    titleRow.innerHTML = `<span style="font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;">${getPowerIconSvg(18)} ComfyUI Power Control</span>`;

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.style.background = "transparent";
    closeBtn.style.border = "none";
    closeBtn.style.color = "#a1a1aa";
    closeBtn.style.fontSize = "16px";
    closeBtn.style.cursor = "pointer";
    closeBtn.onclick = () => overlay.remove();
    titleRow.appendChild(closeBtn);
    modal.appendChild(titleRow);

    // Status display ONLY when armed (removed green idle box)
    if (currentPowerState.pending_action) {
        const statusBox = document.createElement("div");
        statusBox.className = "leafflow-power-status-box leafflow-power-status-armed";
        statusBox.innerHTML = `<span>⚠️ <b>Armed Action:</b> Scheduled to <b>${currentPowerState.pending_action.toUpperCase()}</b> as soon as the queue finishes (idle state).</span>`;
        modal.appendChild(statusBox);
    }

    // Cancel / Disarm Button if currently armed
    if (currentPowerState.pending_action) {
        const cancelArmedBtn = document.createElement("button");
        cancelArmedBtn.className = "leafflow-power-menu-btn btn-cancel";
        cancelArmedBtn.innerHTML = `<span>🛑 <b>Cancel Scheduled ${currentPowerState.pending_action.toUpperCase()}</b></span>`;
        cancelArmedBtn.onclick = async () => {
            overlay.remove();
            await api.fetchApi("/leafflow/power/arm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: null })
            });
            await fetchPowerStatus();
            if (app.extensionManager?.toast?.add) {
                app.extensionManager.toast.add({
                    severity: "info",
                    summary: "🍃 LeafFlow Power",
                    detail: "Scheduled power action has been cancelled.",
                    life: 4000
                });
            }
        };
        modal.appendChild(cancelArmedBtn);
    }

    // 1. Restart Immediate
    const btnRestartNow = document.createElement("button");
    btnRestartNow.className = "leafflow-power-menu-btn btn-restart";
    btnRestartNow.innerHTML = `<span style="font-size:18px;">🔄</span> <div><div style="font-weight:600;">Restart Server (Immediate)</div><div style="font-size:11px;color:#a1a1aa;">Restarts the ComfyUI process right now.</div></div>`;
    btnRestartNow.onclick = () => {
        overlay.remove();
        openConfirmModal(
            "Restart ComfyUI Immediately?",
            "Are you sure you want to restart ComfyUI immediately? Any active prompt generation will be interrupted.",
            async () => {
                if (app.extensionManager?.toast?.add) {
                    app.extensionManager.toast.add({
                        severity: "warn",
                        summary: "🔄 Restarting ComfyUI",
                        detail: "The server process is restarting. The UI will reload shortly.",
                        life: 8000
                    });
                }
                await api.fetchApi("/leafflow/power/restart", { method: "POST" });
                setTimeout(() => window.location.reload(), 2500);
            },
            true
        );
    };
    modal.appendChild(btnRestartNow);

    // 2. Shutdown Immediate
    const btnShutdownNow = document.createElement("button");
    btnShutdownNow.className = "leafflow-power-menu-btn btn-shutdown";
    btnShutdownNow.innerHTML = `<span style="font-size:18px;">🛑</span> <div><div style="font-weight:600;">Shutdown Server (Immediate)</div><div style="font-size:11px;color:#a1a1aa;">Completely terminates the ComfyUI server process.</div></div>`;
    btnShutdownNow.onclick = () => {
        overlay.remove();
        openConfirmModal(
            "Shutdown ComfyUI Server?",
            "Are you sure you want to SHUT DOWN the ComfyUI server immediately? The process will exit.",
            async () => {
                if (app.extensionManager?.toast?.add) {
                    app.extensionManager.toast.add({
                        severity: "error",
                        summary: "🛑 ComfyUI Shutting Down",
                        detail: "The server process is terminating.",
                        life: 6000
                    });
                }
                await api.fetchApi("/leafflow/power/shutdown", { method: "POST" });
            },
            true
        );
    };
    modal.appendChild(btnShutdownNow);

    // 3. Restart After Queue Finish
    const btnRestartQueue = document.createElement("button");
    btnRestartQueue.className = "leafflow-power-menu-btn";
    btnRestartQueue.innerHTML = `<span style="font-size:18px;">⏳</span> <div><div style="font-weight:600;">Restart After Queue Finish</div><div style="font-size:11px;color:#a1a1aa;">Waits until all queued prompts finish and system is idle. (Ignored if paused)</div></div>`;
    btnRestartQueue.onclick = () => {
        overlay.remove();
        openConfirmModal(
            "Schedule Restart After Queue Finish?",
            "ComfyUI will wait until all remaining prompts in the queue finish and the system returns to idle before restarting. (Note: If queue is paused, it will not restart).",
            async () => {
                await api.fetchApi("/leafflow/power/arm", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "restart" })
                });
                await fetchPowerStatus();
                if (app.extensionManager?.toast?.add) {
                    app.extensionManager.toast.add({
                        severity: "warn",
                        summary: "⏳ Restart Scheduled",
                        detail: "ComfyUI will restart automatically when the queue finishes.",
                        life: 6000
                    });
                }
            }
        );
    };
    modal.appendChild(btnRestartQueue);

    // 4. Shutdown After Queue Finish
    const btnShutdownQueue = document.createElement("button");
    btnShutdownQueue.className = "leafflow-power-menu-btn";
    btnShutdownQueue.innerHTML = `<span style="font-size:18px;">🌙</span> <div><div style="font-weight:600;">Shutdown After Queue Finish</div><div style="font-size:11px;color:#a1a1aa;">Waits until all queued prompts complete and system is idle, then shuts down.</div></div>`;
    btnShutdownQueue.onclick = () => {
        overlay.remove();
        openConfirmModal(
            "Schedule Shutdown After Queue Finish?",
            "ComfyUI will wait until all queued prompts complete and the system returns to idle before shutting down completely.",
            async () => {
                await api.fetchApi("/leafflow/power/arm", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "shutdown" })
                });
                await fetchPowerStatus();
                if (app.extensionManager?.toast?.add) {
                    app.extensionManager.toast.add({
                        severity: "warn",
                        summary: "🌙 Shutdown Scheduled",
                        detail: "ComfyUI will shut down automatically when the queue finishes.",
                        life: 6000
                    });
                }
            }
        );
    };
    modal.appendChild(btnShutdownQueue);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

function attachBottomSidebarButton() {
    if (document.getElementById("leafflow-power-bottom-btn")) return;
    const bottomGroup = document.querySelector(".sidebar-item-group.mt-auto, .side-bar .mt-auto, [data-testid='bottom-sidebar']");
    if (!bottomGroup) return;

    const btnWrapper = document.createElement("div");
    btnWrapper.id = "leafflow-power-bottom-btn";
    btnWrapper.className = "comfy-menu-button-wrapper flex shrink-0 cursor-pointer flex-col items-center justify-center p-2 transition-colors";
    btnWrapper.setAttribute("title", "ComfyUI Power Control (Restart / Shutdown)");

    const btn = document.createElement("button");
    btn.className = "leafflow-power-sidebar-btn";
    btn.innerHTML = `${getPowerIconSvg(20)}`;
    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        showPowerMenu();
    };

    btnWrapper.appendChild(btn);
    // Insert at the top of the bottom group (above Help Center / Settings)
    bottomGroup.insertBefore(btnWrapper, bottomGroup.firstChild);
    updateSidebarButtonVisuals();
}

app.registerExtension({
    name: EXTENSION_NAME,
    async setup() {
        injectStyles();
        await fetchPowerStatus();

        // 1. Try bottom placement in sidebar
        attachBottomSidebarButton();
        const observer = new MutationObserver(() => attachBottomSidebarButton());
        observer.observe(document.body, { childList: true, subtree: true });

        // 2. Also register standard sidebar tab if bottom container isn't ready
        if (app.extensionManager?.registerSidebarTab) {
            app.extensionManager.registerSidebarTab({
                id: "leafflow-power",
                icon: "pi pi-power",
                title: "Power",
                tooltip: "ComfyUI Power Control (Restart / Shutdown)",
                type: "custom",
                render: (element) => {
                    element.innerHTML = `<div style="padding:16px;color:#d4d4d8;font-size:13px;">Opening Power Menu...</div>`;
                    showPowerMenu();
                }
            });
        }

        setTimeout(() => {
            const btns = document.querySelectorAll('[aria-label*="Power"], .side-bar-button:has(.pi-power), [data-testid="leafflow-power-tab-button"]');
            btns.forEach(btn => {
                btn.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showPowerMenu();
                }, true);
            });
            updateSidebarButtonVisuals();
        }, 1000);

        try {
            api.addEventListener("leafflow_power_status", (e) => {
                currentPowerState = e.detail || currentPowerState;
                updateSidebarButtonVisuals();
            });
        } catch (_) {}

        setInterval(fetchPowerStatus, 3000);
    }
});
