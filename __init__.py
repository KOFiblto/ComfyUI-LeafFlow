import os
from aiohttp import web
from server import PromptServer

from .nodes.queue_control import PauseQueueNode, PersistentQueueNode, setup_queue_control_routes
from .nodes.lora_loader import (
    FolderLoraLoader,
    FolderLoraLoaderPretty,
    FolderLoraLoaderVisualPretty,
    FolderLoraLoaderVisualPrettyV2
)
from .nodes.image_loader import ImageLoaderVisualPrettyV2
from .nodes.undo_placeholder import UndoPlaceholder
from .nodes.auto_watcher import AutoWatcherNode
from .nodes.load_recent import LoadRecentOutputs
from .nodes.preview_latent import PreviewLatentLiveNode
from .nodes.decision_node import FlowControlDecision


NODE_CLASS_MAPPINGS = {
    "PauseQueueNode": PauseQueueNode,
    "PersistentQueueNode": PersistentQueueNode,
    "FolderLoraLoader": FolderLoraLoader,
    "FolderLoraLoaderPretty": FolderLoraLoaderPretty,
    "FolderLoraLoaderVisualPretty": FolderLoraLoaderVisualPretty,
    "FolderLoraLoaderVisualPrettyV2": FolderLoraLoaderVisualPrettyV2,
    "ImageLoaderVisualPrettyV2": ImageLoaderVisualPrettyV2,
    "UndoPlaceholder": UndoPlaceholder,
    "AutoWatcherNode": AutoWatcherNode,
    "LoadRecentOutputs": LoadRecentOutputs,
    "PreviewLatentLive": PreviewLatentLiveNode,
    "FlowControlDecision": FlowControlDecision
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PauseQueueNode": "🍃 Pause Queue",
    "PersistentQueueNode": "🍃 Persistent Queue",
    "FolderLoraLoader": "🍃 LoRA Loader (by Folder)",
    "FolderLoraLoaderPretty": "🍃 LoRA Loader (Pretty)",
    "FolderLoraLoaderVisualPretty": "🍃 Visual LoRA Picker",
    "FolderLoraLoaderVisualPrettyV2": "🍃 Visual LoRA Loader",
    "ImageLoaderVisualPrettyV2": "🍃 Visual Image Loader",
    "UndoPlaceholder": "🍃 Undo Placeholder",
    "AutoWatcherNode": "🍃 Auto Watcher",
    "LoadRecentOutputs": "🍃 Recent Outputs",
    "PreviewLatentLive": "🍃 Live Latent Preview",
    "FlowControlDecision": "🍃 FlowControl Decision"
}

WEB_DIRECTORY = "./web"
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]

server = PromptServer.instance
setup_queue_control_routes(server)

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(CURRENT_DIR, ".env")

routes = server.routes

print("[ComfyUI-FlowControl] 🍃 Loaded 12 nodes & visual endpoints successfully.")

@routes.get("/flow_control/settings")
async def get_settings(request):
    civitai_key = os.getenv("CIVITAI_API_KEY", "")
    tmdb_key = os.getenv("TMDB_API_KEY", "")
    if os.path.exists(ENV_FILE):
        try:
            with open(ENV_FILE, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("CIVITAI_API_KEY="):
                        civitai_key = line.split("=", 1)[1].strip()
                    elif line.startswith("TMDB_API_KEY="):
                        tmdb_key = line.split("=", 1)[1].strip()
        except Exception:
            pass
    return web.json_response({
        "civitai_api_key": civitai_key,
        "tmdb_api_key": tmdb_key
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
        if not has_restored_state and restored_state is not None:
            new_lines.append(f"PERSISTENT_QUEUE_RESTORED_STATE={restored_state}\n")

        with open(ENV_FILE, "w", encoding="utf-8") as f:
            f.writelines(new_lines)

        if civitai_key is not None:
            os.environ["CIVITAI_API_KEY"] = civitai_key
        if tmdb_key is not None:
            os.environ["TMDB_API_KEY"] = tmdb_key

    except Exception as e:
        print(f"[FlowControl] 🍃 Error saving settings to .env: {e}")

    return web.json_response({"status": "ok"})
