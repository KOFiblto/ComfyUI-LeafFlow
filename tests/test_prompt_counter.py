import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import test_helper

from nodes.prompt_counter import PromptCounter

class TestPromptCounter(unittest.TestCase):
    def setUp(self):
        self.node = PromptCounter()

    def test_empty_and_whitespace(self):
        txt, count = self.node.count_prompts("")
        self.assertEqual(txt, "")
        self.assertEqual(count, 0)

        txt, count = self.node.count_prompts("   \n\n  \t ")
        self.assertEqual(txt, "   \n\n  \t ")
        self.assertEqual(count, 0)

    def test_single_prompt(self):
        sample = "A magnificent tree standing on a hill, photorealistic 8k"
        txt, count = self.node.count_prompts(sample)
        self.assertEqual(txt, sample)
        self.assertEqual(count, 1)

    def test_newline_mode(self):
        sample = "Prompt 1\nPrompt 2\nPrompt 3\n\nPrompt 4"
        txt, count = self.node.count_prompts(sample, separator="Newline")
        self.assertEqual(txt, sample)
        self.assertEqual(count, 4)

    def test_empty_line_mode(self):
        sample = "Line 1 of prompt 1\nLine 2 of prompt 1\n\nPrompt 2\n\nPrompt 3"
        txt, count = self.node.count_prompts(sample, separator=">1 Empty Line")
        self.assertEqual(txt, sample)
        self.assertEqual(count, 3)

    def test_gt_two_empty_lines_mode(self):
        sample = "Prompt 1\n\nStill prompt 1\n\n\nPrompt 2"
        txt, count = self.node.count_prompts(sample, separator=">2 Empty Lines")
        self.assertEqual(txt, sample)
        self.assertEqual(count, 2)

    def test_custom_regex(self):
        sample = "Prompt A\n---\nPrompt B\n---\nPrompt C"
        txt, count = self.node.count_prompts(sample, separator="Custom Regex", custom_regex=r"\n---\n")
        self.assertEqual(txt, sample)
        self.assertEqual(count, 3)

    def test_custom_regex_capturing_group(self):
        sample = "Prompt A\n===\nPrompt B\n===\nPrompt C"
        txt, count = self.node.count_prompts(sample, separator="Custom Regex", custom_regex=r"(\n===\n)")
        self.assertEqual(txt, sample)
        self.assertEqual(count, 3)

    def test_custom_regex_invalid_fallback(self):
        sample = "Prompt 1\n\nPrompt 2"
        txt, count = self.node.count_prompts(sample, separator="Custom Regex", custom_regex=r"[invalid-regex")
        self.assertEqual(txt, sample)
        self.assertEqual(count, 2)

if __name__ == "__main__":
    unittest.main()
