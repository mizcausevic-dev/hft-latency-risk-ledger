import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from hft_latency_ledger import build_pack  # noqa: E402


class PackTest(unittest.TestCase):
    def test_pack_prioritizes_cme_globex(self):
        pack = build_pack("fixtures/hft-latency-sample.json")
        self.assertEqual(pack["findings"][0]["venue"], "CME Globex")
        self.assertGreater(pack["totalExecutionExposureUsd"], 100000)
        self.assertIn("CME Globex", pack["primaryRecommendation"])


if __name__ == "__main__":
    unittest.main()
