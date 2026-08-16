import os
import sys
import subprocess
from aiohttp import web
from server import PromptServer

def ensure_dependencies():
    dep_map = {
        "pystray": "pystray",
        "piexif": "piexif",
        "PIL": "Pillow",
        "numpy": "numpy"
    }
    for mod_name, pip_name in dep_map.items():
        try:
            __import__(mod_name)
        except ImportError:
            try:
                print(f"[ComfyUI-FlowControl] Auto-installing missing dependency: {pip_name}")
                subprocess.check_call([sys.executable, "-m", "pip", "install", pip_name])
            except Exception as e:
                print(f"[ComfyUI-FlowControl] Warning: Failed to install {pip_name}: {e}")

ensure_dependencies()

from .nodes.queue_control import setup_queue_control_routes, tray_manager
from .nodes.lora_loader import (
    FolderLoraLoader,
    FolderLoraLoaderPretty,
    VisualLoraLoader,
    FolderLoraLoaderVisualPrettyV2
)
from .nodes.image_loader import VisualImageLoader, ImageLoaderVisualPrettyV2
from .nodes.undo_placeholder import BackToPlaceholder
from .nodes.auto_watcher import LoadImageFromFolder
from .nodes.load_recent import LoadRecentOutputs
from .nodes.preview_latent import PreviewLatentLiveNode
from .nodes.decision_node import FlowControlDecision
from .nodes.favorite_prompts import FavoritePromptLoader, SaveFavoritePreview
from .nodes.aspect_ratio import TextAspectRatioFinder, AspectRatioFinder, PreviewImageSizeAspectRatio
from .nodes.lora_finder import TextLoraFinder, LoraTextFinder
from .nodes.prompt_iterator import PromptQueueIterator
from .nodes.text_replacer import MultiTextReplacer


NODE_CLASS_MAPPINGS = {
    # Standardized Class Names
    "FolderLoraLoader": FolderLoraLoader,
    "FolderLoraLoaderPretty": FolderLoraLoaderPretty,
    "VisualLoraLoader": VisualLoraLoader,
    "VisualImageLoader": VisualImageLoader,
    "BackToPlaceholder": BackToPlaceholder,
    "LoadImageFromFolder": LoadImageFromFolder,
    "LoadRecentOutputs": LoadRecentOutputs,
    "PreviewLatentLive": PreviewLatentLiveNode,
    "FlowControlDecision": FlowControlDecision,
    "FavoritePromptLoader": FavoritePromptLoader,
    "SaveFavoritePreview": SaveFavoritePreview,
    "TextAspectRatioFinder": TextAspectRatioFinder,
    "PreviewImageSizeAspectRatio": PreviewImageSizeAspectRatio,
    "TextLoraFinder": TextLoraFinder,
    "PromptQueueIterator": PromptQueueIterator,
    "MultiTextReplacer": MultiTextReplacer,

    # Backward Compatibility Aliases
    "FolderLoraLoaderVisualPrettyV2": VisualLoraLoader,
    "ImageLoaderVisualPrettyV2": VisualImageLoader,
    "AspectRatioFinder": TextAspectRatioFinder,
    "LoraTextFinder": TextLoraFinder,
    "UndoPlaceholder": BackToPlaceholder,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "FolderLoraLoader": "🍃 📁 LoRA Loader (Folder)",
    "FolderLoraLoaderPretty": "🍃 ✨ LoRA Loader (Pretty)",
    "VisualLoraLoader": "🍃 🖼️ Visual LoRA Loader",
    "FolderLoraLoaderVisualPrettyV2": "🍃 🖼️ Visual LoRA Loader",
    "VisualImageLoader": "🍃 📷 Visual Image Loader",
    "ImageLoaderVisualPrettyV2": "🍃 📷 Visual Image Loader",
    "BackToPlaceholder": "🍃 ↩️ Back To Placeholder",
    "UndoPlaceholder": "🍃 ↩️ Back To Placeholder",
    "LoadImageFromFolder": "🍃 📂 Load Image From Folder",
    "LoadRecentOutputs": "🍃 ⏱️ Recent Outputs",
    "PreviewLatentLive": "🍃 👁️ Live Latent Preview",
    "FlowControlDecision": "🍃 ⏸️ FlowControl Decision",
    "FavoritePromptLoader": "🍃 ⭐ Favorite Prompts",
    "SaveFavoritePreview": "🍃 💾 Save Favorite Preview",
    "TextAspectRatioFinder": "🍃 📐 Text Aspect Ratio Finder",
    "AspectRatioFinder": "🍃 📐 Text Aspect Ratio Finder",
    "PreviewImageSizeAspectRatio": "🍃 📐 Preview Image Size & Aspect Ratio",
    "TextLoraFinder": "🍃 🔎 Text LoRA Finder & Loader",
    "LoraTextFinder": "🍃 🔎 Text LoRA Finder & Loader",
    "PromptQueueIterator": "🍃 🔄 Prompt Queue Iterator",
    "MultiTextReplacer": "🍃 🔤 Multi Text Replacer"
}

WEB_DIRECTORY = "./web"
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]

server = PromptServer.instance
setup_queue_control_routes(server)

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(CURRENT_DIR, ".env")

routes = server.routes

print("[ComfyUI-FlowControl] 🍃 Loaded 16 nodes & visual endpoints successfully.")

@routes.get("/flow_control/settings")
async def get_settings(request):
    civitai_key = os.getenv("CIVITAI_API_KEY", "")
    tmdb_key = os.getenv("TMDB_API_KEY", "")
    enable_tray = os.getenv("ENABLE_TRAY_ICON", "false").lower() in ["true", "1", "yes"]
    enable_assets_restore = os.getenv("ENABLE_ASSETS_RESTORE", "true").lower() in ["true", "1", "yes"]
    restore_assets_count = int(os.getenv("RESTORE_ASSETS_COUNT", "64"))
    if os.path.exists(ENV_FILE):
        try:
            with open(ENV_FILE, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("CIVITAI_API_KEY="):
                        civitai_key = line.split("=", 1)[1].strip()
                    elif line.startswith("TMDB_API_KEY="):
                        tmdb_key = line.split("=", 1)[1].strip()
                    elif line.startswith("ENABLE_TRAY_ICON="):
                        enable_tray = line.split("=", 1)[1].strip().lower() in ["true", "1", "yes"]
                    elif line.startswith("ENABLE_ASSETS_RESTORE="):
                        enable_assets_restore = line.split("=", 1)[1].strip().lower() in ["true", "1", "yes"]
                    elif line.startswith("RESTORE_ASSETS_COUNT="):
                        try:
                            restore_assets_count = int(line.split("=", 1)[1].strip())
                        except Exception:
                            pass
        except Exception:
            pass
    return web.json_response({
        "civitai_api_key": civitai_key,
        "tmdb_api_key": tmdb_key,
        "enable_tray_icon": enable_tray,
        "enable_assets_restore": enable_assets_restore,
        "restore_assets_count": restore_assets_count
    })

@routes.post("/flow_control/settings")
async def save_settings(request):
    try:
        data = await request.json()
        civitai_key = data.get("civitai_api_key")
        tmdb_key = data.get("tmdb_api_key")
        enable_persistent_queue = data.get("enable_persistent_queue")
        default_pause_state = data.get("default_pause_state")
        default_pause_mode = data.get("default_pause_mode")
        enable_civitai = data.get("enable_civitai_scraping")
        enable_tmdb = data.get("enable_tmdb_scraping")
        enable_lora_usage = data.get("enable_lora_usage")
        enable_tray_icon = data.get("enable_tray_icon")
        enable_assets_restore = data.get("enable_assets_restore")
        restore_assets_count = data.get("restore_assets_count")
        restored_state = data.get("persistent_queue_restored_state")

        lines = []
        if os.path.exists(ENV_FILE):
            try:
                with open(ENV_FILE, "r", encoding="utf-8") as f:
                    lines = f.readlines()
            except Exception:
                lines = []

        new_lines = []
        has_civitai = False
        has_tmdb = False
        has_persistent = False
        has_pause_state = False
        has_pause_mode = False
        has_civ_enable = False
        has_tmdb_enable = False
        has_lora_usage = False
        has_tray_enable = False
        has_assets_restore = False
        has_restore_count = False
        has_restored_state = False

        for line in lines:
            if line.strip().startswith("CIVITAI_API_KEY=") and civitai_key is not None:
                new_lines.append(f"CIVITAI_API_KEY={civitai_key}\n")
                has_civitai = True
            elif line.strip().startswith("TMDB_API_KEY=") and tmdb_key is not None:
                new_lines.append(f"TMDB_API_KEY={tmdb_key}\n")
                has_tmdb = True
            elif line.strip().startswith("ENABLE_PERSISTENT_QUEUE=") and enable_persistent_queue is not None:
                new_lines.append(f"ENABLE_PERSISTENT_QUEUE={enable_persistent_queue}\n")
                has_persistent = True
            elif line.strip().startswith("DEFAULT_PAUSE_STATE=") and default_pause_state is not None:
                new_lines.append(f"DEFAULT_PAUSE_STATE={default_pause_state}\n")
                has_pause_state = True
            elif line.strip().startswith("DEFAULT_PAUSE_MODE=") and default_pause_mode is not None:
                new_lines.append(f"DEFAULT_PAUSE_MODE={default_pause_mode}\n")
                has_pause_mode = True
            elif line.strip().startswith("ENABLE_CIVITAI_SCRAPING=") and enable_civitai is not None:
                new_lines.append(f"ENABLE_CIVITAI_SCRAPING={enable_civitai}\n")
                has_civ_enable = True
            elif line.strip().startswith("ENABLE_TMDB_SCRAPING=") and enable_tmdb is not None:
                new_lines.append(f"ENABLE_TMDB_SCRAPING={enable_tmdb}\n")
                has_tmdb_enable = True
            elif line.strip().startswith("ENABLE_LORA_USAGE=") and enable_lora_usage is not None:
                new_lines.append(f"ENABLE_LORA_USAGE={enable_lora_usage}\n")
                has_lora_usage = True
            elif line.strip().startswith("ENABLE_TRAY_ICON=") and enable_tray_icon is not None:
                new_lines.append(f"ENABLE_TRAY_ICON={enable_tray_icon}\n")
                has_tray_enable = True
            elif line.strip().startswith("ENABLE_ASSETS_RESTORE=") and enable_assets_restore is not None:
                new_lines.append(f"ENABLE_ASSETS_RESTORE={enable_assets_restore}\n")
                has_assets_restore = True
            elif line.strip().startswith("RESTORE_ASSETS_COUNT=") and restore_assets_count is not None:
                new_lines.append(f"RESTORE_ASSETS_COUNT={restore_assets_count}\n")
                has_restore_count = True
            elif line.strip().startswith("PERSISTENT_QUEUE_RESTORED_STATE=") and restored_state is not None:
                new_lines.append(f"PERSISTENT_QUEUE_RESTORED_STATE={restored_state}\n")
                has_restored_state = True
            else:
                new_lines.append(line)

        if not has_civitai and civitai_key is not None:
            new_lines.append(f"CIVITAI_API_KEY={civitai_key}\n")
        if not has_tmdb and tmdb_key is not None:
            new_lines.append(f"TMDB_API_KEY={tmdb_key}\n")
        if not has_persistent and enable_persistent_queue is not None:
            new_lines.append(f"ENABLE_PERSISTENT_QUEUE={enable_persistent_queue}\n")
        if not has_pause_state and default_pause_state is not None:
            new_lines.append(f"DEFAULT_PAUSE_STATE={default_pause_state}\n")
        if not has_pause_mode and default_pause_mode is not None:
            new_lines.append(f"DEFAULT_PAUSE_MODE={default_pause_mode}\n")
        if not has_civ_enable and enable_civitai is not None:
            new_lines.append(f"ENABLE_CIVITAI_SCRAPING={enable_civitai}\n")
        if not has_tmdb_enable and enable_tmdb is not None:
            new_lines.append(f"ENABLE_TMDB_SCRAPING={enable_tmdb}\n")
        if not has_lora_usage and enable_lora_usage is not None:
            new_lines.append(f"ENABLE_LORA_USAGE={enable_lora_usage}\n")
        if not has_tray_enable and enable_tray_icon is not None:
            new_lines.append(f"ENABLE_TRAY_ICON={enable_tray_icon}\n")
        if not has_assets_restore and enable_assets_restore is not None:
            new_lines.append(f"ENABLE_ASSETS_RESTORE={enable_assets_restore}\n")
        if not has_restore_count and restore_assets_count is not None:
            new_lines.append(f"RESTORE_ASSETS_COUNT={restore_assets_count}\n")
        if not has_restored_state and restored_state is not None:
            new_lines.append(f"PERSISTENT_QUEUE_RESTORED_STATE={restored_state}\n")

        with open(ENV_FILE, "w", encoding="utf-8") as f:
            f.writelines(new_lines)

        if civitai_key is not None:
            os.environ["CIVITAI_API_KEY"] = civitai_key
        if tmdb_key is not None:
            os.environ["TMDB_API_KEY"] = tmdb_key
        if enable_lora_usage is not None:
            os.environ["ENABLE_LORA_USAGE"] = enable_lora_usage
        if enable_tray_icon is not None:
            os.environ["ENABLE_TRAY_ICON"] = str(enable_tray_icon)
            tray_enabled_bool = str(enable_tray_icon).lower() in ["true", "1", "yes"]
            tray_manager.set_enabled(tray_enabled_bool)
        if enable_assets_restore is not None:
            os.environ["ENABLE_ASSETS_RESTORE"] = str(enable_assets_restore)
        if restore_assets_count is not None:
            os.environ["RESTORE_ASSETS_COUNT"] = str(restore_assets_count)

        failed_file = os.path.join(CURRENT_DIR, "failed_scrapes.json")
        try:
            with open(failed_file, "w", encoding="utf-8") as f:
                f.write("{}")
        except Exception:
            pass

    except Exception as e:
        print(f"[FlowControl] 🍃 Error saving settings to .env: {e}")

    return web.json_response({"status": "ok"})
