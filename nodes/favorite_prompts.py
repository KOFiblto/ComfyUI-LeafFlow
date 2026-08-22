import os
import re
import shutil
import json
import random
from aiohttp import web
from server import PromptServer
import folder_paths
from PIL import Image, ImageOps
import torch
import numpy as np
try:
    from nodes import PreviewImage
except Exception:
    class PreviewImage:
        def save_images(self, images, filename_prefix="ComfyUI", prompt=None, extra_pnginfo=None):
            return {"ui": {"images": []}}

from .image_loader import VisualImageLoader

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
    CATEGORY = "🍃 LeafFlow/Previews"
    DESCRIPTION = "Preview Image with a native Save to Favorites button."

    def save_images(self, images, filename_prefix="ComfyUI", prompt=None, extra_pnginfo=None):
        return super().save_images(images, filename_prefix, prompt, extra_pnginfo)

class FavoritePromptLoader(VisualImageLoader):
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "display_mode": (["Scrollable", "Show All"], {"default": "Scrollable", "advanced": True}),
                "sort_images_by": (["Name (A-Z)", "Name (Z-A)", "Date Modified (Newest First)", "Date Modified (Oldest First)"], {"default": "Date Modified (Newest First)", "advanced": True}),
            },
            "hidden": {
                "_selected_image": ("STRING", {"default": ""}),
                "_favorites_folder": ("STRING", {"default": "output/favorites"}),
            }
        }
    
    RETURN_TYPES = ("IMAGE", "STRING", "MASK", "INT", "INT")
    RETURN_NAMES = ("IMAGE", "positive_prompt", "MASK", "width", "height")
    FUNCTION = "load_favorite"
    CATEGORY = "🍃 LeafFlow/Loaders"
    DESCRIPTION = "Visually pick an image from your saved Favorites and output its prompt."

    def load_favorite(self, display_mode="Scrollable", sort_images_by="Date Modified (Newest First)", _selected_image="", _favorites_folder="output/favorites", **kwargs):
        folder_path = _favorites_folder
        if not os.path.isabs(folder_path):
            folder_path = os.path.join(folder_paths.base_path, folder_path)
            
        img, prompt, w, h = super().load_image(folder=folder_path, display_mode=display_mode, sort_images_by=sort_images_by, _selected_image=_selected_image)
        
        mask = torch.zeros((64, 64), dtype=torch.float32, device="cpu")
        full_path = os.path.normpath(os.path.join(folder_path, _selected_image))
        if _selected_image and os.path.exists(full_path):
            i = Image.open(full_path)
            i = ImageOps.exif_transpose(i)
            if 'A' in i.getbands():
                mask = np.array(i.getchannel('A')).astype(np.float32) / 255.0
                mask = 1. - torch.from_numpy(mask)
            else:
                mask = torch.zeros((i.size[1], i.size[0]), dtype=torch.float32, device="cpu")
                
        return (img, prompt, mask, w, h)

server = PromptServer.instance
routes = server.routes

@routes.post("/leafflow/save_favorite")
async def save_favorite_endpoint(request):
    try:
        data = await request.json()
        filename = data.get("filename")
        subfolder = data.get("subfolder", "")
        type_str = data.get("type", "temp")
        subcategory = data.get("subcategory", "").strip()
        subcategory = re.sub(r'[\\:*?"<>|]', '', subcategory).strip().strip('/')
        if not subcategory:
            subcategory = "Root"

        custom_name = data.get("custom_name", "").strip()
        dest_folder_arg = data.get("dest_folder", FAV_DIR)

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

        if os.path.isabs(dest_folder_arg):
            dest_base = dest_folder_arg
        else:
            dest_base = os.path.join(folder_paths.base_path, dest_folder_arg)
            
        dest_dir = os.path.join(dest_base, subcategory)
        os.makedirs(dest_dir, exist_ok=True)
        
        base, ext = os.path.splitext(filename)
        if custom_name:
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

@routes.get("/leafflow/get_image_prompt")
async def get_image_prompt_endpoint(request):
    try:
        filename = request.query.get("filename")
        subfolder = request.query.get("subfolder", "")
        type_str = request.query.get("type", "temp")
        
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
            
        from .image_loader import extract_metadata_from_image
        prompt, _, _ = extract_metadata_from_image(src_path)
        
        return web.json_response({"success": True, "prompt": prompt})
    except Exception as e:
        return web.json_response({"success": False, "error": str(e)})
