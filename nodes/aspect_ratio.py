import re
import math

class AspectRatioFinder:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "aspect_ratios": ("STRING", {
                    "default": "1:1, 2:3, 3:2, 3:4, 4:3, 9:16, 16:9, 21:9",
                    "multiline": False
                }),
                "search_mode": (["First match (Front)", "Last match (Back)"], {
                    "default": "First match (Front)"
                }),
                "target_mp": ("FLOAT", {
                    "default": 1.0,
                    "min": 0.1,
                    "max": 16.0,
                    "step": 0.1,
                    "display": "number"
                }),
                "default_aspect_ratio": ([
                    "1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"
                ], {
                    "default": "1:1"
                }),
                "multiple_of": ("INT", {
                    "default": 8,
                    "min": 8,
                    "max": 128,
                    "step": 4,
                    "advanced": True
                }),
                "min_mp": ("FLOAT", {
                    "default": 0.1,
                    "min": 0.01,
                    "max": 64.0,
                    "step": 0.1,
                    "display": "number",
                    "advanced": True
                }),
                "max_mp": ("FLOAT", {
                    "default": 16.0,
                    "min": 0.1,
                    "max": 64.0,
                    "step": 0.1,
                    "display": "number",
                    "advanced": True
                }),
            },
            "optional": {
                "text": ("STRING", {"forceInput": True}),
            }
        }

    RETURN_TYPES = ("INT", "INT", "STRING")
    RETURN_NAMES = ("width", "height", "aspect_ratio")
    FUNCTION = "find_aspect_ratio"
    CATEGORY = "🍃 FlowControl/Utils"
    DESCRIPTION = "Searches text for aspect ratios (e.g. 16:9), syntax checks them, and calculates width & height for target megapixels."

    def find_aspect_ratio(
        self,
        aspect_ratios="1:1, 2:3, 3:2, 3:4, 4:3, 9:16, 16:9, 21:9",
        search_mode="First match (Front)",
        target_mp=1.0,
        default_aspect_ratio="1:1",
        multiple_of=8,
        min_mp=0.1,
        max_mp=16.0,
        text=None
    ):
        text_str = str(text) if text is not None else ""

        # Clamp target_mp between min_mp and max_mp
        min_v = float(min_mp)
        max_v = max(min_v, float(max_mp))
        effective_mp = max(min_v, min(max_v, float(target_mp)))

        # 1. Parse and syntax-check user-provided aspect ratio string list
        valid_ratios = []
        raw_items = [item.strip() for item in str(aspect_ratios or "").split(",") if item.strip()]
        
        for item in raw_items:
            match = re.match(r'^(\d+(?:\.\d+)?)\s*[:xX/]\s*(\d+(?:\.\d+)?)$', item)
            if match:
                w_val = float(match.group(1))
                h_val = float(match.group(2))
                if w_val > 0 and h_val > 0:
                    w_str = str(int(w_val)) if w_val.is_integer() else str(w_val)
                    h_str = str(int(h_val)) if h_val.is_integer() else str(h_val)
                    ratio_fmt = f"{w_str}:{h_str}"
                    if ratio_fmt not in valid_ratios:
                        valid_ratios.append(ratio_fmt)

        if not valid_ratios:
            valid_ratios = ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"]

        # 2. Search for occurrences of any valid aspect ratio in text
        found_ratio = None
        matches = []
        
        if text_str:
            for ratio in valid_ratios:
                w_p, h_p = ratio.split(":")
                pattern = r'(?<![\d.])' + re.escape(w_p) + r'\s*[:xX/]\s*' + re.escape(h_p) + r'(?![\d.])'
                for m in re.finditer(pattern, text_str):
                    matches.append((m.start(), ratio))

        if matches:
            matches.sort(key=lambda x: x[0])
            if search_mode == "Last match (Back)":
                found_ratio = matches[-1][1]
            else:
                found_ratio = matches[0][1]
        else:
            found_ratio = default_aspect_ratio

        # 3. Calculate width & height
        w_part, h_part = map(float, found_ratio.split(":"))
        r = w_part / h_part

        # 1 Megapixel = 1024 * 1024 = 1,048,576 pixels (standard ComfyUI/SD/SDXL resolution math)
        total_pixels = effective_mp * 1024.0 * 1024.0
        
        raw_h = math.sqrt(total_pixels / r)
        raw_w = raw_h * r

        m = max(4, int(multiple_of))
        width = max(m, int(round(raw_w / m)) * m)
        height = max(m, int(round(raw_h / m)) * m)

        return (width, height, found_ratio)
