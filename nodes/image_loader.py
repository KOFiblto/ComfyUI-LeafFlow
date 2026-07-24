import os
import json
import torch
import numpy as np
from PIL import Image, ImageOps
import io
import piexif
import piexif.helper
from aiohttp import web
from server import PromptServer

IMAGE_CATEGORY = "FlowControl/Loaders"
CURRENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_FILE = os.path.join(CURRENT_DIR, "image_prompts_cache.json")

def parse_positive_from_parameters(parameters):
    if not parameters:
        return ""
    lines = parameters.split("\n")
    pos_lines = []
    for line in lines:
        if line.strip().startswith("Negative prompt:") or line.strip().startswith("Steps:"):
            break
        pos_lines.append(line)
    return "\n".join(pos_lines).strip()

def extract_metadata_from_image(filepath):
    positive_prompt = ""
    width, height = 0, 0
    try:
        with Image.open(filepath) as img:
            width, height = img.size
            if img.format == 'PNG':
                parameters = img.info.get("parameters", "")
                if parameters:
                    positive_prompt = parse_positive_from_parameters(parameters)
            else:
                exif_data = img.info.get("exif")
                if exif_data:
                    exif_dict = piexif.load(exif_data)
                    user_comment = exif_dict.get("Exif", {}).get(piexif.ExifIFD.UserComment)
                    if user_comment:
                        try:
                            parameters = piexif.helper.UserComment.load(user_comment)
                            if isinstance(parameters, bytes):
                                parameters = parameters.decode('utf-8', errors='ignore')
                            positive_prompt = parse_positive_from_parameters(parameters)
                        except Exception:
                            pass
    except Exception as e:
        print(f"[FlowControl] Error extracting metadata: {e}")
    return positive_prompt, width, height

def load_prompts_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_prompts_cache(cache):
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"[FlowControl] Failed to save prompts cache: {e}")

server = PromptServer.instance
routes = server.routes

@routes.get("/image_loader/get_images")
async def get_images_endpoint(request):
    folder = request.query.get("folder", "")
    if not folder or not os.path.exists(folder):
        return web.json_response({"names": [], "mapping": {}, "prompts": {}})
        
    image_extensions = {".png", ".jpg", ".jpeg", ".webp", ".PNG", ".JPG", ".JPEG", ".WEBP"}
    names = []
    mapping = {}
    prompts = {}
    
    cache = load_prompts_cache()
    cache_modified = False
    
    for root, dirs, files in os.walk(folder):
        for file in files:
            ext = os.path.splitext(file)[1]
            if ext in image_extensions:
                full_path = os.path.normpath(os.path.join(root, file))
                rel_path = os.path.relpath(full_path, folder).replace("\\", "/")
                names.append(rel_path)
                mapping[rel_path] = rel_path
                
                try:
                    mtime = os.path.getmtime(full_path)
                    cached_entry = cache.get(full_path)
                    
                    if cached_entry and cached_entry.get("mtime") == mtime:
                        prompt_text = cached_entry.get("prompt", "")
                    else:
                        prompt_text, _, _ = extract_metadata_from_image(full_path)
                        cache[full_path] = {
                            "mtime": mtime,
                            "prompt": prompt_text
                        }
                        cache_modified = True
                except Exception as e:
                    print(f"[FlowControl] Error checking cache for {file}: {e}")
                    prompt_text = ""
                
                prompts[rel_path] = prompt_text

    if cache_modified:
        save_prompts_cache(cache)

    return web.json_response({
        "names": names,
        "mapping": mapping,
        "prompts": prompts
    })

@routes.get("/image_loader/get_thumbnail")
async def get_thumbnail_endpoint(request):
    folder = request.query.get("folder", "")
    image_rel = request.query.get("image", "")
    
    full_path = os.path.normpath(os.path.join(folder, image_rel))
    if not os.path.exists(full_path):
        return web.Response(status=404)
        
    try:
        with Image.open(full_path) as img:
            img.thumbnail((256, 256))
            img_byte_arr = io.BytesIO()
            img.convert("RGB").save(img_byte_arr, format='JPEG', quality=80)
            return web.Response(body=img_byte_arr.getvalue(), content_type="image/jpeg")
    except Exception:
        return web.FileResponse(full_path)

@routes.get("/image_loader/get_full_image")
async def get_full_image_endpoint(request):
    folder = request.query.get("folder", "")
    image_rel = request.query.get("image", "")
    
    full_path = os.path.normpath(os.path.join(folder, image_rel))
    if not os.path.exists(full_path):
        return web.Response(status=404)
    return web.FileResponse(full_path)

class ImageLoaderVisualPrettyV2:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "folder_path": ("STRING", {"default": ""}),
            },
            "hidden": {
                "_selected_image": ("STRING", {"default": ""}),
            }
        }

    RETURN_TYPES = ("IMAGE", "STRING", "INT", "INT")
    RETURN_NAMES = ("IMAGE", "positive_prompt", "width", "height")
    FUNCTION = "load_image"
    CATEGORY = IMAGE_CATEGORY
    DESCRIPTION = "Visual image browser with prompt metadata extraction (PNG parameters & EXIF user comments) and resolution outputs."

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return kwargs.get("_selected_image", "")

    def load_image(self, folder_path, _selected_image=""):
        if not folder_path or not _selected_image:
            empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            return (empty_image, "", 0, 0)

        full_path = os.path.normpath(os.path.join(folder_path, _selected_image))
        if not os.path.exists(full_path):
            empty_image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            return (empty_image, "", 0, 0)

        i = Image.open(full_path)
        i = ImageOps.exif_transpose(i)
        
        positive_prompt, width, height = extract_metadata_from_image(full_path)
        if width == 0 or height == 0:
            width, height = i.size

        image = i.convert("RGB")
        image = np.array(image).astype(np.float32) / 255.0
        image = torch.from_numpy(image)[None,]

        return (image, positive_prompt, width, height)
