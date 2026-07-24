import os
from aiohttp import web
from server import PromptServer

from .nodes.queue_control import PauseQueueNode, PersistentQueueNode, setup_queue_control_routes
from .nodes.lora_loader import FolderLoraLoaderVisualPrettyV2
from .nodes.image_loader import ImageLoaderVisualPrettyV2
from .nodes.undo_placeholder import UndoPlaceholder
from .nodes.auto_watcher import AutoWatcherNode
from .nodes.load_recent import LoadRecentOutputs
from .nodes.preview_latent import PreviewLatentLiveNode

NODE_CLASS_MAPPINGS = {
    "PauseQueueNode": PauseQueueNode,
    "PersistentQueueNode": PersistentQueueNode,
    "FolderLoraLoaderVisualPrettyV2": FolderLoraLoaderVisualPrettyV2,
    "ImageLoaderVisualPrettyV2": ImageLoaderVisualPrettyV2,
    "UndoPlaceholder": UndoPlaceholder,
    "AutoWatcherNode": AutoWatcherNode,
    "LoadRecentOutputs": LoadRecentOutputs,
    "PreviewLatentLive": PreviewLatentLiveNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PauseQueueNode": "Pause Queue",
    "PersistentQueueNode": "Persistent Queue",
    "FolderLoraLoaderVisualPrettyV2": "Visual LoRA Loader",
    "ImageLoaderVisualPrettyV2": "Visual Image Loader",
    "UndoPlaceholder": "Undo Placeholder",
    "AutoWatcherNode": "Auto Watcher",
    "LoadRecentOutputs": "Recent Outputs",
    "PreviewLatentLive": "Live Latent Preview"
}

WEB_DIRECTORY = "./web"
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]

server = PromptServer.instance
setup_queue_control_routes(server)

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(CURRENT_DIR, ".env")

routes = server.routes

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

        for line in lines:
            if line.strip().startswith("CIVITAI_API_KEY=") and civitai_key is not None:
                new_lines.append(f"CIVITAI_API_KEY={civitai_key}\n")
                has_civitai = True
            elif line.strip().startswith("TMDB_API_KEY=") and tmdb_key is not None:
                new_lines.append(f"TMDB_API_KEY={tmdb_key}\n")
                has_tmdb = True
            else:
                new_lines.append(line)

        if not has_civitai and civitai_key is not None:
            new_lines.append(f"CIVITAI_API_KEY={civitai_key}\n")
        if not has_tmdb and tmdb_key is not None:
            new_lines.append(f"TMDB_API_KEY={tmdb_key}\n")

        with open(ENV_FILE, "w", encoding="utf-8") as f:
            f.writelines(new_lines)

        if civitai_key is not None:
            os.environ["CIVITAI_API_KEY"] = civitai_key
        if tmdb_key is not None:
            os.environ["TMDB_API_KEY"] = tmdb_key

    except Exception as e:
        print(f"[FlowControl] Error saving settings to .env: {e}")

    return web.json_response({"status": "ok"})
