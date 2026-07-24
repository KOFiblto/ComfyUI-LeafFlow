import os
import torch
import numpy as np
from PIL import Image, ImageOps
import folder_paths

LOADER_CATEGORY = "FlowControl/Loaders"

class LoadRecentOutputs:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "amount": ("INT", {"default": 5, "min": 1, "max": 100, "step": 1}),
                "index": ("INT", {
                    "default": 0, 
                    "min": 0, 
                    "max": 1000000, 
                    "step": 1,
                    "control_after_generate": "increment"
                }),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "load_single_image"
    CATEGORY = LOADER_CATEGORY
    DESCRIPTION = "Cycles through recently generated output images saved in ComfyUI output directory by step index."

    def load_single_image(self, amount, index):
        output_dir = folder_paths.get_output_directory()

        if not os.path.exists(output_dir):
            dummy = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            return (dummy,)

        valid_extensions = ('.png', '.jpg', '.jpeg', '.webp', '.bmp')
        file_list = []
        for root, _, files in os.walk(output_dir):
            for file in files:
                if file.lower().endswith(valid_extensions):
                    path = os.path.join(root, file)
                    try:
                        mtime = os.path.getmtime(path)
                        file_list.append((path, mtime))
                    except OSError:
                        continue

        if not file_list:
            dummy = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
            return (dummy,)

        file_list.sort(key=lambda x: x[1], reverse=True)
        recent_files = file_list[:amount]
        recent_files.reverse()

        actual_index = index % len(recent_files)
        target_file, _ = recent_files[actual_index]

        try:
            img = Image.open(target_file)
            img = ImageOps.exif_transpose(img)
            image = img.convert("RGB")
            image = np.array(image).astype(np.float32) / 255.0
            image = torch.from_numpy(image).unsqueeze(0)
        except Exception as e:
            print(f"[FlowControl] Error loading recent output image {target_file}: {e}")
            image = torch.zeros((1, 64, 64, 3), dtype=torch.float32)

        return (image,)
