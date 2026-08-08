# 🍃 ComfyUI-FlowControl

A unified custom node suite for **ComfyUI** featuring real-time queue controls, mid-generation pausing, queue crash recovery, visual model pickers, live latent canvas previews, folder automation, prompt utilities, and resolution tools.

> ⚠️ **Notice**: Fully compatible with both **ComfyUI Frontend V2 (Nodes 2.0 / Vue UI)** and **Classic ComfyUI Frontend (Nodes 1.0 / LiteGraph)**.

---

## 📦 Individual Nodes Reference

Expand any node below to view its description, inputs, outputs, and usage documentation.

<details>
<summary><b>🍃 📁 LoRA Loader (by Folder)</b> (<code>FolderLoraLoader</code>)</summary>

#### Overview
Loads a LoRA by folder path using raw filename matching (standard ComfyUI filename contract without pretty name transformations).

#### Inputs & Widgets
- **`model`** (`MODEL`): Input model.
- **`clip`** (`CLIP`): Input CLIP.
- **`folder`** (`STRING`): Subfolder filter (e.g. `Celebrities`, `PonyV6`, `*`).
- **`lora_name`** (`COMBO`): Dropdown listing available LoRA files in the target folder.
- **`strength_model`** (`FLOAT`): Model weight strength (default `1.0`).
- **`strength_clip`** (`FLOAT`): CLIP weight strength (default `1.0`).

#### Outputs
- **`MODEL`**: Patched model.
- **`CLIP`**: Patched CLIP.
- **`lora_name`** (`STRING`): Raw filename of the loaded LoRA.
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
- **`output_name`** (`COMBO`, *Advanced*): Choose between `Parsed Name` or `Filename` for string output.

#### Outputs
- **`MODEL`**: Patched model.
- **`CLIP`**: Patched CLIP.
- **`lora_name`** (`STRING`): Formatted pretty name or filename.
</details>

<details>
<summary><b>🍃 🖼️ Visual LoRA Loader</b> (<code>FolderLoraLoaderVisualPrettyV2</code>)</summary>

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
- **`output_name`** (`COMBO`, *Advanced*): Choose between `Parsed Name` or `Filename` output string format.

#### Outputs
- **`MODEL`**: Sequentially patched model with all active LoRAs loaded.
- **`CLIP`**: Sequentially patched CLIP with all active LoRAs loaded.
- **`lora_name`** (`STRING`): Comma-separated list of active LoRA names.
</details>

<details>
<summary><b>🍃 📷 Visual Image Loader</b> (<code>ImageLoaderVisualPrettyV2</code>)</summary>

#### Overview
Visual thumbnail browser for image folders with instant preview selection and EXIF positive prompt metadata extraction.

#### Inputs & Widgets
- **`display_mode`** (`COMBO`, *Advanced*): `Scrollable` vs `Show All`.

#### Outputs
- **`IMAGE`**: Selected image tensor.
- **`positive_prompt`** (`STRING`): Extracted prompt metadata.
- **`MASK`**: Alpha mask (or empty mask if RGB).
- **`width`** (`INT`): Image width.
- **`height`** (`INT`): Image height.
</details>

<details>
<summary><b>🍃 ↩️ Back To Placeholder</b> (<code>BackToPlaceholder</code>)</summary>

#### Overview
Execution anchor node that undoes placing content into a placeholder slot by scanning text for LoRA pretty names matching a folder and restoring placeholder tokens (e.g. `%celeb%`).

#### Inputs & Widgets
- **`prompt`** (`STRING`, *Forced Input*): Input prompt text.
- **`lora_folder`** (`STRING`): Target LoRA folder filter.
- **`placeholder`** (`STRING`): Token to restore (default `%celeb%`).

#### Outputs
- **`prompt`** (`STRING`): Processed prompt with restored placeholder tokens.
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
- **Category**: `FlowControl/Previews`
- **Output Node**: True
</details>

<details>
<summary><b>🍃 ⏸️ FlowControl Decision</b> (<code>FlowControlDecision</code>)</summary>

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
<summary><b>🍃 📐 Aspect Ratio Finder</b> (<code>AspectRatioFinder</code>)</summary>

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
<summary><b>🍃 🔎 Text LoRA Finder</b> (<code>LoraTextFinder</code>)</summary>

#### Overview
Scans text prompts for LoRA names or custom patterns, automatically loads matched LoRAs into MODEL and CLIP, and outputs the formatted LoRA list.

#### Inputs & Widgets
- **`model`** (`MODEL`): Input model.
- **`clip`** (`CLIP`): Input CLIP.
- **`folder`** (`STRING`): LoRA folder filter.
- **`search_for`** (`COMBO`): Search by `Pretty Name`, `Filename`, `Filename without extension`, or `Custom Regex`.
- **`custom_regex`** (`STRING`): Pattern for custom regex search mode.
- **`start_from`** (`COMBO`): `Front` vs `Back` match priority.
- **`find_amount`** (`INT`): Maximum number of LoRAs to find and load.
- **`strength_model`** (`FLOAT`): Model strength.
- **`strength_clip`** (`FLOAT`): CLIP strength.
- **`output_format`** (`COMBO`, *Advanced*): Output string format.
- **`text`** (`STRING`, *Optional Input*): Text to scan.

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
- **`prompt`** (`STRING`, *Optional Input*): Multiline text input.

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

---

## ⚙️ ComfyUI Settings Menu Reference

Configure options directly under ComfyUI Settings (⚙ gear icon):

<details>
<summary><b>⚙️ FlowControl Settings</b></summary>

- **🍃 FlowControl: Favorites Folder**: Path to store and load favorite prompts/images (default `output/favorites`).
- **🍃 FlowControl: Enable LoRA Usage Tracking**: Toggle LoRA usage counting and visual rank badges (🔥, Gold, Silver, Bronze) ON/OFF.
- **🍃 FlowControl: Enable Civitai Auto-Scraping**: Automatically download model preview images from Civitai via SHA256 file hashes.
- **🍃 FlowControl: Civitai API Key**: Optional key for Civitai SHA256 model preview search (`Authorization: Bearer <key>`).
- **🍃 FlowControl: Enable TMDB Auto-Scraping**: Automatically download celebrity preview images from TMDB.
- **🍃 FlowControl: TMDB API Key**: Optional key or Read Access Token (`eyJ...`) for celebrity preview search.
- **🍃 FlowControl: Default Pause Queue State on Launch**: Sets whether the queue should start `Unpaused` or `Paused` on boot.
- **🍃 FlowControl: Default Pause Queue Mode on Launch**: Sets the default pause behavior (`Finish Active Prompt` vs `Instant Resume Node`).
- **🍃 FlowControl: Persistent Queue Restored Launch State**: Controls what happens to crash-recovered queue items (`Start Paused` or `Start Unpaused`).
- **🍃 FlowControl: Pause Button Unpaused Color**: Customizable hex color for the toolbar unpaused state.
- **🍃 FlowControl: Pause Button Paused Color**: Customizable hex color for the toolbar paused/pausing state.
- **🍃 FlowControl: Enable Pause Queue Toolbar Button**: Toggle top action bar Pause & Continue button ON/OFF.
- **🍃 FlowControl: Enable Persistent Queue (Auto-Recovery)**: Toggle the real-time crash recovery queue saving on or off.
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
   git clone https://github.com/KOFiblto/ComfyUI-FlowControl.git
   ```
2. Restart ComfyUI.
3. Open ComfyUI Settings (⚙ gear menu) to configure API keys or feature toggles if desired.

---

## 📜 License

Distributed under the [MIT License](LICENSE).
