import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import test_helper

from nodes.utils import (
    parse_pretty_name,
    parse_pretty_name_with_version,
    sanitize_folder_path,
    format_lora_output_name
)

class TestUtils(unittest.TestCase):
    def test_parse_pretty_name(self):
        name = parse_pretty_name("krea2_ana-de-armas_v1.safetensors")
        self.assertEqual(name, "Ana De Armas")

    def test_parse_pretty_name_special_keywords(self):
        name = parse_pretty_name("tag_cyberpunk-nsfw-v2.safetensors")
        self.assertIn("NSFW", name)
        self.assertIn("V2", name)

    def test_parse_pretty_name_with_version(self):
        name_v = parse_pretty_name_with_version("krea2_ana-de-armas_v1.safetensors")
        self.assertEqual(name_v, "Ana De Armas V1")

    def test_format_lora_output_name_modes(self):
        rel_path = os.path.join("celebrities", "ana_de_armas.safetensors")
        
        parsed = format_lora_output_name(rel_path, "Ana De Armas", "Parsed Name")
        self.assertEqual(parsed, "Ana De Armas")

        filename = format_lora_output_name(rel_path, "Ana De Armas", "Filename")
        self.assertEqual(filename, "ana_de_armas.safetensors")

        no_ext = format_lora_output_name(rel_path, "Ana De Armas", "Filename without extension")
        self.assertEqual(no_ext, "ana_de_armas")

        custom_reg = format_lora_output_name(rel_path, "Ana De Armas", "Custom Regex", custom_regex=r"ana_([a-z]+)")
        self.assertEqual(custom_reg, "ana_de")

    def test_sanitize_folder_path_wildcard_stripping(self):
        clean = sanitize_folder_path("input/watch/*")
        self.assertNotIn("*", clean)

    def test_edge_cases_empty_or_none(self):
        self.assertEqual(parse_pretty_name(""), "")
        self.assertEqual(parse_pretty_name(None), "")
        self.assertEqual(parse_pretty_name("[ NONE ]"), "")
        self.assertEqual(parse_pretty_name("[ RANDOM ]"), "")

if __name__ == "__main__":
    unittest.main()
