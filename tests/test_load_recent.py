import os
import sys
import unittest
import tempfile
import shutil
from PIL import Image
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import test_helper

from nodes.load_recent import LoadRecentOutputs

class TestLoadRecent(unittest.TestCase):
    def setUp(self):
        self.node = LoadRecentOutputs()
        self.temp_dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_load_single_image_finds_recent_image(self):
        img = Image.new("RGB", (64, 64), color="red")
        f1 = os.path.join(self.temp_dir, "recent_01.png")
        f2 = os.path.join(self.temp_dir, "recent_02.png")
        img.save(f1)
        img.save(f2)

        with patch("nodes.load_recent.folder_paths.get_output_directory", return_value=self.temp_dir):
            out_tensor, = self.node.load_single_image(output_folder=self.temp_dir, amount=2, index=0)
            self.assertEqual(out_tensor.shape[0], 1)
            self.assertEqual(out_tensor.shape[1], 64)
            self.assertEqual(out_tensor.shape[2], 64)

    def test_load_recent_empty_directory_returns_dummy(self):
        with patch("nodes.load_recent.folder_paths.get_output_directory", return_value=self.temp_dir):
            out_tensor, = self.node.load_single_image(output_folder=self.temp_dir, amount=5, index=0)
            self.assertEqual(out_tensor.shape, (1, 512, 512, 3))

if __name__ == "__main__":
    unittest.main()
