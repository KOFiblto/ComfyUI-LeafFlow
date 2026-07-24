import os
import json
import torch
import numpy as np
from PIL import Image, ImageOps
import piexif
import piexif.helper
from aiohttp import web
from server import PromptServer

IMAGE_CATEGORY = "FlowControl/Loaders"

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
