import os
import re
import folder_paths

UTILS_CATEGORY = "🍃 FlowControl/Utils"

def parse_pretty_name(filepath):
    base = os.path.splitext(os.path.basename(filepath))[0]
    parts = base.split('_')
    if len(parts) >= 2:
        name_part = parts[1]
        name_part = re.sub(r'(?<!^)(?=[A-Z])', ' ', name_part)
        name_part = name_part.replace('-', ' ')
        
        words = name_part.split()
        formatted_words = []
        for word in words:
            if word.upper() in ["NSFW", "LORA", "V1", "V2", "V3", "V4", "FP16", "HM"]:
                formatted_words.append(word.upper())
            else:
                formatted_words.append(word.capitalize())
        return " ".join(formatted_words)
    return base.replace('-', ' ')

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

class UndoPlaceholder:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "prompt": ("STRING", {"forceInput": True}),
                "lora_folder": ("STRING", {"default": ""}),
                "placeholder": ("STRING", {"default": "%celeb%"}),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("prompt",)
    FUNCTION = "undo_placeholder"
    CATEGORY = UTILS_CATEGORY
    DESCRIPTION = "Scans prompt string for names matching LoRA files in the given folder and replaces them back with a placeholder token (e.g. %celeb%)."

    def undo_placeholder(self, prompt, lora_folder, placeholder):
        if not prompt or not lora_folder:
            return (prompt,)
            
        pretty_names = get_pretty_names_for_folder(lora_folder)
        if not pretty_names:
            return (prompt,)
            
        modified_prompt = prompt
        for name in pretty_names:
            escaped_name = re.escape(name)
            pattern = re.compile(rf'\b{escaped_name}\b', re.IGNORECASE)
            modified_prompt = pattern.sub(placeholder, modified_prompt)
            
        return (modified_prompt,)
