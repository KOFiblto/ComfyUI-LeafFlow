# 🍃 ComfyUI-FlowControl

A unified custom node suite for **ComfyUI** featuring real-time queue controls, mid-generation pausing, queue crash recovery, visual model pickers, live latent canvas previews, folder automation, and prompt utilities.

> ⚠️ **Important Notice**: This custom node pack (`ComfyUI-FlowControl`) is engineered to dynamically support both the **New ComfyUI Frontend (v2/Vue)** and the **Classic ComfyUI Frontend (LiteGraph)**.

---

## 🌟 Features & Included Nodes

Every node in this suite is prefixed with the signature **`🍃`** brand icon for quick identification on your canvas and search menu.

### ⏸️ Queue & Workflow Control (`FlowControl/Queue`)

1. **`🍃 Pause Queue` (Global Integration)**
   - Adds a native-styled **Pause / Continue** button directly into the ComfyUI V2 top action bar (or the floating menu in the Classic UI).
   - **Pause (Finish)**: Completes the currently active generation, then holds the queue before starting the next prompt.
   - **Pause (Instant)**: Pauses immediately before the next node executes in the active workflow (resumable mid-workflow without losing progress).
   - **Visual Indicators**: Green when unpaused, Orange when pausing/paused with pulsing glow animation.
   - **Status Text**: Displays `Pausing (Finish)...` or `Pausing (Instant)...` while waiting for execution to reach the pause gate, then transforms into `Continue` with a play icon `▶`.

2. **`🍃 Persistent Queue` (Global Integration)**
   - Automatically saves all queued workflows to `persistent_queue.json` in real time on disk.
   - If ComfyUI crashes, suffers a power outage, or is closed, all unfinished prompts are automatically restored to the queue on next boot in a paused state.
   - **Session Ownership Claiming**: Automatically re-assigns restored queue items to your active browser tab's `client_id` when you open the page, removing the *"Running in another tab"* warning.

3. **`🍃 FlowControl Decision`**
   - A drop-in node that pauses workflow execution at a specific point and prompts you with a UI popup.
   - **Continue**: Resumes execution normally (outputs `False`).
   - **Cancel**: Cancels this branch of the workflow (outputs `True`, allowing you to route it into a Switch node).
   - **Stop Workflow**: Instantly kills the entire active generation queue.
   - **OS Notification**: Optionally sends a native desktop toast notification (Windows, macOS, or Linux) when it's waiting for your input.

---

### 🎨 Visual Loaders & Pickers (`FlowControl/Loaders`)

3. **`🍃 Visual LoRA Loader`**
   - Visual LoRA selector supporting folder filtering (e.g. `Celebrity/*`) and formatted pretty names (e.g. `Ana De Armas V1`).
   - Automatically tracks usage frequency (`lora_usage.json`).
   - **Custom Preview Images**: Simply save a preview image file with the exact same name as your LoRA in the same folder (e.g. `my_lora.png`, `my_lora.jpg`, or `my_lora.webp` next to `my_lora.safetensors`).
   - **Automated Civitai SHA256 Search**: Computes SHA256 file hashes and queries Civitai's API (`/api/v1/model-versions/by-hash/{hash}`) with optional `CIVITAI_API_KEY` authorization to download model preview thumbnails.
   - **TMDB Fallback**: Optional celebrity preview search via TMDB API key.

4. **`🍃 Visual Image Loader`**
   - Visual image folder browser with instant visual preview pickers.
   - Extracts positive prompt metadata from PNG parameters and EXIF user comments.
   - Outputs `IMAGE`, `positive_prompt`, `width`, and `height`.

5. **`🍃 Recent Outputs`**
   - Cycles through recently generated images by step index for seamless integration with ComfyUI's sidebar/assets panel.
   - Supports custom `output_folder` paths.
   - Uses an `index` paired with an `amount` to chronologically step through the X newest images in a batch.

---

### ⚙️ Automation, Previews & Utilities (`FlowControl/Automation`, `FlowControl/Previews`, `FlowControl/Utils`)

6. **`🍃 Load image from folder`**
   - Monitors a directory for incoming images (`.png`, `.jpg`, `.jpeg`, `.webp`), converts them into PyTorch image tensors, and removes processed files.
   - **`wait_if_folder_is_empty` Toggle**:
     - `True` (Default): Safely polls until an image arrives in the directory at your chosen `rescan_interval` (seconds).
     - `False`: Immediately checks the directory. If an image is present, loads it. If no image is present, returns a dummy tensor and `has_image=False` immediately without blocking.
   - **Advanced Sorting**: Supports sorting incoming images by `date_modified`, `date_created`, or `name`.
   - **Regex Filtering**: Use standard Python regex strings (e.g. `^img_.*\.png$`) to target specific file formats or naming conventions.

7. **`🍃 Undo Placeholder`**
   - Scans text prompt strings for names matching LoRA files in a specified folder filter and restores placeholder tokens like `%celeb%`.

8. **`🍃 Live Latent Preview`**
   - Custom canvas node that listens to WebSocket latent preview binary streams (`b_preview`, `b_preview_with_metadata`) during sampler execution and renders real-time sampler previews directly inside the node canvas.

---

## 📋 Complete Node Overview Table

| Node Class | Display Name | Category | Primary Function |
| :--- | :--- | :--- | :--- |
| `FlowControlDecision` | **`🍃 FlowControl Decision`** | `FlowControl/Queue` | Inline workflow pausing with Continue/Cancel UI and native notifications |
| `FolderLoraLoaderVisualPrettyV2` | **`🍃 Visual LoRA Loader`** | `FlowControl/Loaders` | Visual LoRA picker with SHA256 Civitai/TMDB previews |
| `ImageLoaderVisualPrettyV2` | **`🍃 Visual Image Loader`** | `FlowControl/Loaders` | Visual image browser with EXIF prompt extraction |
| `LoadRecentOutputs` | **`🍃 Recent Outputs`** | `FlowControl/Loaders` | Cycles recent output images for assets/sidebar |
| `LoadImageFromFolder` | **`🍃 Load image from folder`** | `FlowControl/Automation` | Folder image watcher with regex and intelligent sorting |
| `UndoPlaceholder` | **`🍃 Undo Placeholder`** | `FlowControl/Utils` | Replaces pretty LoRA names with `%placeholder%` tokens |
| `PreviewLatentLive` | **`🍃 Live Latent Preview`** | `FlowControl/Previews` | Canvas real-time sampler latent preview display |

---

## ⚙️ ComfyUI Settings Menu Integration

Configure options directly under ComfyUI Settings (⚙ gear icon):

- **🍃 FlowControl: Enable Civitai Auto-Scraping**: Automatically download model preview images from Civitai via SHA256 file hashes.
- **🍃 FlowControl: Civitai API Key**: Optional key for Civitai SHA256 model preview search (`Authorization: Bearer <key>`).
- **🍃 FlowControl: Enable TMDB Auto-Scraping**: Automatically download celebrity preview images from TMDB.
- **🍃 FlowControl: TMDB API Key**: Optional key for celebrity preview search.
- **🍃 FlowControl: Default Pause Queue State on Launch**: Sets whether the queue should start `Unpaused` or `Paused` on boot.
- **🍃 FlowControl: Default Pause Queue Mode on Launch**: Sets the default pause behavior (`Finish Active Prompt` vs `Instant Resume Node`).
- **🍃 FlowControl: Persistent Queue Restored Launch State**: Controls what happens to crash-recovered queue items (`Start Paused` or `Start Unpaused`).
- **🍃 FlowControl: Pause Button Unpaused Color**: Customizable hex color for the toolbar unpaused state.
- **🍃 FlowControl: Pause Button Paused Color**: Customizable hex color for the toolbar paused/pausing state.
- **🍃 FlowControl: Enable Pause Queue Toolbar Button**: Toggle top action bar Pause & Continue button ON/OFF.
- **🍃 FlowControl: Enable Persistent Queue (Auto-Recovery)**: Toggle the real-time crash recovery queue saving on or off.

---

## 🔒 Security & Privacy

- All API keys and settings are stored locally in `.env` (excluded from git commits via `.gitignore`).
- No hardcoded personal paths, keys, or credentials.
- Atomic file writes (`.tmp` + `os.replace`) prevent JSON corruption during sudden crashes.

---

## 🚀 Installation & Setup

1. Open your terminal and navigate to your ComfyUI `custom_nodes` directory:
   ```bash
   cd ComfyUI/custom_nodes
   git clone https://github.com/KOFiblto/ComfyUI-FlowControl.git
   ```
2. Restart ComfyUI.
3. Open ComfyUI Settings (⚙ gear menu) to configure API keys or feature toggles if desired.

---

## 🤝 Contributing

Contributions are welcome! Please check out [CONTRIBUTING.md](CONTRIBUTING.md) for local development guidelines, security policy, and coding standards.

## 📜 License

Distributed under the [MIT License](LICENSE).
