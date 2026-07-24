# 🍃 ComfyUI-FlowControl

A unified custom node suite for **ComfyUI** featuring real-time queue controls, mid-generation pausing, queue crash recovery, visual model pickers, live latent canvas previews, and folder automation.

---

## 🌟 Nodes Included

- **🍃 Pause Queue**
- **🍃 Persistent Queue**
- **🍃 Visual LoRA Loader**
- **🍃 Visual Image Loader**
- **🍃 Auto Watcher**
- **🍃 Recent Outputs**
- **🍃 Undo Placeholder**
- **🍃 Live Latent Preview**

---

## ⚙️ Settings Menu Integration

Configure API keys and toggles under ComfyUI Settings (⚙ gear icon):

- **🍃 FlowControl: Civitai API Key**: Optional key for Civitai SHA256 model preview search.
- **🍃 FlowControl: TMDB API Key**: Optional key for celebrity preview search.
- **🍃 FlowControl: Enable Pause Queue Toolbar Button**: Toggle top action bar Pause button ON/OFF.

---

## 🔒 Security & Privacy

- All API keys and settings are stored locally in `.env` (excluded from git commits via `.gitignore`).
- No hardcoded personal paths, keys, or credentials.

---

## 🚀 Installation

Clone or extract into your ComfyUI `custom_nodes` directory:

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/KOFiblto/ComfyUI-FlowControl.git
```
Restart ComfyUI.
