import os
import json
import hashlib
import logging
from PIL import Image

import folder_paths

CURRENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE = os.path.join(CURRENT_DIR, ".env")

def get_env_setting(key, default_val):
    if os.path.exists(ENV_FILE):
        try:
            with open(ENV_FILE, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip().startswith(f"{key}="):
                        return line.strip().split("=", 1)[1].strip()
        except Exception:
            pass
    return default_val

def is_assets_restore_enabled():
    val = get_env_setting("ENABLE_ASSETS_RESTORE", "true").lower()
    return val in ["true", "1", "yes"]

def get_assets_restore_count():
    try:
        val = int(get_env_setting("RESTORE_ASSETS_COUNT", "64"))
        return max(1, min(1000, val))
    except Exception:
        return 64

class AssetsRestoreManager:
    def __init__(self):
        self._restored_on_launch = False

    def extract_image_metadata(self, filepath):
        """Extracts embedded prompt and workflow graph metadata from image (read-only)."""
        prompt_dict = {}
        workflow_dict = {}
        positive_prompt = ""

        try:
            with Image.open(filepath) as img:
                if img.format == "PNG":
                    prompt_raw = img.info.get("prompt")
                    workflow_raw = img.info.get("workflow")
                    parameters_raw = img.info.get("parameters")

                    if prompt_raw:
                        try:
                            prompt_dict = json.loads(prompt_raw) if isinstance(prompt_raw, str) else prompt_raw
                        except Exception:
                            pass

                    if workflow_raw:
                        try:
                            workflow_dict = json.loads(workflow_raw) if isinstance(workflow_raw, str) else workflow_raw
                        except Exception:
                            pass

                    if parameters_raw:
                        positive_prompt = str(parameters_raw)
        except Exception:
            pass

        return prompt_dict, workflow_dict, positive_prompt

    def scan_output_images(self, base_output_dir, limit=64):
        """Scans output directory recursively (strictly read-only) and returns top `limit` newest images."""
        if not os.path.exists(base_output_dir):
            return []

        valid_extensions = {".png", ".jpg", ".jpeg", ".webp", ".PNG", ".JPG", ".JPEG", ".WEBP"}
        found_images = []

        norm_base = os.path.normpath(base_output_dir)

        for root, _, files in os.walk(norm_base):
            for file in files:
                _, ext = os.path.splitext(file)
                if ext in valid_extensions:
                    full_path = os.path.join(root, file)
                    try:
                        mtime = os.path.getmtime(full_path)
                        rel_dir = os.path.relpath(root, norm_base)
                        subfolder = "" if rel_dir == "." else rel_dir.replace("\\", "/")
                        found_images.append({
                            "filepath": full_path,
                            "filename": file,
                            "subfolder": subfolder,
                            "mtime": mtime
                        })
                    except Exception:
                        pass

        # Sort newest first, take limit, then reverse to chronological (oldest to newest)
        found_images.sort(key=lambda x: x["mtime"], reverse=True)
        top_images = found_images[:limit]
        top_images.reverse()

        return top_images

    def restore_on_launch(self, server, limit=None, force=False):
        """Populates PromptQueue.history on ComfyUI startup with the latest generated images."""
        if self._restored_on_launch and not force:
            return 0

        if limit is None:
            limit = get_assets_restore_count()

        base_output_dir = folder_paths.get_output_directory()
        images = self.scan_output_images(base_output_dir, limit=limit)

        if not images:
            self._restored_on_launch = True
            return 0

        if not hasattr(server, "prompt_queue"):
            return 0

        prompt_queue = server.prompt_queue
        restored_count = 0

        with prompt_queue.mutex:
            for idx, item in enumerate(images, 1):
                filepath = item["filepath"]
                filename = item["filename"]
                subfolder = item["subfolder"]

                rel_key = f"{subfolder}/{filename}" if subfolder else filename
                prompt_id = f"flowcontrol-restore-{hashlib.sha256(rel_key.encode('utf-8')).hexdigest()[:16]}"

                # Skip if already present in history
                if prompt_id in prompt_queue.history:
                    continue

                prompt_dict, workflow_dict, positive_prompt = self.extract_image_metadata(filepath)
                output_node_id = "9"
                if prompt_dict:
                    for nid, nval in prompt_dict.items():
                        if isinstance(nval, dict) and "SaveImage" in nval.get("class_type", ""):
                            output_node_id = str(nid)
                            break

                extra_pnginfo = {}
                if workflow_dict:
                    extra_pnginfo["workflow"] = workflow_dict
                if positive_prompt:
                    extra_pnginfo["positive_prompt"] = positive_prompt

                history_entry = {
                    "prompt": [
                        idx,
                        prompt_id,
                        prompt_dict,
                        {
                            "extra_pnginfo": extra_pnginfo,
                            "client_id": "flowcontrol_restored"
                        },
                        [output_node_id]
                    ],
                    "outputs": {
                        output_node_id: {
                            "images": [
                                {
                                    "filename": filename,
                                    "subfolder": subfolder,
                                    "type": "output"
                                }
                            ]
                        }
                    },
                    "status": {
                        "status_str": "success",
                        "completed": True,
                        "messages": []
                    }
                }

                prompt_queue.history[prompt_id] = history_entry
                restored_count += 1

                # Ingest into modern ComfyUI asset database if --enable-assets is active
                try:
                    from app.assets.services.ingest import register_file_in_place
                    register_file_in_place(abs_path=filepath, name=filename, tags=["output"])
                except Exception:
                    pass

        self._restored_on_launch = True
        print(f"[FlowControl] Restored {restored_count} recent image(s) into Assets / History pane.")

        try:
            server.queue_updated()
        except Exception:
            pass

        return restored_count

assets_restore_manager = AssetsRestoreManager()
