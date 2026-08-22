import os
import re
import folder_paths

def get_leafflow_user_dir():
    """
    Returns the centralized user data directory: ComfyUI/user/default/LeafFlow/
    """
    base_user = None
    try:
        if hasattr(folder_paths, "get_user_directory"):
            base_user = folder_paths.get_user_directory()
    except Exception:
        base_user = None

    if not base_user:
        # Fallback to ComfyUI/user/default
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        base_user = os.path.join(root_dir, "user", "default")

    leafflow_dir = os.path.join(base_user, "LeafFlow")
    os.makedirs(leafflow_dir, exist_ok=True)
    return leafflow_dir

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
    
    # Strip any trailing wildcards (e.g. "krea2\*" -> "krea2", "krea2/*" -> "krea2")
    clean_folder = re.sub(r'[\*\?]+$', '', clean_folder).rstrip("\\/")
    
    if not clean_folder and default_dir:
        clean_folder = default_dir

    if not clean_folder:
        return ""

    # 1. If absolute path, verify directly with case-insensitive check
    if os.path.isabs(clean_folder):
        norm_path = os.path.normpath(clean_folder)
        if os.path.exists(norm_path):
            return norm_path
        parent_dir = os.path.dirname(norm_path)
        base_name = os.path.basename(norm_path)
        if os.path.exists(parent_dir):
            try:
                for entry in os.listdir(parent_dir):
                    if entry.lower() == base_name.lower():
                        return os.path.join(parent_dir, entry)
            except Exception:
                pass
        return norm_path

    # 2. If relative path, check output directory, input directory, then base path
    candidates = []
    try:
        output_dir = folder_paths.get_output_directory()
        if output_dir:
            candidates.append(os.path.normpath(os.path.join(output_dir, clean_folder)))
    except Exception:
        pass

    try:
        input_dir = folder_paths.get_input_directory()
        if input_dir:
            candidates.append(os.path.normpath(os.path.join(input_dir, clean_folder)))
    except Exception:
        pass

    try:
        if folder_paths.base_path:
            candidates.append(os.path.normpath(os.path.join(folder_paths.base_path, clean_folder)))
    except Exception:
        pass

    for cand in candidates:
        if os.path.exists(cand):
            return cand

    for cand in candidates:
        parent_dir = os.path.dirname(cand)
        base_name = os.path.basename(cand)
        if os.path.exists(parent_dir):
            try:
                for entry in os.listdir(parent_dir):
                    if entry.lower() == base_name.lower():
                        return os.path.join(parent_dir, entry)
            except Exception:
                pass

    return candidates[0] if candidates else os.path.normpath(os.path.join(folder_paths.base_path, clean_folder))

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
