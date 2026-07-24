let currentExecutingNodeId = null;
let previousUrl = null;

class PreviewManagerClass {
    constructor() {
        this.latestImage = null;
        this.latestSamplerId = null;
        this.listeners = new Set();
        this.api = null;
        this.app = null;
        this.initialized = false;
    }

    init(appInstance, apiInstance) {
        if (this.initialized) return;
        this.app = appInstance;
        this.api = apiInstance;
        this.initialized = true;
        this.setupListener();
    }

    registerNode(node) {
        this.listeners.add(node);
        if (this.latestImage) {
            node.onNewPreview(this.latestImage, this.latestSamplerId);
        }
    }

    unregisterNode(node) {
        this.listeners.delete(node);
    }

    setupListener() {
        if (!this.api) return;

        this.api.addEventListener("executing", ({ detail }) => {
            currentExecutingNodeId = detail;
        });

        this.api.addEventListener("b_preview_with_metadata", (event) => {
            const { blob, nodeId, displayNodeId } = event.detail;
            if (!(blob instanceof Blob)) return;
            this.processBlob(blob, displayNodeId || nodeId);
        });

        this.api.addEventListener("b_preview", (event) => {
            if (this.api.serverSupportsFeature?.("supports_preview_metadata")) return;
            const blob = event.detail;
            if (!(blob instanceof Blob)) return;

            const samplerId = currentExecutingNodeId !== null ? currentExecutingNodeId : (this.app?.runningNodeId || null);
            this.processBlob(blob, samplerId);
        });
    }

    processBlob(blob, samplerId) {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            if (previousUrl) {
                URL.revokeObjectURL(previousUrl);
            }
            previousUrl = url;

            const id = samplerId !== null ? String(samplerId) : null;
            this.updatePreview(img, id);
        };
        img.src = url;
    }

    updatePreview(img, samplerId) {
        this.latestImage = img;
        this.latestSamplerId = samplerId;

        for (const node of this.listeners) {
            node.onNewPreview(img, samplerId);
        }
    }
}

export const PreviewManager = new PreviewManagerClass();
