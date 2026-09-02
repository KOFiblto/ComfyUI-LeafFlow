import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import test_helper

from nodes.aspect_ratio import TextAspectRatioFinder, PreviewImageSizeAspectRatio

class TestAspectRatioNodes(unittest.TestCase):
    def setUp(self):
        self.finder = TextAspectRatioFinder()
        self.preview_node = PreviewImageSizeAspectRatio()

    def test_find_16_9_standard(self):
        w, h, ratio = self.finder.find_aspect_ratio(
            text="A cinematic landscape, 16:9 aspect ratio, 8k",
            target_mp=1.0,
            multiple_of=8
        )
        self.assertEqual(ratio, "16:9")
        self.assertGreater(w, h)
        self.assertEqual(w % 8, 0)
        self.assertEqual(h % 8, 0)
        mp = (w * h) / 1_000_000.0
        self.assertAlmostEqual(mp, 1.0, delta=0.1)

    def test_find_9_16_portrait(self):
        w, h, ratio = self.finder.find_aspect_ratio(
            text="Portrait photo, 9:16 vertical format",
            target_mp=1.0,
            multiple_of=8
        )
        self.assertEqual(ratio, "9:16")
        self.assertGreater(h, w)
        self.assertEqual(w % 8, 0)
        self.assertEqual(h % 8, 0)

    def test_search_mode_front_vs_back(self):
        text = "Start with 16:9 but override with 1:1 at the end"
        w_front, h_front, r_front = self.finder.find_aspect_ratio(
            text=text,
            search_mode="First match (Front)"
        )
        self.assertEqual(r_front, "16:9")

        w_back, h_back, r_back = self.finder.find_aspect_ratio(
            text=text,
            search_mode="Last match (Back)"
        )
        self.assertEqual(r_back, "1:1")

    def test_fallback_to_default_when_no_ratio_found(self):
        w, h, ratio = self.finder.find_aspect_ratio(
            text="No ratio mentioned here at all",
            default_aspect_ratio="4:3",
            target_mp=1.0
        )
        self.assertEqual(ratio, "4:3")

    def test_edge_case_empty_or_none_text(self):
        w1, h1, r1 = self.finder.find_aspect_ratio(text="", default_aspect_ratio="1:1")
        self.assertEqual(r1, "1:1")

        w2, h2, r2 = self.finder.find_aspect_ratio(text=None, default_aspect_ratio="1:1")
        self.assertEqual(r2, "1:1")

    def test_custom_default_aspect_ratio(self):
        w, h, ratio = self.finder.find_aspect_ratio(
            text="No ratio mentioned",
            default_aspect_ratio="5:4",
            target_mp=1.0
        )
        self.assertEqual(ratio, "5:4")

        w2, h2, ratio2 = self.finder.find_aspect_ratio(
            text="No ratio mentioned",
            default_aspect_ratio="30:1",
            target_mp=1.0
        )
        self.assertEqual(ratio2, "30:1")

    def test_corrupt_default_aspect_ratio_falls_back_to_1_1(self):
        w, h, ratio = self.finder.find_aspect_ratio(
            text="No ratio mentioned",
            default_aspect_ratio="corrupted:invalid_ratio",
            target_mp=1.0
        )
        self.assertEqual(ratio, "1:1")

    def test_custom_allowed_ratios_whitelist(self):
        # When aspect_ratios is configured with "16:9, 9:16", any other ratio in text like "4:3" or "5:7" must be ignored!
        w, h, ratio = self.finder.find_aspect_ratio(
            text="First 4:3 then 16:9 and also 5:7",
            aspect_ratios="16:9, 9:16",
            default_aspect_ratio="1:1"
        )
        self.assertEqual(ratio, "16:9")

        # When prompt only contains unapproved ratios, fall back to default
        w2, h2, ratio2 = self.finder.find_aspect_ratio(
            text="A photo in 5:7 format with 12:34 crop",
            aspect_ratios="16:9, 9:16, 1:1",
            default_aspect_ratio="1:1"
        )
        self.assertEqual(ratio2, "1:1")

    def test_empty_aspect_ratios_accepts_any_ratio(self):
        # When aspect_ratios is empty, accept any valid aspect ratio found in text
        w, h, ratio = self.finder.find_aspect_ratio(
            text="A photo in custom 5:7 format",
            aspect_ratios="",
            default_aspect_ratio="1:1"
        )
        self.assertEqual(ratio, "5:7")

        w2, h2, ratio2 = self.finder.find_aspect_ratio(
            text="Anamorphic 2.39:1 movie frame",
            aspect_ratios="   ",
            default_aspect_ratio="1:1"
        )
        self.assertEqual(ratio2, "2.39:1")

    def test_preview_process(self):
        with patch("nodes.aspect_ratio.PromptServer.instance.send_sync") as mock_send:
            res = self.preview_node.process_preview(
                width=1920,
                height=1080,
                unique_id="test_node"
            )
            self.assertEqual(res, {})
            mock_send.assert_called_once()

if __name__ == "__main__":
    unittest.main()
