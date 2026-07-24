import os
import time
import torch
import numpy as np
from PIL import Image, ImageOps
import comfy.model_management

class AutoWatcherNode:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "watch_dir": ("STRING", {"default": "input/watch"}),
                "interval_sec": ("INT", {"default": 2, "min": 1, "max": 60}),
                "wait_for_image": ("BOOLEAN", {"default": True}),
            }
        }

    RETURN_TYPES = ("IMAGE", "BOOLEAN")
    RETURN_NAMES = ("image", "has_image")
    FUNCTION = "watch"
    CATEGORY = "FlowControl/Automation"
    DESCRIPTION = "Monitors a directory for incoming images. Can poll and wait for an image to arrive, or load if available without waiting."

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
            print(f"[AutoWatcher] Warning: Failed to remove processed file '{filepath}': {e}")
            
        return img_tensor

    def watch(self, watch_dir, interval_sec, wait_for_image=True):
        valid_extensions = ('.png', '.jpg', '.jpeg', '.webp')

        if wait_for_image:
            # Poll loop: waits until an image arrives in watch_dir
            while True:
                comfy.model_management.throw_exception_if_processing_interrupted()

                if os.path.exists(watch_dir) and os.path.isdir(watch_dir):
                    try:
                        files = [
                            f for f in os.listdir(watch_dir)
                            if os.path.isfile(os.path.join(watch_dir, f)) and f.lower().endswith(valid_extensions)
                        ]
                        if files:
                            filepath = os.path.join(watch_dir, files[0])
                            try:
                                img_tensor = self.load_and_remove_image(filepath)
                                return (img_tensor, True)
                            except Exception as e:
                                print(f"[AutoWatcher] Error processing {filepath}: {e}")
                    except Exception as e:
                        print(f"[AutoWatcher] Error accessing directory {watch_dir}: {e}")

                time.sleep(interval_sec)
        else:
            # Non-blocking check: returns immediately if no image is present
            if os.path.exists(watch_dir) and os.path.isdir(watch_dir):
                try:
                    files = [
                        f for f in os.listdir(watch_dir)
                        if os.path.isfile(os.path.join(watch_dir, f)) and f.lower().endswith(valid_extensions)
                    ]
                    if files:
                        filepath = os.path.join(watch_dir, files[0])
                        try:
                            img_tensor = self.load_and_remove_image(filepath)
                            return (img_tensor, True)
                        except Exception as e:
                            print(f"[AutoWatcher] Error processing {filepath}: {e}")
                except Exception as e:
                    print(f"[AutoWatcher] Error accessing directory {watch_dir}: {e}")

            # No image present or folder missing -> return dummy tensor & False immediately
            return (self.create_dummy_image(), False)
