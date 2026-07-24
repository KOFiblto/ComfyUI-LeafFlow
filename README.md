# ComfyUI-FlowControl

A unified custom node suite for **ComfyUI** featuring real-time queue controls, mid-generation pausing, queue crash recovery, visual model pickers, live latent canvas previews, and folder automation.

---

## 🌟 Key Features & Nodes

### ⏸️ Queue & Workflow Control

1. **`Pause Queue`** (Toolbar Button & Node)
   - Adds a native-styled **Pause / Continue** button directly into the ComfyUI V2 top action bar.
   - **Pause (Finish)**: Completes the active generation, then holds the queue before starting the next prompt.
   - **Pause (Instant)**: Immediately pauses execution before the next node starts (resumable mid-workflow).
   - **Visual Indicators**: Green when unpaused, Orange when pausing/paused with pulse animation.

2. **`Persistent Queue`** (Auto-Recovery Node)
   - Automatically saves all queued workflows to `persistent_queue.json` in real time.
   - If ComfyUI crashes or is closed, unfinished prompts are automatically restored to the queue on next boot in a paused state.
   - Re-assigns active `client_id` session ownership automatically to prevent "Running in another tab" warnings.

---

### 🎨 Visual Loaders & Pickers

3. **`Visual LoRA Loader`**
   - Folder-based LoRA selection (e.g. `Celebrity/*`) with pretty name formatting (e.g. `Ana De Armas V1`).
   - Automatically tracks usage frequency (`lora_usage.json`).
   - **Custom Preview Images**: Simply save a preview image file with the exact same name as your LoRA in the same folder (e.g. `my_lora.png`, `my_lora.jpg`, or `my_lora.webp` next to `my_lora.safetensors`).
   - **Automated Preview Search**: Queries Civitai (by file SHA256 hash) or TMDB for missing preview thumbnails.

4. **`Visual Image Loader`**
   - Visual folder image browser.
   - Extracts prompt metadata (PNG parameters & EXIF user comments) and outputs image dimensions (`IMAGE`, `positive_prompt`, `width`, `height`).

5. **`Recent Outputs`**
   - Cycles through recent output images saved in ComfyUI's `output/` directory by step index.

---

### ⚙️ Automation & Utilities

6. **`Auto Watcher`**
   - Monitors a directory for incoming images (`.png`, `.jpg`, `.jpeg`, `.webp`), converts them to image tensors, and removes processed files.
   - **`wait_for_image` Toggle**:
     - `True` (Default): Polls safely until an image arrives without creating directories or throwing crashes if folder is missing/deleted.
     - `False`: Checks immediately. If no image is present, returns a dummy tensor and `has_image = False` without blocking.

7. **`Undo Placeholder`**
   - Scans text prompt strings for names matching LoRA files in a folder and restores placeholder tokens like `%celeb%`.

8. **`Live Latent Preview`**
   - Custom canvas node that listens to WebSocket latent preview streams (`b_preview`, `b_preview_with_metadata`) and renders real-time sampler previews directly inside the node canvas.

---

## ⚙️ Settings Menu Integration

Configure API keys and toggles under ComfyUI Settings (⚙ gear icon):

- **Civitai API Key**: Optional key for Civitai SHA256 model preview search.
- **TMDB API Key**: Optional key for celebrity preview search.
- **Enable Pause Queue Toolbar Button**: Toggle top action bar Pause button ON/OFF.

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
