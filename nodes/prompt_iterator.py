import os
import re
import json
import random
import time
import hashlib
import folder_paths

CURRENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE_FILE = os.path.join(CURRENT_DIR, "user", "prompt_iterator_state.json")

def ensure_user_dir():
    user_dir = os.path.dirname(STATE_FILE)
    if not os.path.exists(user_dir):
        os.makedirs(user_dir, exist_ok=True)

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
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"[FlowControl] 🍃 Error saving prompt iterator state: {e}")

def parse_prompt_blocks(text_str, separator):
    if not text_str or not text_str.strip():
        return []
    
    clean_text = text_str.replace('\r\n', '\n').replace('\r', '\n')

    if separator == "Newline":
        return [line.strip() for line in clean_text.split('\n') if line.strip()]
    elif separator == ">2 Empty Lines":
        # Splits on 2 or more empty lines (3 or more newlines)
        raw_blocks = re.split(r'(?:\n\s*){3,}', clean_text)
        return [b.strip() for b in raw_blocks if b.strip()]
    else: # ">1 Empty Line" (default: splits on 1 or more empty lines)
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
    CATEGORY = "🍃 FlowControl/Utils"
    DESCRIPTION = "Parses multiline prompt text blocks, popping/selecting prompts per batch queue iteration with persistent queue state."

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        # Force execution on every batch iteration
        return time.time()

    def process_queue(
        self,
        pop_mode="Pop Top & Delete",
        separator=">1 Empty Line",
        prompt=None,
        unique_id="default"
    ):
        text_str = str(prompt) if prompt is not None else ""
        if not text_str.strip():
            return ("", "", 0)

        # Scope state key by node instance ID and prompt text hash
        text_hash = hashlib.sha256(text_str.encode('utf-8')).hexdigest()[:16]
        state_key = f"node_{unique_id}_{text_hash}_{separator}_{pop_mode}"
        
        state = load_state()
        cached_list = state.get(state_key)

        if cached_list is None:
            prompt_blocks = parse_prompt_blocks(text_str, separator)
        else:
            prompt_blocks = list(cached_list)

        if not prompt_blocks:
            return ("", "", 0)

        selected_prompt = ""
        
        if pop_mode == "Pop Top & Delete":
            selected_prompt = prompt_blocks.pop(0)
            state[state_key] = prompt_blocks
            save_state(state)
        elif pop_mode == "Cycle / Loop":
            selected_prompt = prompt_blocks.pop(0)
            prompt_blocks.append(selected_prompt)
            state[state_key] = prompt_blocks
            save_state(state)
        elif pop_mode == "Random (Delete)":
            idx = random.randint(0, len(prompt_blocks) - 1)
            selected_prompt = prompt_blocks.pop(idx)
            state[state_key] = prompt_blocks
            save_state(state)
        else: # "Random (Keep)"
            idx = random.randint(0, len(prompt_blocks) - 1)
            selected_prompt = prompt_blocks[idx]

        # Re-format remaining text based on mode and separator
        remaining_count = len(prompt_blocks)
        join_delim = "\n" if separator == "Newline" else ("\n\n\n" if separator == ">2 Empty Lines" else "\n\n")
        remaining_text = join_delim.join(prompt_blocks) if prompt_blocks else ""

        return (selected_prompt, remaining_text, remaining_count)
