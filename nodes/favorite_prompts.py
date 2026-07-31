import os
import shutil
import json
import random
from aiohttp import web
from server import PromptServer
import folder_paths
from .image_loader import ImageLoaderVisualPrettyV2
from nodes import PreviewImage

FAV_DIR = os.path.join(folder_paths.get_output_directory(), "favorites")

class SaveFavoritePreview(PreviewImage):
    @classmethod
    def INPUT_TYPES(s):
        return {"required":
                    {"images": ("IMAGE", ), },
                "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"},
                }

    RETURN_TYPES = ()
    FUNCTION = "save_images"
    OUTPUT_NODE = True
    CATEGORY = "🍃 FlowControl/Previews"
    DESCRIPTION = "Preview Image with a native Save to Favorites button."

    def save_images(self, images, filename_prefix="ComfyUI", prompt=None, extra_pnginfo=None):
        return super().save_images(images, filename_prefix, prompt, extra_pnginfo)

class FavoritePromptLoader(ImageLoaderVisualPrettyV2):
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "subcategory": ("STRING", {"default": "Minimalist"}),
                "display_mode": (["Scrollable", "Show All"], {"default": "Scrollable"}),
            },
            "hidden": {
                "_selected_image": ("STRING", {"default": ""}),
            }
        }
    
    RETURN_TYPES = ("IMAGE", "STRING", "MASK", "INT", "INT")
    RETURN_NAMES = ("IMAGE", "positive_prompt", "MASK", "width", "height")
    FUNCTION = "load_favorite"
    CATEGORY = "🍃 FlowControl/Loaders"
    DESCRIPTION = "Visually pick an image from your saved Favorites and output its prompt."

    def load_favorite(self, subcategory, display_mode="Scrollable", _selected_image=""):
        folder_path = os.path.join(FAV_DIR, subcategory)
        return super().load_image(folder_path, display_mode, _selected_image)

server = PromptServer.instance
routes = server.routes

@routes.post("/flowcontrol/save_favorite")
async def save_favorite_endpoint(request):
    try:
        data = await request.json()
        filename = data.get("filename")
        subfolder = data.get("subfolder", "")
        type_str = data.get("type", "temp")
        subcategory = data.get("subcategory", "Default").strip()
        custom_name = data.get("custom_name", "").strip()

        if not filename:
            return web.json_response({"success": False, "error": "No filename provided"})

        src_dir = folder_paths.get_directory_by_type(type_str)
        if not src_dir:
            return web.json_response({"success": False, "error": "Invalid type"})
            
        if subfolder:
            src_dir = os.path.join(src_dir, subfolder)
            
        src_path = os.path.join(src_dir, filename)
        
        if not os.path.exists(src_path):
            return web.json_response({"success": False, "error": "File not found"})

        dest_dir = os.path.join(FAV_DIR, subcategory)
        os.makedirs(dest_dir, exist_ok=True)
        
        base, ext = os.path.splitext(filename)
        if custom_name:
            # Sanitize
            custom_name = "".join([c for c in custom_name if c.isalnum() or c in " -_"]).strip()
            if not custom_name:
                custom_name = base
            dest_filename = custom_name + ext
        else:
            dest_filename = filename
            
        dest_path = os.path.join(dest_dir, dest_filename)
        
        if os.path.exists(dest_path):
            base_d, ext_d = os.path.splitext(dest_filename)
            suffix = ''.join(random.choice("abcdefghijklmnopqrstuvwxyz") for _ in range(4))
            dest_path = os.path.join(dest_dir, f"{base_d}_{suffix}{ext_d}")

        shutil.copy2(src_path, dest_path)
        
        return web.json_response({"success": True, "dest": dest_path})
    except Exception as e:
        return web.json_response({"success": False, "error": str(e)})
