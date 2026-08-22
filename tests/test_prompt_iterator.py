import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import test_helper

from nodes.prompt_iterator import PromptQueueIterator, parse_prompt_blocks

class TestPromptQueueIterator(unittest.TestCase):
    def setUp(self):
        self.node = PromptQueueIterator()

    def test_parse_prompt_blocks_newline(self):
        text = "Prompt 1\nPrompt 2\n\nPrompt 3"
        blocks = parse_prompt_blocks(text, separator="Newline")
        self.assertEqual(blocks, ["Prompt 1", "Prompt 2", "Prompt 3"])

    def test_parse_prompt_blocks_empty_lines(self):
        text = "Block 1 line 1\nBlock 1 line 2\n\nBlock 2"
        blocks = parse_prompt_blocks(text, separator=">1 Empty Line")
        self.assertEqual(len(blocks), 2)
        self.assertEqual(blocks[0], "Block 1 line 1\nBlock 1 line 2")
        self.assertEqual(blocks[1], "Block 2")

    def test_process_queue_pop_top_and_delete(self):
        text = "Prompt 1\nPrompt 2\nPrompt 3"
        state_dict = {}
        with patch("nodes.prompt_iterator.load_state", return_value=state_dict), \
             patch("nodes.prompt_iterator.save_state"), \
             patch("nodes.prompt_iterator.PromptServer.instance.send_sync"):
            
            prompt, remaining_text, remaining_count = self.node.process_queue(
                pop_mode="Pop Top & Delete",
                separator="Newline",
                text=text,
                unique_id="fresh_test_node"
            )
            self.assertEqual(prompt, "Prompt 1")
            self.assertEqual(remaining_count, 2)
            self.assertIn("Prompt 2", remaining_text)

    def test_empty_text_edge_case(self):
        prompt, remaining_text, remaining_count = self.node.process_queue(
            text="",
            unique_id="empty_node"
        )
        self.assertEqual(prompt, "")
        self.assertEqual(remaining_text, "")
        self.assertEqual(remaining_count, 0)

    def test_none_text_edge_case(self):
        prompt, remaining_text, remaining_count = self.node.process_queue(
            text=None,
            unique_id="none_node"
        )
        self.assertEqual(prompt, "")
        self.assertEqual(remaining_text, "")
        self.assertEqual(remaining_count, 0)

if __name__ == "__main__":
    unittest.main()
