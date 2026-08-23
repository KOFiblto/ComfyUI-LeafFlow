# Changelog

All notable changes to `ComfyUI-LeafFlow` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
