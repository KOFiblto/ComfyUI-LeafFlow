import os
import sys
import unittest
import tempfile
import shutil
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import test_helper

from nodes.auto_watcher import LoadImageFromFolder

class TestAutoWatcher(unittest.TestCase):
    def setUp(self):
        self.node = LoadImageFromFolder()
        self.temp_dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_create_dummy_image(self):
        dummy = self.node.create_dummy_image()
        self.assertEqual(dummy.shape, (1, 64, 64, 3))

    def test_get_filtered_files_by_regex(self):
        img = Image.new("RGB", (64, 64), color="blue")
        f1 = os.path.join(self.temp_dir, "test_01.png")
        f2 = os.path.join(self.temp_dir, "test_02.jpg")
        f3 = os.path.join(self.temp_dir, "other.png")
        f4 = os.path.join(self.temp_dir, "ignored.txt")
        img.save(f1)
        img.save(f2)
        img.save(f3)
        with open(f4, "w") as f:
            f.write("text file")

        files = self.node.get_filtered_files(self.temp_dir, sort_by="name", regex_filter=r"test_\d+")
        self.assertEqual(len(files), 2)
        self.assertIn(f1, files)
        self.assertIn(f2, files)
        self.assertNotIn(f3, files)
        self.assertNotIn(f4, files)

    def test_empty_folder_returns_dummy(self):
        empty_dir = os.path.join(self.temp_dir, "empty")
        os.makedirs(empty_dir, exist_ok=True)
        img_tensor, has_image = self.node.watch(
            folder=empty_dir,
            wait_if_folder_is_empty=False,
            rescan_interval=1,
            sort_by="date_modified",
            regex_filter=".*"
        )
        self.assertFalse(has_image)
        self.assertEqual(img_tensor.shape, (1, 64, 64, 3))

if __name__ == "__main__":
    unittest.main()
