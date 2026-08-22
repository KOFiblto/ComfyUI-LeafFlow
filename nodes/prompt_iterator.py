import os
import re
import json
import random
import time
import hashlib
from aiohttp import web
from server import PromptServer
import folder_paths
from .utils import get_leafflow_user_dir

CURRENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
USER_DIR = get_leafflow_user_dir()
STATE_FILE = os.path.join(USER_DIR, "prompt_iterator_state.json")
ENV_FILE = os.path.join(USER_DIR, ".env")

def get_env_setting(key, default_val):
    if os.path.exists(ENV_FILE):
        try:
            with open(ENV_FILE, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip().startswith(f"{key}="):
                        return line.strip().split("=", 1)[1].strip()
        except Exception:
            pass
    return default_val

def is_clear_prompt_iterator_on_launch():
    val = get_env_setting("CLEAR_PROMPT_ITERATOR_ON_LAUNCH", "false").lower()
    return val in ["true", "1", "yes"]

def ensure_user_dir():
    os.makedirs(USER_DIR, exist_ok=True)

def load_state():
    ensure_user_dir()
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_state(state):
    ensure_user_dir()
    try:
        # Auto-prune abandoned state keys if count exceeds 50 entries
        if len(state) > 50:
            excess_keys = list(state.keys())[:-50]
            for k in excess_keys:
                del state[k]
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"[LeafFlow] 🍃 Error saving prompt iterator state: {e}")

def clear_state():
    ensure_user_dir()
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump({}, f)
        print("[LeafFlow] 🍃 Prompt iterator state cleared.")
        return True
    except Exception as e:
        print(f"[LeafFlow] 🍃 Error clearing prompt iterator state: {e}")
        return False

# Clear state on startup if privacy setting enabled
if is_clear_prompt_iterator_on_launch():
    clear_state()

# Register clear endpoint
try:
    routes = PromptServer.instance.routes
    @routes.post("/leafflow/prompt_iterator/clear")
    @routes.post("/flow_control/prompt_iterator/clear")
    async def clear_prompt_iterator_endpoint(request):
        success = clear_state()
        return web.json_response({"status": "ok" if success else "error"})
except Exception:
    pass

def parse_prompt_blocks(text_str, separator):
    if not text_str or not text_str.strip():
        return []
    
    clean_text = text_str.replace('\r\n', '\n').replace('\r', '\n')

    if separator == "Newline":
        return [line.strip() for line in clean_text.split('\n') if line.strip()]
    elif separator == ">2 Empty Lines":
        raw_blocks = re.split(r'(?:\n\s*){3,}', clean_text)
        return [b.strip() for b in raw_blocks if b.strip()]
    else: # ">1 Empty Line"
        raw_blocks = re.split(r'\n\s*\n+', clean_text)
        return [b.strip() for b in raw_blocks if b.strip()]

class PromptQueueIterator:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "pop_mode": ([
                    "Pop Top & Delete",
                    "Cycle / Loop",
                    "Random (Delete)",
                    "Random (Keep)"
                ], {"default": "Pop Top & Delete"}),
                "separator": ([
                    ">1 Empty Line",
                    "Newline",
                    ">2 Empty Lines"
                ], {"default": ">1 Empty Line"}),
                "text": ("STRING", {"default": "", "multiline": True}),
            },
            "optional": {
                "prompt": ("STRING", {"forceInput": True}),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
            }
        }

    RETURN_TYPES = ("STRING", "STRING", "INT")
    RETURN_NAMES = ("prompt", "remaining_text", "remaining_count")
    FUNCTION = "process_queue"
    CATEGORY = "🍃 LeafFlow/Utils"
    DESCRIPTION = "Parses multiline prompt text blocks, popping/selecting prompts per batch queue iteration with live UI text updates."

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        return time.time()

    def process_queue(
        self,
        pop_mode="Pop Top & Delete",
        separator=">1 Empty Line",
        text="",
        prompt=None,
        prompt_text=None,
        unique_id="default",
        **kwargs
    ):
        raw_input = text if text else (prompt if prompt is not None else prompt_text)
        text_str = str(raw_input) if raw_input is not None else ""
        if not text_str.strip():
            return ("", "", 0)

        original_blocks = parse_prompt_blocks(text_str, separator)
        if not original_blocks:
            return ("", "", 0)

        text_hash = hashlib.sha256(text_str.encode('utf-8')).hexdigest()[:16]
        state_key = f"node_{unique_id}_{text_hash}_{separator}_{pop_mode}"
        
        state = load_state()
        cached_list = state.get(state_key)

        if cached_list is None or len(cached_list) == 0:
            prompt_blocks = list(original_blocks)
        else:
            prompt_blocks = list(cached_list)

        selected_prompt = ""
        
        if pop_mode == "Pop Top & Delete":
            selected_prompt = prompt_blocks.pop(0)
            if len(prompt_blocks) > 0:
                state[state_key] = prompt_blocks
            else:
                if state_key in state:
                    del state[state_key]
            save_state(state)
        elif pop_mode == "Cycle / Loop":
            selected_prompt = prompt_blocks.pop(0)
            prompt_blocks.append(selected_prompt)
            state[state_key] = prompt_blocks
            save_state(state)
        elif pop_mode == "Random (Delete)":
            idx = random.randint(0, len(prompt_blocks) - 1)
            selected_prompt = prompt_blocks.pop(idx)
            if len(prompt_blocks) > 0:
                state[state_key] = prompt_blocks
            else:
                if state_key in state:
                    del state[state_key]
            save_state(state)
        else: # "Random (Keep)"
            idx = random.randint(0, len(prompt_blocks) - 1)
            selected_prompt = prompt_blocks[idx]

        remaining_count = len(prompt_blocks)
        join_delim = "\n" if separator == "Newline" else ("\n\n\n" if separator == ">2 Empty Lines" else "\n\n")
        remaining_text = join_delim.join(prompt_blocks) if prompt_blocks else ""

        try:
            PromptServer.instance.send_sync("leafflow_update_prompt_iterator", {
                "node_id": str(unique_id),
                "remaining_text": remaining_text
            })
        except Exception:
            pass

        return (selected_prompt, remaining_text, remaining_count)
