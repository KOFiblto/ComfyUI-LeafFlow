# 🍃 ComfyUI-FlowControl Complete Walkthrough

Welcome to the full guide for ComfyUI-FlowControl! This custom node suite is designed to give you unprecedented control over your generations, visual asset management, and queue resilience. 

This walkthrough covers everything from basic setup to advanced workflows across both the new ComfyUI V2 (Vue) and the classic ComfyUI (LiteGraph).

---

## 1. Global Features

### The Pause Queue Toolbar
Upon installing the extension, you will notice a new **Green/Orange Pause Button** nestled next to your standard "Queue Prompt" button. 
- **Green (Running)**: ComfyUI operates normally.
- **Orange (Pausing/Paused)**: ComfyUI is holding the queue.

You have two pause modes, accessible by clicking the small dropdown arrow next to the Pause button:
1. **Pause (Finish)**: This will let your currently generating workflow finish completely, but it will intercept and hold any subsequent workflows in the queue until you click Continue.
2. **Pause (Instant)**: This tells ComfyUI to freeze *immediately* before executing the next node in your active workflow. You can resume precisely from where you left off later without losing progress!

### The Persistent Queue (Crash Recovery)
You don't need to interact with this—it runs silently in the background! 
Every time you queue a prompt, FlowControl saves the entire queue state to your hard drive in real time. If your computer crashes, power goes out, or you accidentally close the terminal, ComfyUI will automatically restore your unfinished queue upon next boot (in a paused state, so it doesn't overwhelm your GPU before you're ready).

---

## 2. Advanced Nodes

### 🍃 ⏸️ FlowControl Decision
Sometimes you run a complex workflow that takes hours (e.g., upscaling), but you want to check a low-res preview first to ensure it's worth the compute time.
1. Drop the **`🍃 ⏸️ FlowControl Decision`** node into your workflow between the low-res and high-res stages.
2. When the execution reaches this node, your workflow will pause, and a native desktop notification (Windows/macOS/Linux) will alert you!
3. You will see a popup UI on your ComfyUI canvas giving you three choices:
   - **Continue**: Proceeds with the workflow normally.
   - **Cancel**: Outputs a `True` signal. You can route this into a Switch node to bypass the high-res stage entirely.
   - **Stop Workflow**: Instantly aborts the generation queue, exactly like clicking the red X in ComfyUI.

### 🍃 📂 Load Image From Folder
An absolute powerhouse for automation. Point this node at any folder on your hard drive, and it will automatically ingest incoming images, convert them into tensors, and delete the original files to keep the folder clean.
- **wait_if_folder_is_empty**: If set to `True`, the workflow will patiently pause and poll the folder at your `rescan_interval` until an image arrives. Perfect for linking ComfyUI to external tools like Photoshop or Blender auto-exports!
- **Regex Filtering**: Only want it to grab images that start with `render_`? Just use standard regex like `^render_.*\.png$`.

### 🍃 🖼️ Visual LoRA & Image Loaders
Tired of guessing what a LoRA does based on its filename?
1. Use the **`🍃 🖼️ Visual LoRA Loader`**. It natively extracts preview images if you place an identically named `.png`/`.jpg` next to your `.safetensors` file.
2. If you enable the **Civitai Auto-Scraper** in your ComfyUI Settings, the node will calculate the SHA256 hash of your LoRA and automatically download the official preview thumbnail directly from Civitai! 
3. **Pretty Name String Output**: The node outputs the parsed, human-readable name of the loaded LoRA (e.g. "Addison Rae V1") by default, allowing you to route it into a text prompt or watermark node. You can easily switch this via the `output_name` toggle on the node to output the raw filename without extension instead. 

### 🍃 ⏱️ Recent Outputs
Want to quickly reference your recent generations without digging through Windows Explorer? The **`🍃 ⏱️ Recent Outputs`** node cycles chronologically through your `output/` directory, pulling your freshest creations right back into the workflow canvas.

---

## 3. Formatting Folder Paths
Several nodes across this suite (e.g. *Load Image From Folder*, *Recent Outputs*, *Visual Image Loader*, *Visual LoRA Loader*) take a `folder` or `folder_path` string as input. Here is how they work:

- **Empty String**: Leaving a field completely empty (or spaces) will often default to the sensible native directory for that node (e.g., leaving it empty on *Recent Outputs* will automatically target ComfyUI's root `output/` directory).
- **Absolute Paths**: You can paste full absolute paths from your OS, e.g., `C:\Users\Name\Pictures\Renders` or `/home/user/images`.
- **Relative Paths**: If you use a relative path like `input/watch`, it resolves relative to your root ComfyUI directory.
- **Wildcard Filters (`*`)**: 
  - **For the LoRA Loader**: Ending a path with `*` acts as a wildcard directory filter. For example, if you input `style/*`, the loader will recursively display all LoRAs located inside any subfolder that begins with `style/`.
  - **For File Loaders**: If you accidentally copy a path from Windows Explorer that ends in `\*` or `*`, these nodes are smart enough to automatically strip the trailing asterisk so the folder path still resolves perfectly without throwing an OS Error.

---

## 4. Settings & Configuration

Click the standard ComfyUI Settings gear ⚙️ to access FlowControl's configurations. Here you can:
- Safely enter and mask API Keys for Civitai and TMDB scraping.
- Change the colors of the Pause Queue buttons via built-in color pickers.
- Adjust the default boot behavior for the Persistent Queue (e.g., forcing ComfyUI to always boot in a Paused state).

> **Cross-Platform Note**: All of the visual nodes, pause features, and OS notifications are fully compatible with Windows, macOS, and Linux, and seamlessly adapt to both the modern ComfyUI V2 interface and the classic LiteGraph UI!
