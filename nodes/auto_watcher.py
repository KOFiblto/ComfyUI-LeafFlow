import os
import time
import torch
import numpy as np
import re
from PIL import Image, ImageOps
import comfy.model_management
from .utils import sanitize_folder_path

class LoadImageFromFolder:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "folder": ("STRING", {"default": "input/watch"}),
                "wait_if_folder_is_empty": ("BOOLEAN", {"default": True}),
                "rescan_interval": ("INT", {"default": 2, "min": 1, "max": 60}),
                "sort_by": (["date_modified", "date_created", "name"], {"default": "date_modified"}),
                "regex_filter": ("STRING", {"default": ".*"}),
            }
        }

    RETURN_TYPES = ("IMAGE", "BOOLEAN")
    RETURN_NAMES = ("image", "has_image")
    FUNCTION = "watch"
    CATEGORY = "🍃 FlowControl/Automation"
    DESCRIPTION = "Loads an image from a folder, optionally waiting if the folder is empty."

    @classmethod
    def IS_CHANGED(s, **kwargs):
        # Force re-execution to continuously check folder status
        return float("NaN")

    def create_dummy_image(self):
        # Returns a 1x1 0-tensor for no-image state
        return torch.zeros((1, 64, 64, 3), dtype=torch.float32)

    def load_and_remove_image(self, filepath):
        with Image.open(filepath) as img:
            i = ImageOps.exif_transpose(img)
            image_array = np.array(i.convert("RGB")).astype(np.float32) / 255.0
            img_tensor = torch.from_numpy(image_array)[None,]
        
        try:
            os.remove(filepath)
        except Exception as e:
            print(f"[FlowControl] Warning: Failed to remove processed file '{filepath}': {e}")
            
        return img_tensor

    def get_filtered_files(self, folder, sort_by, regex_filter):
        valid_extensions = ('.png', '.jpg', '.jpeg', '.webp')
        try:
            regex = re.compile(regex_filter)
        except Exception as e:
            print(f"[FlowControl] Invalid regex: {e}. Falling back to .*")
            regex = re.compile(".*")

        files = []
        for f in os.listdir(folder):
            filepath = os.path.join(folder, f)
            if os.path.isfile(filepath) and f.lower().endswith(valid_extensions):
                if regex.search(f):
                    files.append(filepath)

        if not files:
            return []

        valid_files = []
        for file in files:
            try:
                if sort_by == "date_modified":
                    val = os.path.getmtime(file)
                elif sort_by == "date_created":
                    val = os.path.getctime(file)
                else:
                    val = file
                valid_files.append((file, val))
            except OSError:
                continue

        if sort_by in ("date_modified", "date_created"):
            valid_files.sort(key=lambda x: x[1], reverse=True) # newest first
        elif sort_by == "name":
            valid_files.sort(key=lambda x: x[1]) # alphabetical
            
        return [x[0] for x in valid_files]

    def watch(self, folder, wait_if_folder_is_empty, rescan_interval, sort_by, regex_filter):
        folder = sanitize_folder_path(folder, default_dir="input/watch")
        
        if wait_if_folder_is_empty:
            while True:
                comfy.model_management.throw_exception_if_processing_interrupted()

                if os.path.exists(folder) and os.path.isdir(folder):
                    try:
                        files = self.get_filtered_files(folder, sort_by, regex_filter)
                        if files:
                            filepath = files[0] # Pick the first one based on sorting
                            try:
                                img_tensor = self.load_and_remove_image(filepath)
                                return (img_tensor, True)
                            except Exception as e:
                                print(f"[FlowControl] Error processing {filepath}: {e}")
                    except Exception as e:
                        print(f"[FlowControl] Error accessing directory {folder}: {e}")

                time.sleep(rescan_interval)
        else:
            if os.path.exists(folder) and os.path.isdir(folder):
                try:
                    files = self.get_filtered_files(folder, sort_by, regex_filter)
                    if files:
                        filepath = files[0]
                        try:
                            img_tensor = self.load_and_remove_image(filepath)
                            return (img_tensor, True)
                        except Exception as e:
                            print(f"[FlowControl] Error processing {filepath}: {e}")
                except Exception as e:
                    print(f"[FlowControl] Error accessing directory {folder}: {e}")

            # No image present or folder missing -> return dummy tensor & False immediately
            return (self.create_dummy_image(), False)
