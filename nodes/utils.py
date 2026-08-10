import os
import re
import folder_paths

def parse_pretty_name(filepath):
    if not filepath or filepath in ["[ NONE ]", "[ RANDOM ]"]:
        return ""
    base = os.path.splitext(os.path.basename(filepath))[0]
    parts = base.split('_')
    if len(parts) >= 2:
        name_part = parts[1]
        name_part = re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', name_part)
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

def parse_pretty_name_with_version(filepath):
    if not filepath or filepath in ["[ NONE ]", "[ RANDOM ]"]:
        return ""
    base = os.path.splitext(os.path.basename(filepath))[0]
    parts = base.split('_')
    pretty_name = parse_pretty_name(filepath)
    
    if len(parts) >= 3:
        version_candidate = parts[2].strip()
        if re.match(r'^v[0-9]+(\.[0-9]+)?$', version_candidate, re.IGNORECASE):
            return f"{pretty_name} {version_candidate.upper()}"
    return pretty_name

def sanitize_folder_path(folder_input, default_dir=None):
    if folder_input is None:
        folder_input = ""
    clean_folder = str(folder_input).strip()
    if clean_folder.endswith("*"):
        clean_folder = clean_folder[:-1].rstrip("\\/")
    
    if not clean_folder and default_dir:
        clean_folder = default_dir

    if clean_folder and not os.path.isabs(clean_folder):
        clean_folder = os.path.normpath(os.path.join(folder_paths.base_path, clean_folder))

    return clean_folder

def format_lora_output_name(resolved_path, display_name, output_format="Parsed Name", custom_regex=""):
    if not resolved_path or resolved_path in ["[ NONE ]", "[ RANDOM ]"]:
        return ""

    if output_format == "Filename":
        return os.path.basename(resolved_path)
    elif output_format == "Filename without extension":
        return os.path.splitext(os.path.basename(resolved_path))[0]
    elif output_format == "Relative Path":
        return resolved_path.replace("\\", "/")
    elif output_format == "Full Path":
        full_p = folder_paths.get_full_path("loras", resolved_path)
        return full_p.replace("\\", "/") if full_p else resolved_path
    elif output_format == "Custom Regex" and custom_regex and custom_regex.strip():
        try:
            m = re.search(custom_regex, resolved_path)
            if m:
                return m.group(0)
        except Exception:
            pass
        return os.path.splitext(os.path.basename(resolved_path))[0]
    else: # "Parsed Name" (default)
        clean_name = display_name
        if " - " in display_name:
            clean_name = display_name.split(" - ", 1)[1]
        return re.sub(r'\s+V\d+(\.\d+)?$', '', clean_name, flags=re.IGNORECASE).strip()
