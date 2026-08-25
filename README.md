# 🍃 ComfyUI-LeafFlow

A unified custom node suite for **ComfyUI** featuring real-time queue controls, mid-generation pausing, queue crash recovery, visual model pickers, live latent canvas previews, folder automation, prompt utilities, and resolution tools.

> ⚠️ **Notice**: Fully compatible with both **ComfyUI Frontend V2 (Nodes 2.0 / Vue UI)** and **Classic ComfyUI Frontend (Nodes 1.0 / LiteGraph)**.

---

## 📦 Individual Nodes Reference

Expand any node below to view its description, inputs, outputs, and usage documentation.

<details>
<summary><b>🍃 📁 LoRA Loader (Folder)</b> (<code>FolderLoraLoader</code>)</summary>

#### Overview
Loads a LoRA by folder path using raw filename matching or formatted names with customizable output formatting options.

#### Inputs & Widgets
- **`model`** (`MODEL`): Input model.
- **`clip`** (`CLIP`): Input CLIP.
- **`folder`** (`STRING`): Subfolder filter (e.g. `Celebrities`, `PonyV6`, `*`).
- **`lora_name`** (`COMBO`): Dropdown listing available LoRA files in the target folder.
- **`strength_model`** (`FLOAT`): Model weight strength (default `1.0`).
- **`strength_clip`** (`FLOAT`): CLIP weight strength (default `1.0`).
- **`output_format`** (`COMBO`, *Advanced*): Choose output format (`Parsed Name`, `Filename`, `Filename without extension`, `Relative Path`, `Full Path`, `Custom Regex`).
- **`custom_regex`** (`STRING`, *Advanced*): Pattern used when `output_format` is `Custom Regex`.

#### Outputs
- **`MODEL`**: Patched model.
- **`CLIP`**: Patched CLIP.
- **`lora_name`** (`STRING`): Formatted name or filename of the loaded LoRA.
</details>

<details>
<summary><b>🍃 ✨ LoRA Loader (Pretty)</b> (<code>FolderLoraLoaderPretty</code>)</summary>

#### Overview
Loads a LoRA using formatted pretty names (e.g. `Ana De Armas V1` instead of `krea2_Ana-De-Armas_v1.safetensors`).

#### Inputs & Widgets
- **`model`** (`MODEL`): Input model.
- **`clip`** (`CLIP`): Input CLIP.
- **`folder`** (`STRING`): Subfolder filter.
- **`lora_name`** (`COMBO`): Dropdown listing formatted LoRA names.
- **`strength_model`** (`FLOAT`): Model weight strength.
- **`strength_clip`** (`FLOAT`): CLIP weight strength.

#### Outputs
- **`MODEL`**: Patched model.
- **`CLIP`**: Patched CLIP.
- **`lora_name`** (`STRING`): Selected LoRA name.
</details>

<details>
<summary><b>🍃 🖼️ Visual LoRA Loader</b> (<code>VisualLoraLoader</code> / alias <code>FolderLoraLoaderVisualPrettyV2</code>)</summary>

#### Overview
Visual thumbnail browser for LoRAs with Civitai SHA256 search & TMDB auto-scraping, popularity rank badges (🔥), and multi-selection support.

#### Inputs & Widgets
- **`model`** (`MODEL`): Input model.
- **`clip`** (`CLIP`): Input CLIP.
- **`folder`** (`STRING`): Subfolder filter.
- **`strength_model`** (`FLOAT`): Model strength.
- **`strength_clip`** (`FLOAT`): CLIP strength.
- **`display_mode`** (`COMBO`, *Advanced*): `Scrollable` vs `Show All`.
- **`sort_loras_by`** (`COMBO`, *Advanced*): Sort by `Name (A-Z)`, `Name (Z-A)`, `Date Modified (Newest First)`, `Date Modified (Oldest First)`, or `Usage (Most Used First)`.

#### Outputs
- **`MODEL`**: Patched model.
- **`CLIP`**: Patched CLIP.
- **`lora_name`** (`STRING`): Comma-separated list of active LoRA names.
</details>

<details>
<summary><b>🍃 📷 Visual Image Loader</b> (<code>VisualImageLoader</code> / alias <code>ImageLoaderVisualPrettyV2</code>)</summary>

#### Overview
Visual thumbnail browser for image folders with instant preview selection and EXIF positive prompt metadata extraction.

#### Inputs & Widgets
- **`folder`** (`STRING`): Folder path to load images from.
- **`display_mode`** (`COMBO`, *Advanced*): `Scrollable` vs `Show All`.
- **`sort_images_by`** (`COMBO`, *Advanced*): `Name (A-Z)`, `Name (Z-A)`, `Date Modified (Newest First)`, `Date Modified (Oldest First)`.

#### Outputs
- **`IMAGE`**: Selected image tensor.
- **`positive_prompt`** (`STRING`): Extracted prompt metadata.
- **`width`** (`INT`): Image width.
- **`height`** (`INT`): Image height.
</details>

<details>
<summary><b>🍃 ↩️ Back To Placeholder</b> (<code>BackToPlaceholder</code>)</summary>

#### Overview
Execution anchor node that undoes placing content into a placeholder slot by scanning text for LoRA pretty names matching a folder and restoring placeholder tokens (e.g. `%celeb%`).

#### Inputs & Widgets
- **`text`** (`STRING`, *Forced Input*): Input prompt text.
- **`lora_folder`** (`STRING`): Target LoRA folder filter.
- **`placeholder`** (`STRING`): Token to restore (default `%celeb%`).

#### Outputs
- **`text`** (`STRING`): Processed prompt text with restored placeholder tokens.
</details>

<details>
<summary><b>🍃 📂 Load Image From Folder</b> (<code>LoadImageFromFolder</code>)</summary>

#### Overview
Monitors a folder for incoming images, loads the target image into a PyTorch tensor, with an optional toggle to delete the image after loading.

#### Inputs & Widgets
- **`folder`** (`STRING`): Watch directory path (default `input/watch`).
- **`wait_if_folder_is_empty`** (`BOOLEAN`): Poll until image arrives vs return dummy tensor immediately.
- **`rescan_interval`** (`INT`): Polling frequency in seconds.
- **`sort_by`** (`COMBO`): Sort by `date_modified`, `date_created`, or `name`.
- **`regex_filter`** (`STRING`): Regex pattern to filter filenames.
- **`delete_image`** (`BOOLEAN`, *Default: false*): If enabled, deletes the image file from disk after loading.

#### Outputs
- **`image`** (`IMAGE`): Loaded image tensor.
- **`has_image`** (`BOOLEAN`): True if image loaded, False if folder empty.
</details>

<details>
<summary><b>🍃 ⏱️ Recent Outputs</b> (<code>LoadRecentOutputs</code>)</summary>

#### Overview
Loads the N newest images from an output directory with step-through index selection.

#### Inputs & Widgets
- **`output_folder`** (`STRING`): Target output directory.
- **`amount`** (`INT`): Number of newest images to pool (1-100).
- **`index`** (`INT`): Step index selection.

#### Outputs
- **`IMAGE`**: Output image tensor.
</details>

<details>
<summary><b>🍃 👁️ Live Latent Preview</b> (<code>PreviewLatentLiveNode</code>)</summary>

#### Overview
Canvas rendering node that listens to sampler WebSocket latent binary streams and displays real-time live previews on the canvas during generation.

#### Inputs & Outputs
- **Category**: `LeafFlow/Previews`
- **Output Node**: True
</details>

<details>
<summary><b>🍃 ⏸️ LeafFlow Decision</b> (<code>LeafFlowDecision</code>)</summary>

#### Overview
Pauses workflow execution at a specific step and displays an inline UI popup with Continue, Cancel, or Stop Workflow actions, plus optional native OS desktop notifications.

#### Inputs & Widgets
- **`disable`** (`BOOLEAN`): Bypass decision gate.
- **`send_os_notification`** (`BOOLEAN`): Trigger native OS desktop toast on pause.
- **`timeout`** (`INT`): Auto-continue timeout in seconds (-1 = infinite).

#### Outputs
- **`cancel`** (`BOOLEAN`): False on Continue, True on Cancel (for branch routing).
</details>

<details>
<summary><b>🍃 📐 Text Aspect Ratio Finder</b> (<code>TextAspectRatioFinder</code> / alias <code>AspectRatioFinder</code>)</summary>

#### Overview
Parses input text for aspect ratios (e.g. `16:9`, `2.35:1`), syntax-checks them, and calculates pixel resolution for a target megapixel target.

#### Inputs & Widgets
- **`aspect_ratios`** (`STRING`): Allowed ratio list.
- **`search_mode`** (`COMBO`): `First match (Front)` vs `Last match (Back)`.
- **`target_mp`** (`FLOAT`): Target megapixels (e.g. `1.0 MP`).
- **`default_aspect_ratio`** (`COMBO`): Fallback ratio if none found.
- **`multiple_of`** (`INT`, *Advanced*): Dimension step multiple (default `8`).
- **`min_mp`** (`FLOAT`, *Advanced*): Minimum megapixel limit.
- **`max_mp`** (`FLOAT`, *Advanced*): Maximum megapixel limit.
- **`text`** (`STRING`, *Optional Input*): Input text to search.

#### Outputs
- **`width`** (`INT`): Computed width in pixels.
- **`height`** (`INT`): Computed height in pixels.
- **`aspect_ratio`** (`STRING`): Detected or fallback aspect ratio string.
- **`cleaned_text`** (`STRING`): Input text with the aspect ratio token stripped.
</details>

<details>
<summary><b>🍃 📐 Preview Image Size & Aspect Ratio</b> (<code>PreviewImageSizeAspectRatio</code>)</summary>

#### Overview
Computes image dimensions and aspect ratio from an input image tensor and formats the result for previewing.

#### Inputs & Widgets
- **`image`** (`IMAGE`): Input image tensor.

#### Outputs
- **`width`** (`INT`): Image width.
- **`height`** (`INT`): Image height.
- **`aspect_ratio`** (`STRING`): Closest matched aspect ratio string.
</details>

<details>
<summary><b>🍃 🔎 Text LoRA Finder & Loader</b> (<code>TextLoraFinder</code> / alias <code>LoraTextFinder</code>)</summary>

#### Overview
Scans input prompt text for `<lora:name:strength>` tags or names matching a folder on disk, dynamically applies them, and returns patched models along with sanitized prompt text.

#### Inputs & Widgets
- **`model`** (`MODEL`): Input model.
- **`clip`** (`CLIP`): Input CLIP.
- **`folder`** (`STRING`): Subfolder to search for LoRA files.
- **`fallback_strength_model`** (`FLOAT`): Default model strength if omitted in prompt tag.
- **`fallback_strength_clip`** (`FLOAT`): Default CLIP strength if omitted in prompt tag.
- **`clean_prompt`** (`BOOLEAN`): Strips matched `<lora:...>` tags from output text.
- **`text`** (`STRING`, *Optional Input*): Input prompt text.

#### Outputs
- **`MODEL`**: Patched model.
- **`CLIP`**: Patched CLIP.
- **`text`** (`STRING`): Cleaned prompt text.
- **`lora_name`** (`STRING`): Comma-separated list of loaded LoRAs.
</details>

<details>
<summary><b>🍃 🔄 Prompt Queue Iterator</b> (<code>PromptQueueIterator</code>)</summary>

#### Overview
Parses multiline prompts or batch text blocks separated by double newlines (`\n\n`), automatically popping the top prompt per queue iteration and keeping remaining prompts in memory.

#### Inputs & Widgets
- **`prompts`** (`STRING`, Multiline): Queue of prompt blocks.
- **`mode`** (`COMBO`): `Double Newline (\n\n)` vs `Single Line (\n)`.
- **`delete_after_queue`** (`BOOLEAN`): Pop executed block from widget text.

#### Outputs
- **`active_prompt`** (`STRING`): The current prompt block for this run.
- **`remaining_prompts`** (`STRING`): The queue of remaining prompts.
- **`remaining_count`** (`INT`): Count of remaining items in queue.
</details>

<details>
<summary><b>🍃 🔤 Multi Text Replacer</b> (<code>MultiTextReplacer</code>)</summary>

#### Overview
Performs multiple text replacements in a single step using comma-separated or newline-separated find/replace lists, with support for exact phrases and regex matching.

#### Inputs & Widgets
- **`text`** (`STRING`, Multiline): Input text to modify.
- **`find_text`** (`STRING`, Multiline): Search terms (comma-separated or lines).
- **`replace_text`** (`STRING`, Multiline): Replacement terms.
- **`case_sensitive`** (`BOOLEAN`): Toggle case-sensitive matching.
- **`use_regex`** (`BOOLEAN`): Treat find patterns as regular expressions.

#### Outputs
- **`text`** (`STRING`): Modified text.
</details>

<details>
<summary><b>🍃 ✂️ Text Split</b> (<code>LeafFlowTextSplit</code>)</summary>

#### Overview
Splits text into two parts at a specified delimiter. Supports forward (from start) and backward (from end) search, as well as regular expressions.

#### Inputs & Widgets
- **`text`** (`STRING`, Multiline): Input text to split.
- **`delimiter`** (`STRING`): Character or string to split on (e.g. `,`, `---`, `\n`).
- **`search_from`** (`COMBO`): `Forward (First Match)` vs `Backward (Last Match)`.
- **`use_regex`** (`BOOLEAN`): Treat delimiter as a regular expression pattern.
- **`strip_whitespace`** (`BOOLEAN`): Trims surrounding whitespace from output strings.

#### Outputs
- **`left_text`** (`STRING`): Text before the split delimiter.
- **`right_text`** (`STRING`): Text after the split delimiter.
- **`delimiter_found`** (`BOOLEAN`): True if delimiter was found, False otherwise.
</details>

---

## ⚙️ ComfyUI Settings Menu Reference

Configure options directly under ComfyUI Settings (⚙ gear icon):

<details open>
<summary><b>1. 🖼️ Visual Loaders (Civitai & TMDB Duo)</b></summary>

- **`Enable Custom LeafFlow Node Colors`** (`boolean`, *Default: true*): Applies a vibrant Leaf Green color theme to LeafFlow nodes on the canvas. When disabled, nodes use default ComfyUI colors.
- **`Civitai API Key`** (`text`): Optional key for Civitai SHA256 model preview search (`Authorization: Bearer <key>`).
- **`Enable Civitai Auto-Scraping`** (`boolean`, *Default: true*): Automatically download model preview images from Civitai via SHA256 file hashes. (Note: Local SHA256 hash searching always works).
- **`TMDB Access Token`** (`text`): Optional key or v4 Read Access Token (`eyJ...`) for celebrity preview search.
- **`Enable TMDB Auto-Scraping`** (`boolean`, *Default: false*): Automatically download celebrity preview images from TMDB.
- **`Enable LoRA Usage Tracking`** (`boolean`, *Default: true*): Toggle LoRA usage counting and visual rank badges (🔥, Gold, Silver, Bronze) in the picker.
- **`Reset Failed Scrapes Cache`** (*Button: `🗑️ Clear Scrapes Cache`*): Clears failed scrape history so Civitai/TMDB can retry downloading missing preview images.
</details>

<details open>
<summary><b>2. 🔄 Prompt Iterator</b></summary>

- **`Clear State on Launch`** (`boolean`, *Default: false*): Privacy toggle to empty `prompt_iterator_state.json` on ComfyUI startup.
- **`Reset All Queues`** (*Button: `🔄 Reset All Queues`*): Immediately empties all active prompt queues and resets iterator state.
</details>

<details open>
<summary><b>3. 📋 Prompt Actions</b></summary>

- **`Show "Copy Prompt" Button on Images`** (`boolean`, *Default: true*): Shows the 📋 "Copy Prompt" overlay action button when hovering over generated images in the Assets / History pane and preview nodes.
- **`Show Right-Click "Copy Prompt" Menu Action`** (`boolean`, *Default: true*): Adds "📋 Copy Prompt" to node right-click context menus.
</details>

<details open>
<summary><b>4. ⏸️ Pause Controls</b></summary>

- **`Default State on Launch`** (`combo`, *Default: `Paused`*): Sets whether the queue starts `Paused` or `Running` on boot.
- **`Default Pause Action`** (`combo`, *Default: `Finish Active Prompt`*): Sets default pause behavior (`Finish Active Prompt` vs `Instant Resume Node`).
- **`Enable Top Toolbar Button`** (`boolean`, *Default: true*): Toggle top action bar Pause & Continue button group ON/OFF.
- **`Toolbar Button Unpaused Color`** (`text`, *Default: `#16a34a`*): Hex color for the toolbar unpaused/running state.
- **`Toolbar Button Paused Color`** (`text`, *Default: `#ea580c`*): Hex color for the toolbar paused state.
- **`Enable System Tray Icon`** (`boolean`, *Default: false*): Displays an OS system tray icon with real-time queue status colors and outside-browser controls.
</details>

<details open>
<summary><b>5. 💾 Persistent Queue</b></summary>

- **`Persistent Queue (Auto-Recovery)`** (`boolean`, *Default: true*): Automatically saves unfinished queue items and restores them after restart/crash.
- **`Recovery Launch State`** (`combo`, *Default: `Match Default`*): Override launch state when restored queue items are recovered on startup (`Match Default`, `Force Paused`, `Force Running`).
</details>

<details open>
<summary><b>6. 🖼️ Assets & History Restore</b></summary>

- **`Restore Assets on Launch`** (`boolean`, *Default: true*): Automatically restores your latest generated images into the Assets / History pane on startup.
- **`Restored Assets Count`** (`number`, *Default: 64*): The number of newest images from the output folder to populate into the Assets pane.
</details>

<details open>
<summary><b>7. 🩺 Diagnostics & Debug</b></summary>

- **`Export Debug Profile`** (*Button: `📥 Export Debug Profile`*): Exports non-sensitive system environment details (OS, Python, PyTorch, LeafFlow settings, local cache counts) to a JSON file to share when reporting bugs or requesting assistance. Sensitive API keys and tokens are never exported.
</details>

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
   git clone https://github.com/KOFiblto/ComfyUI-LeafFlow.git
   ```
2. Restart ComfyUI.
3. Open ComfyUI Settings (⚙ gear menu) to configure API keys or feature toggles if desired.

---

## 📜 License

Distributed under the [MIT License](LICENSE).
