import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import test_helper

from nodes.image_loader import trace_positive_prompt_from_graph, parse_positive_from_parameters

class TestPromptExtraction(unittest.TestCase):
    def test_standard_ksampler_graph(self):
        graph = {
            "3": {
                "class_type": "KSampler",
                "inputs": {
                    "positive": ["6", 0],
                    "negative": ["7", 0],
                    "model": ["4", 0]
                }
            },
            "6": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "text": "a majestic lion in the savanna at golden hour"
                }
            },
            "7": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "text": "ugly, blurry, low quality"
                }
            }
        }
        res = trace_positive_prompt_from_graph(graph)
        self.assertEqual(res, "a majestic lion in the savanna at golden hour")

    def test_flux_guidance_graph(self):
        graph = {
            "1": {
                "class_type": "KSamplerSelect",
                "inputs": {}
            },
            "2": {
                "class_type": "SamplerCustomAdvanced",
                "inputs": {
                    "guider": ["3", 0]
                }
            },
            "3": {
                "class_type": "BasicGuider",
                "inputs": {
                    "conditioning": ["4", 0]
                }
            },
            "4": {
                "class_type": "FluxGuidance",
                "inputs": {
                    "guidance": 3.5,
                    "conditioning": ["5", 0]
                }
            },
            "5": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "text": "a cyberpunk futuristic street in Tokyo, neon reflections"
                }
            }
        }
        res = trace_positive_prompt_from_graph(graph)
        self.assertEqual(res, "a cyberpunk futuristic street in Tokyo, neon reflections")

    def test_sdxl_text_g_and_text_l(self):
        graph = {
            "10": {
                "class_type": "KSampler",
                "inputs": {
                    "positive": ["20", 0],
                    "negative": ["21", 0]
                }
            },
            "20": {
                "class_type": "CLIPTextEncodeSDXL",
                "inputs": {
                    "text_g": "an astronaut riding a horse",
                    "text_l": "photorealistic, 8k resolution"
                }
            },
            "21": {
                "class_type": "CLIPTextEncodeSDXL",
                "inputs": {
                    "text_g": "blurry",
                    "text_l": "cartoon"
                }
            }
        }
        res = trace_positive_prompt_from_graph(graph)
        self.assertIn("an astronaut riding a horse", res)
        self.assertIn("photorealistic, 8k resolution", res)
        self.assertNotIn("blurry", res)

    def test_conditioning_combine(self):
        graph = {
            "1": {
                "class_type": "KSampler",
                "inputs": {
                    "positive": ["2", 0],
                    "negative": ["9", 0]
                }
            },
            "2": {
                "class_type": "ConditioningCombine",
                "inputs": {
                    "conditioning_1": ["3", 0],
                    "conditioning_2": ["4", 0]
                }
            },
            "3": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": "part 1 of positive prompt"}
            },
            "4": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": "part 2 of positive prompt"}
            }
        }
        res = trace_positive_prompt_from_graph(graph)
        self.assertIn("part 1 of positive prompt", res)
        self.assertIn("part 2 of positive prompt", res)

    def test_primitive_string_link(self):
        graph = {
            "1": {
                "class_type": "KSampler",
                "inputs": {
                    "positive": ["2", 0]
                }
            },
            "2": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "text": ["3", 0]
                }
            },
            "3": {
                "class_type": "PrimitiveString",
                "inputs": {
                    "value": "string from primitive node"
                }
            }
        }
        res = trace_positive_prompt_from_graph(graph)
        self.assertEqual(res, "string from primitive node")

    def test_a1111_parameters_parsing(self):
        param_str = """A portrait of an ancient wizard with a glowing crystal staff
Negative prompt: ugly, deformed, bad anatomy
Steps: 30, Sampler: DPM++ 2M Karras, CFG scale: 7, Seed: 12345, Size: 512x768"""
        res = parse_positive_from_parameters(param_str)
        self.assertEqual(res, "A portrait of an ancient wizard with a glowing crystal staff")

if __name__ == "__main__":
    unittest.main()
