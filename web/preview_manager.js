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
        this.observeDomImages();
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

    observeDomImages() {
        // Observe DOM for ComfyUI V2 New Frontend preview images inserted into KSampler nodes (including inside subgraphs)
        const checkImages = () => {
            const images = document.querySelectorAll('img[alt*="Live sampling preview"], img[src^="blob:"]');
            images.forEach(imgEl => {
                const src = imgEl.src;
                if (src && src.startsWith("blob:") && imgEl.dataset.lastFlowControlSrc !== src) {
                    imgEl.dataset.lastFlowControlSrc = src;
                    
                    const nodeEl = imgEl.closest('[data-node-id], [data-widgets-grid-node-id], .lg-node');
                    const nodeId = nodeEl ? (nodeEl.dataset.nodeId || nodeEl.dataset.widgetsGridNodeId || nodeEl.getAttribute('data-node-id')) : null;

                    const img = new Image();
                    img.onload = () => {
                        this.updatePreview(img, nodeId || currentExecutingNodeId);
                    };
                    img.src = src;
                }
            });
        };

        const observer = new MutationObserver(() => {
            checkImages();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["src"]
        });

        // Periodic fallback scan
        setInterval(checkImages, 300);
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
