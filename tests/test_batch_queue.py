import os
import sys
import unittest
import json
import tempfile
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import test_helper

from nodes.queue_control import PersistentQueueManager

# 36 Colors matching web/batch_queue.js
BATCH_COLORS = [
    "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4",
    "#ef4444", "#14b8a6", "#6366f1", "#f97316", "#84cc16", "#d946ef",
    "#0ea5e9", "#a855f7", "#e11d48", "#22c55e", "#eab308", "#64748b",
    "#2dd4bf", "#fb7185", "#38bdf8", "#c084fc", "#f43f5e", "#4ade80",
    "#fbbf24", "#818cf8", "#fb923c", "#a3e635", "#f472b6", "#22d3ee",
    "#e879f9", "#a7f3d0", "#fde047", "#fda4af", "#93c5fd", "#c4b5fd"
]

def calculate_segment_types(ordered_pids, registry):
    """
    Python mirror of the segment calculation logic in web/batch_queue.js
    """
    segments = {}
    for pid in ordered_pids:
        info = registry.get(pid)
        if not info or not info.get("batchId"):
            segments[pid] = None
            continue

        batch_id = info["batchId"]
        occurrences = [p for p in ordered_pids if registry.get(p, {}).get("batchId") == batch_id]

        if len(occurrences) <= 1:
            batch_count = info.get("batchCount", 1)
            if batch_count == 1:
                segments[pid] = "single"
            else:
                item_index = info.get("itemIndex", 0)
                if item_index == 0:
                    segments[pid] = "first"
                elif item_index == (batch_count - 1):
                    segments[pid] = "last"
                else:
                    segments[pid] = "middle"
            continue

        first_pid = occurrences[0]
        last_pid = occurrences[-1]

        if pid == first_pid:
            segments[pid] = "first"
        elif pid == last_pid:
            segments[pid] = "last"
        else:
            segments[pid] = "middle"

    return segments


class TestBatchQueueLogic(unittest.TestCase):
    def test_36_color_cycling(self):
        self.assertEqual(len(BATCH_COLORS), 36)
        
        # Batch 1 -> color index 0
        self.assertEqual((1 - 1) % 36, 0)
        self.assertEqual(BATCH_COLORS[(1 - 1) % 36], "#10b981")

        # Batch 36 -> color index 35
        self.assertEqual((36 - 1) % 36, 35)
        self.assertEqual(BATCH_COLORS[(36 - 1) % 36], "#c4b5fd")

        # Batch 37 -> cycles back to color index 0
        self.assertEqual((37 - 1) % 36, 0)
        self.assertEqual(BATCH_COLORS[(37 - 1) % 36], "#10b981")

        # Batch 73 -> cycles back to color index 0
        self.assertEqual((73 - 1) % 36, 0)

    def test_single_item_batch(self):
        registry = {
            "p1": {"batchId": "b1", "batchCount": 1, "itemIndex": 0}
        }
        segments = calculate_segment_types(["p1"], registry)
        self.assertEqual(segments["p1"], "single")

    def test_intact_contiguous_batch(self):
        registry = {
            "p1": {"batchId": "b1", "batchCount": 3, "itemIndex": 0},
            "p2": {"batchId": "b1", "batchCount": 3, "itemIndex": 1},
            "p3": {"batchId": "b1", "batchCount": 3, "itemIndex": 2},
        }
        segments = calculate_segment_types(["p1", "p2", "p3"], registry)
        self.assertEqual(segments["p1"], "first")
        self.assertEqual(segments["p2"], "middle")
        self.assertEqual(segments["p3"], "last")

    def test_interrupted_batch_inserted_in_between(self):
        # Batch A was [pA1, pA2], but prompt B was inserted in-between: [pA1, pB, pA2]
        registry = {
            "pA1": {"batchId": "bA", "batchCount": 2, "itemIndex": 0},
            "pB":  {"batchId": "bB", "batchCount": 1, "itemIndex": 0},
            "pA2": {"batchId": "bA", "batchCount": 2, "itemIndex": 1},
        }
        segments = calculate_segment_types(["pA1", "pB", "pA2"], registry)
        # pA1 is the start of Batch A (curves top, open bottom)
        self.assertEqual(segments["pA1"], "first")
        # pB is a standalone single item (curves top and bottom)
        self.assertEqual(segments["pB"], "single")
        # pA2 is the end of Batch A (open top, curves bottom)
        self.assertEqual(segments["pA2"], "last")

    def test_multiple_interruptions(self):
        # [pA1, pB, pA2, pC, pA3]
        registry = {
            "pA1": {"batchId": "bA", "batchCount": 3, "itemIndex": 0},
            "pB":  {"batchId": "bB", "batchCount": 1, "itemIndex": 0},
            "pA2": {"batchId": "bA", "batchCount": 3, "itemIndex": 1},
            "pC":  {"batchId": "bC", "batchCount": 1, "itemIndex": 0},
            "pA3": {"batchId": "bA", "batchCount": 3, "itemIndex": 2},
        }
        segments = calculate_segment_types(["pA1", "pB", "pA2", "pC", "pA3"], registry)
        self.assertEqual(segments["pA1"], "first")
        self.assertEqual(segments["pB"], "single")
        self.assertEqual(segments["pA2"], "middle")
        self.assertEqual(segments["pC"], "single")
        self.assertEqual(segments["pA3"], "last")


class TestPersistentQueueBatchMetadata(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_file = os.path.join(self.temp_dir.name, "test_persistent_queue.json")
        self.patcher = patch("nodes.queue_control.PERSISTENT_FILE", self.temp_file)
        self.patcher.start()
        self.enabled_patcher = patch("nodes.queue_control.is_persistent_queue_enabled", return_value=True)
        self.enabled_patcher.start()

    def tearDown(self):
        self.enabled_patcher.stop()
        self.patcher.stop()
        self.temp_dir.cleanup()

    def test_save_and_restore_batch_info(self):
        mgr = PersistentQueueManager()
        
        # Set batch info for a prompt
        batch_data = {
            "batchId": "b_12345",
            "batchNumber": 5,
            "batchCount": 3,
            "itemIndex": 0,
            "color": "#10b981",
            "colorIndex": 4
        }
        mgr.set_batch_info("prompt_99", batch_data)
        self.assertIn("prompt_99", mgr.batch_meta)

        # Add item to persistent queue
        item_tuple = (0, "prompt_99", {"prompt": {}}, {}, {})
        mgr.add_item(item_tuple)

        # Verify batch_info is attached inside persistent_items
        saved_entry = [x for x in mgr.persistent_items if x["prompt_id"] == "prompt_99"][0]
        self.assertEqual(saved_entry.get("batch_info"), batch_data)

        # Simulate reload from disk
        new_mgr = PersistentQueueManager()
        self.assertIn("prompt_99", new_mgr.batch_meta)
        self.assertEqual(new_mgr.batch_meta["prompt_99"]["batchId"], "b_12345")

    def test_remove_item_cleans_batch_meta(self):
        mgr = PersistentQueueManager()
        mgr.set_batch_info("p1", {"batchId": "b1"})
        mgr.add_item((0, "p1", {}, {}, {}))
        self.assertIn("p1", mgr.batch_meta)

        mgr.remove_item("p1")
        self.assertNotIn("p1", mgr.batch_meta)
        self.assertEqual(len(mgr.persistent_items), 0)

    def test_wipe_all_cleans_batch_meta(self):
        mgr = PersistentQueueManager()
        mgr.set_batch_info("p1", {"batchId": "b1"})
        mgr.set_batch_info("p2", {"batchId": "b2"})
        mgr.wipe_all()
        self.assertEqual(len(mgr.batch_meta), 0)
        self.assertEqual(len(mgr.persistent_items), 0)


if __name__ == "__main__":
    unittest.main()
