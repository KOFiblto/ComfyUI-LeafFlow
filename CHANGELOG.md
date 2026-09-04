# Changelog

All notable changes to `ComfyUI-LeafFlow` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2026-09-04

### Added
- **🎨 1D Git-Graph Batch Queue Visualizer (`ComfyUI.LeafFlow.BatchQueue`)**:
  - Automatically identifies workflows queued together as batches in both ComfyUI Frontend V2 (`JobAssetsList`) and Classic V1 queue list.
  - Purely graphical 1D colored line along the left edge of queue items without any text or number clutter.
  - **36 Curated Cycling Colors**: Sequential assignment ensures adjacent batches have distinct, high-contrast colors.
  - **Start / Middle / End / Single Segments**:
    - First item in batch segment curves inward at the top (`┌`) and continues straight down.
    - Middle items connect with a continuous straight line (`│`).
    - Last item in batch segment comes straight from the top and curves inward at the bottom (`└`).
    - Single-item batches curve inward at both top and bottom (`(`).
  - **In-between Infiltration Handling**: When another prompt or batch is queued in-between items of an existing batch, the interrupted batch retains its open straight ends (no false start/end curves), while the inserted item is cleanly enclosed in its own bracket.
  - **PersistentQueue Interoperability**: Operates client-side via `localStorage` when standalone, and synchronizes with `PersistentQueueManager` so batch relationships restore automatically upon server restart.
  - **Settings Toggle**: Added `LeafFlow.BatchQueue.Enabled` setting in ComfyUI Settings menu.

### Security & Registry Compliance
- **Local-Only Route Enforcement**: All server control endpoints (`/leafflow/power/*`), settings updates (`/leafflow/settings`), and queue sync routes now strictly verify loopback origin (`127.0.0.1` / `::1`), rejecting remote calls with `403 Forbidden`.
- **Directory Traversal Protection**: Image loading (`VisualImageLoader`) and thumbnail endpoints are strictly confined to ComfyUI `input`, `output`, and `temp` directories.
- **Packaging & Installation Standards**: Removed runtime `install.py` in favor of standard `requirements.txt` (`Pillow`, `piexif`, `numpy`, `pystray`), and removed `"torch"` from `pyproject.toml` to prevent host CUDA environment corruption.
- **Opt-In Preview Scraping**: Civitai and TMDB network scraping defaulted to disabled (`ENABLE_CIVITAI_SCRAPING=false`, `ENABLE_TMDB_SCRAPING=false`).

### Changed
- **Text Aspect Ratio Finder Whitelist / Open Mode**:
  - When `aspect_ratios` is populated (e.g. `16:9, 9:16, 1:1`), strictly matches only those configured ratios in prompt text, falling back to default if prompt contains non-whitelisted ratios.
  - When `aspect_ratios` is left empty (`""`), enters open mode and accepts any valid aspect ratio found in text.

---

## [2.1.0] - 2026-08-24

### Added
- **Centralized ComfyUI User Directory (`ComfyUI/user/default/LeafFlow/`)**:
  - All runtime JSON state (`lora_usage.json`, `lora_loader_state.json`, `image_prompts_cache.json`, `failed_scrapes.json`, `prompt_iterator_state.json`, `persistent_queue.json`, `.env`) now strictly lives inside the ComfyUI user folder rather than polluting the node directory.
- **Structured ComfyUI V2 Settings Menu**:
  - Restructured settings into 6 explicit subcategories with clear titles, info tooltips, and real styled action buttons (`🗑️ Reset Scrapes Cache`, `🔄 Reset All Queues`).
- **Prompt Queue Iterator Live Sync**:
  - Added interactive Reset widget button directly onto the canvas node and WebSocket live synchronization for multiline prompt text as items are popped.
- **Cross-Platform Matrix CI**:
  - Automated GitHub Actions unit testing across Python 3.10, 3.11, 3.12 on both Ubuntu and Windows with 56 automated unit tests.

### Fixed
- Fixed empty folder matching edge case in `BackToPlaceholder` (`undo_placeholder.py`).
- Fixed XML entity escaping for native Windows Toast Notifications in `LeafFlowDecision`.
- Removed accidental scrape cache reset during minor settings updates in `__init__.py`.
- Removed obsolete `playwright` dependency from `pyproject.toml` and `install.py`.

---

## [2.0.0] - 2026-08-20

### Added
- **🍃 ⭐ Favorite Prompts**: Preview and loader system for saved favorite prompts and generation presets with subfolder categorizing.
- **🍃 📐 Text Aspect Ratio Finder & Preview**: Dynamic aspect ratio parser (e.g. `16:9`, `2:3`) with resolution calculation and visual aspect box preview.
- **🍃 🔎 Text LoRA Finder & Loader**: Automatic text prompt scanning for LoRA names with model/clip loading and pretty name formatting.
- **🍃 🔄 Prompt Queue Iterator**: Multiline batch prompt queue iterator with Pop, Cycle, and Random modes.
- **🍃 🔤 Multi Text Replacer**: High-performance multi-target find & replace node with protection against recursive replacement loops.
- **🍃 ✂️ Text Split**: Split strings into two outputs using literal delimiters or regex patterns (forward/backward).
- **🍃 ⏸️ LeafFlow Decision**: Interactive mid-workflow pause node with UI buttons (Continue / Cancel / Stop) and desktop notifications.
- **🍃 🔔 System Tray Integration**: OS notification area tray icon with real-time queue status colors and outside-browser queue controls.
- **🍃 🖼️ Assets & History Restore**: Automatic restoration of recent generations into the ComfyUI Assets / History pane on startup.

---

## [1.0.0] - 2026-07-24

### Added
- **Pause Queue**: Added V2 top action bar Pause (Finish) & Pause (Instant) toolbar controls.
- **Persistent Queue**: Real-time queue persistence to disk (`persistent_queue.json`) with auto-restore on startup in paused state and client session ownership claiming.
- **Visual LoRA Loader**: Folder-filtered LoRA selector with formatted pretty names, usage tracking, and Civitai SHA256 API preview thumbnail downloading.
- **Visual Image Loader**: Folder image picker with PNG parameters & EXIF user comments metadata parsing.
- **Auto Watcher**: Folder watcher with non-blocking check (`wait_for_image = False`) and blocking poll (`wait_for_image = True`).
- **Undo Placeholder**: Prompt placeholder restoration tool for LoRA/celebrity names.
- **Recent Outputs**: Output image loader by recent step index for assets/sidebar integration.
- **Live Latent Preview**: Real-time sampler latent preview canvas node renderer.
- **Settings Panel**: Native ComfyUI Settings menu controls for API keys and UI toggles.
