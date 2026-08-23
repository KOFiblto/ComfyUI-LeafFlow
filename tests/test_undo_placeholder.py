import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import test_helper

from nodes.undo_placeholder import BackToPlaceholder

class TestUndoPlaceholder(unittest.TestCase):
    def setUp(self):
        self.node = BackToPlaceholder()

    @patch("nodes.undo_placeholder.get_pretty_names_for_folder")
    def test_undo_placeholder_substitution(self, mock_get_names):
        mock_get_names.return_value = ["Ana De Armas", "Emma Watson"]

        result = self.node.undo_placeholder(
            text="A portrait of Ana De Armas smiling",
            lora_folder="celebrities",
            placeholder="%celeb%"
        )
        self.assertEqual(result, ("A portrait of %celeb% smiling",))

    def test_empty_text_or_folder_edge_cases(self):
        res1 = self.node.undo_placeholder(text="", lora_folder="celebrities")
        self.assertEqual(res1, ("",))

        res2 = self.node.undo_placeholder(text="Some text", lora_folder="")
        self.assertEqual(res2, ("Some text",))

    @patch("folder_paths.get_filename_list")
    @patch("folder_paths.get_full_path")
    def test_get_pretty_names_for_folder_empty_and_filter(self, mock_get_full, mock_get_list):
        from nodes.undo_placeholder import get_pretty_names_for_folder
        mock_get_list.return_value = ["actors/v1_EmmaWatson.safetensors", "styles/v1_AnimeStyle.safetensors"]
        mock_get_full.side_effect = lambda cat, name: f"/models/loras/{name}"

        # When folder is empty, all loras should be matched
        all_names = get_pretty_names_for_folder("")
        self.assertTrue(len(all_names) >= 1)

if __name__ == "__main__":
    unittest.main()
