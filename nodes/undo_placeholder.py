import os
import re
import folder_paths
from .utils import parse_pretty_name

UTILS_CATEGORY = "🍃 FlowControl/Utils"

def get_pretty_names_for_folder(folder):
    all_loras = folder_paths.get_filename_list("loras")
    raw_filter = os.path.normpath(folder).lower().replace("\\", "/")
    raw_filter = raw_filter.rstrip("/* ")
    
    pretty_names = set()
    for lora in all_loras:
        lora_path = folder_paths.get_full_path("loras", lora)
        if not lora_path:
            continue
        
        abs_lora = os.path.normpath(lora_path).lower().replace("\\", "/")
        rel_lora = lora.lower().replace("\\", "/")
        
        if raw_filter:
            if not abs_lora.startswith(raw_filter) and not rel_lora.startswith(raw_filter):
                continue
        
        pretty = parse_pretty_name(lora)
        if pretty and pretty not in ["[ NONE ]", "[ RANDOM ]"]:
            pretty_names.add(pretty)
            
    return sorted(list(pretty_names), key=len, reverse=True)

class BackToPlaceholder:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "text": ("STRING", {"forceInput": True}),
                "lora_folder": ("STRING", {"default": ""}),
                "placeholder": ("STRING", {"default": "%celeb%"}),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "undo_placeholder"
    CATEGORY = UTILS_CATEGORY
    DESCRIPTION = "Execution anchor node that undoes placing content into a placeholder slot by restoring placeholder tokens (e.g. %celeb%)."

    def undo_placeholder(self, text=None, lora_folder="", placeholder="%celeb%", prompt=None, **kwargs):
        active_text = text if text is not None else prompt
        if not active_text or not lora_folder:
            return (active_text or "",)
            
        pretty_names = get_pretty_names_for_folder(lora_folder)
        if not pretty_names:
            return (active_text,)
            
        modified_prompt = active_text
        for name in pretty_names:
            escaped_name = re.escape(name)
            pattern = re.compile(rf'\b{escaped_name}\b', re.IGNORECASE)
            modified_prompt = pattern.sub(placeholder, modified_prompt)
            
        return (modified_prompt,)
