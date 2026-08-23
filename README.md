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
- **`lora_name`** (`COMBO`): Dropdown listing formatted pretty names.
- **`strength_model`** (`FLOAT`): Model weight strength.
- **`strength_clip`** (`FLOAT`): CLIP weight strength.
- **`output_format`** (`COMBO`, *Advanced*): Choose output format (`Parsed Name`, `Filename`, `Filename without extension`, `Relative Path`, `Full Path`, `Custom Regex`).
- **`custom_regex`** (`STRING`, *Advanced*): Pattern used when `output_format` is `Custom Regex`.

#### Outputs
- **`MODEL`**: Patched model.
- **`CLIP`**: Patched CLIP.
- **`lora_name`** (`STRING`): Formatted name or filename of the loaded LoRA.
</details>

<details>
<summary><b>🍃 🖼️ Visual LoRA Loader</b> (<code>VisualLoraLoader</code> / alias <code>FolderLoraLoaderVisualPrettyV2</code>)</summary>

#### Overview
Visual thumbnail LoRA browser with search, multi-selection, ranking badges (🔥, 🥇 Gold, 🥈 Silver, 🥉 Bronze), and automated Civitai SHA256 & TMDB preview image fetching.

#### Inputs & Widgets
- **`model`** (`MODEL`): Input model.
- **`clip`** (`CLIP`): Input CLIP.
- **`folder`** (`STRING`): Folder filter.
- **`strength_model`** (`FLOAT`): Model strength.
- **`strength_clip`** (`FLOAT`): CLIP strength.
- **`display_mode`** (`COMBO`, *Advanced*): Choose between `Scrollable` (fixed height) or `Show All` (auto-expanding node card).
- **`sort_loras_by`** (`COMBO`, *Advanced*): Sort LoRAs inside folders (`Name (A-Z)`, `Name (Z-A)`, `Usage (High to Low)`, `Usage (Low to High)`, `Date Modified (Newest First)`, `Date Modified (Oldest First)`).
- **`sort_folders_by`** (`COMBO`, *Advanced*): Sort folder sections order (`Name (A-Z)`, `Name (Z-A)`, `Total Usage (High to Low)`, `Average Usage (High to Low)`, `Total LoRAs (Most First)`).
- **`folder_position`** (`COMBO`, *Advanced*): Layout position of root LoRAs vs folders (`Folders First` vs `Root LoRAs First`).
- **`content_alignment`** (`COMBO`, *Advanced*): Align tiles and folder headers to the left or right (`Left Aligned` vs `Right Aligned`).
- **`output_format`** (`COMBO`, *Advanced*): Choose output format (`Parsed Name`, `Filename`, `Filename without extension`, `Relative Path`, `Full Path`, `Custom Regex`).
- **`custom_regex`** (`STRING`, *Advanced*): Pattern used when `output_format` is `Custom Regex`.

#### Outputs
- **`MODEL`**: Sequentially patched model with all active LoRAs loaded.
- **`CLIP`**: Sequentially patched CLIP with all active LoRAs loaded.
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
Monitors a folder for incoming images, loads the target image into a PyTorch tensor, and removes processed files.

#### Inputs & Widgets
- **`folder`** (`STRING`): Watch directory path (default `input/watch`).
- **`wait_if_folder_is_empty`** (`BOOLEAN`): Poll until image arrives vs return dummy tensor immediately.
- **`rescan_interval`** (`INT`): Polling frequency in seconds.
- **`sort_by`** (`COMBO`): Sort by `date_modified`, `date_created`, or `name`.
- **`regex_filter`** (`STRING`): Regex pattern to filter filenames.

#### Outputs
- **`image`** (`IMAGE`): Loaded image tensor.
- **`has_image`** (`BOOLEAN`): True if image loaded, False if folder empty.
</details>

<details>
<summary><b>🍃 ⏱️ Recent Outputs</b> (<code>LoadRecentOutputs</code>)</summary>

#### Overview
Chronologically cycles through recently generated output images from ComfyUI's output directory.

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
<summary><b>🍃 ⭐ Favorite Prompts</b> (<code>FavoritePromptLoader</code>)</summary>

#### Overview
Visually browse saved favorite images and prompts from your favorites folder.

#### Inputs & Widgets
- **`display_mode`** (`COMBO`, *Advanced*): `Scrollable` vs `Show All`.
- **`sort_images_by`** (`COMBO`, *Advanced*): `Name (A-Z)`, `Name (Z-A)`, `Date Modified (Newest First)`, `Date Modified (Oldest First)`.

#### Outputs
- **`IMAGE`**: Favorite image tensor.
- **`positive_prompt`** (`STRING`): Favorited prompt text.
- **`MASK`**: Mask tensor.
- **`width`** (`INT`): Image width.
- **`height`** (`INT`): Image height.
</details>

<details>
<summary><b>🍃 💾 Save Favorite Preview</b> (<code>SaveFavoritePreview</code>)</summary>

#### Overview
Preview image node equipped with a native "Save Active to Favorites" button widget.

#### Inputs & Outputs
- **`images`** (`IMAGE`): Input images to preview and save.
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
- **`width`** (`INT`): Calculated width.
- **`height`** (`INT`): Calculated height.
- **`aspect_ratio`** (`STRING`): Matched ratio string.
</details>

<details>
<summary><b>🍃 📐 Preview Image Size & Aspect Ratio</b> (<code>PreviewImageSizeAspectRatio</code>)</summary>

#### Overview
Visual display node that draws a scaled outline box preview of the image aspect ratio and dimension summary (`W x H`).

#### Inputs & Widgets
- **`width`** (`INT`, *Optional Input*): Image width in pixels.
- **`height`** (`INT`, *Optional Input*): Image height in pixels.
- **`aspect_ratio`** (`STRING`, *Optional Input*): Aspect ratio string (e.g. `16:9` or `2:3`).
- **`ratio_float`** (`FLOAT`, *Optional Input*): Aspect ratio float value (e.g. `1.777`).

#### Outputs
- *(None - Visual Display Node Only)*
</details>

<details>
<summary><b>🍃 🔎 Text LoRA Finder & Loader</b> (<code>TextLoraFinder</code> / alias <code>LoraTextFinder</code>)</summary>

#### Overview
Scans text prompts for LoRA names or custom patterns, automatically loads matched LoRAs into MODEL and CLIP, and outputs the formatted LoRA list.

#### Inputs & Widgets
- **`model`** (`MODEL`): Input model.
- **`clip`** (`CLIP`): Input CLIP.
- **`folder`** (`STRING`): LoRA folder filter.
- **`search_for`** (`COMBO`): Search by `Parsed Name`, `Filename`, `Filename without extension`, or `Custom Regex`.
- **`custom_regex`** (`STRING`, *Advanced*): Pattern for custom regex search mode or output formatting.
- **`search_mode`** (`COMBO`): `First match (Front)` vs `Last match (Back)` match priority.
- **`find_amount`** (`INT`): Maximum number of LoRAs to find and load.
- **`strength_model`** (`FLOAT`): Model strength.
- **`strength_clip`** (`FLOAT`): CLIP strength.
- **`output_format`** (`COMBO`, *Advanced*): Output format (`Parsed Name`, `Filename`, `Filename without extension`, `Relative Path`, `Full Path`, `Custom Regex`).
- **`text`** (`STRING`, *Optional Input*): Text string to scan.

#### Outputs
- **`MODEL`**: Model patched with matched LoRAs.
- **`CLIP`**: CLIP patched with matched LoRAs.
- **`loras`** (`STRING`): Comma-separated list of loaded LoRA names.
</details>

<details>
<summary><b>🍃 🔄 Prompt Queue Iterator</b> (<code>PromptQueueIterator</code>)</summary>

#### Overview
Parses multiline prompt text blocks, popping/selecting prompts per batch queue iteration with persistent queue state saved to disk across restarts.

#### Inputs & Widgets
- **`pop_mode`** (`COMBO`): `Pop Top & Delete`, `Cycle / Loop`, `Random (Delete)`, `Random (Keep)`.
- **`separator`** (`COMBO`): `>1 Empty Line`, `Newline`, `>2 Empty Lines`.
- **`text`** (`STRING`, *Multiline Input*): Multiline text input.

#### Outputs
- **`prompt`** (`STRING`): Current popped prompt for the batch step.
- **`remaining_text`** (`STRING`): Remaining multiline prompt text.
- **`remaining_count`** (`INT`): Count of remaining prompts.
</details>

<details>
<summary><b>🍃 🔤 Multi Text Replacer</b> (<code>MultiTextReplacer</code>)</summary>

#### Overview
Searches input text for multiple search targets specified in a comma-separated list or regex pattern and replaces all matches with a replacement string in a single-pass loop-safe execution.

#### Inputs & Widgets
- **`find`** (`STRING`): Search targets list (e.g. `%celeb%, %model%, %character%` or `"18 year old", "teen"`).
- **`replace`** (`STRING`): Replacement string.
- **`case_sensitive`** (`BOOLEAN`, *Advanced*): Case sensitivity toggle.
- **`search_mode`** (`COMBO`, *Advanced*): `Comma Separated List` vs `Regex Pattern`.
- **`text`** (`STRING`, *Optional Input*): Text string to process.

#### Outputs
- **`text`** (`STRING`): Text after replacements.
- **`replaced_count`** (`INT`): Total replacements executed.
</details>

<details>
<summary><b>🍃 ✂️ Text Split</b> (<code>LeafFlowTextSplit</code>)</summary>

#### Overview
Splits an input text into two separate output strings (`text1` and `text2`) using either a literal character sequence or a Regular Expression pattern, with support for forward (from start) and backward (from end) splitting.

#### Inputs & Widgets
- **`text`** (`STRING`, *Multiline*): Input text to split.
- **`split_by`** (`STRING`): Character sequence (e.g. `--`) or Regex pattern to split on.
- **`use_regex`** (`BOOLEAN`, *Default: false*): Interpret `split_by` as a regular expression.
- **`split_direction`** (`COMBO`, *Advanced*, *Default: forward*): Choose between `forward (first occurrence from start)` or `backward (last occurrence from end)`.
- **`strip_whitespace`** (`BOOLEAN`, *Advanced*, *Default: false*): Automatically trims leading and trailing whitespace from `text1` and `text2`.

#### Outputs
- **`text1`** (`STRING`): The text portion before the split delimiter.
- **`text2`** (`STRING`): The text portion after the split delimiter.
</details>

---

## ⚙️ ComfyUI Settings Menu Reference

Configure options directly under ComfyUI Settings (⚙ gear icon):

<details open>
<summary><b>1 🖼️ Visual Loaders (Civitai & TMDB Duo)</b></summary>

- **`Civitai API Key`** (`text`): Optional key for Civitai SHA256 model preview search (`Authorization: Bearer <key>`).
- **`Enable Civitai Auto-Scraping`** (`boolean`, *Default: true*): Automatically download model preview images from Civitai via SHA256 file hashes. (Note: Local SHA256 hash searching always works).
- **`TMDB Access Token`** (`text`): Optional key or v4 Read Access Token (`eyJ...`) for celebrity preview search.
- **`Enable TMDB Auto-Scraping`** (`boolean`, *Default: false*): Automatically download celebrity preview images from TMDB.
- **`Enable LoRA Usage Tracking`** (`boolean`, *Default: true*): Toggle LoRA usage counting and visual rank badges (🔥, Gold, Silver, Bronze) in the picker.
- **`Reset Failed Scrapes Cache`** (*Button: `🗑️ Reset Scrapes Cache`*): Clears failed scrape history so Civitai/TMDB can retry downloading missing preview images.
</details>

<details open>
<summary><b>2 🔄 Prompt Iterator</b></summary>

- **`Clear State on Launch`** (`boolean`, *Default: false*): Privacy toggle to empty `prompt_iterator_state.json` on ComfyUI startup.
- **`Reset All Queues`** (*Button: `🔄 Reset All Queues`*): Immediately empties all active prompt queues and resets iterator state.
</details>

<details open>
<summary><b>3 ⭐ Favorite Prompts</b></summary>

- **`Favorites Folder Path`** (`text`, *Default: `output/favorites`*): Path to store and load favorite prompts and preview images.
</details>

<details open>
<summary><b>4 ⏸️ Pause Controls</b></summary>

- **`Default State on Launch`** (`combo`, *Default: `Paused`*): Sets whether the queue starts `Paused` or `Running` on boot.
- **`Default Pause Action`** (`combo`, *Default: `Finish Active Prompt`*): Sets default pause behavior (`Finish Active Prompt` vs `Instant Resume Node`).
- **`Enable Top Toolbar Button`** (`boolean`, *Default: true*): Toggle top action bar Pause & Continue button group ON/OFF.
- **`Toolbar Button Unpaused Color`** (`text`, *Default: `#059669`*): Hex color for the toolbar unpaused/running state.
- **`Toolbar Button Paused Color`** (`text`, *Default: `#ea580c`*): Hex color for the toolbar paused state.
- **`Enable System Tray Icon`** (`boolean`, *Default: false*): Displays an OS system tray icon with real-time queue status colors and outside-browser controls.
</details>

<details open>
<summary><b>5 💾 Persistent Queue</b></summary>

- **`Persistent Queue (Auto-Recovery)`** (`boolean`, *Default: true*): Automatically saves unfinished queue items and restores them after restart/crash.
- **`Recovery Launch State`** (`combo`, *Default: `Match Default`*): Override launch state when restored queue items are recovered on startup (`Match Default`, `Force Paused`, `Force Running`).
</details>

<details open>
<summary><b>6 🖼️ Assets & History Restore</b></summary>

- **`Restore Assets on Launch`** (`boolean`, *Default: true*): Automatically restores your latest generated images into the Assets / History pane on startup.
- **`Restored Assets Count`** (`number`, *Default: 64*): The number of newest images from the output folder to populate into the Assets pane.
</details>

<details open>
<summary><b>7 🩺 Diagnostics & Debug</b></summary>

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
