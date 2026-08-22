import os
import sys
import unittest
import tempfile
import shutil
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import test_helper

from nodes.favorite_prompts import FavoritePromptLoader, SaveFavoritePreview

class TestFavoritePrompts(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.loader = FavoritePromptLoader()
        self.saver = SaveFavoritePreview()

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_save_favorite_preview_instantiation(self):
        self.assertIsNotNone(self.saver)

    def test_favorite_prompt_loader_instantiation(self):
        self.assertIsNotNone(self.loader)

    def test_favorite_prompt_loader_empty_folder(self):
        with patch("nodes.image_loader.sanitize_folder_path", return_value=self.temp_dir), \
             patch("nodes.image_loader.folder_paths.base_path", self.temp_dir):
            img, prompt, mask, w, h = self.loader.load_favorite(
                _favorites_folder=self.temp_dir,
                _selected_image=""
            )
            self.assertEqual(prompt, "")
            self.assertEqual(w, 0)
            self.assertEqual(h, 0)

if __name__ == "__main__":
    unittest.main()
