"""
Tests for Reward Scoring and Vector Embedding Parity in Python
"""

import json
import os
import unittest
import numpy as np
from main import compute_experiment_reward, generate_embeddings, RewardRequest, EmbedRequest
from scoring import calculate_reward


class TestScoringAndEmbed(unittest.TestCase):

    def test_reward_parity_with_shared_vectors(self):
        vectors_path = os.path.join(os.path.dirname(__file__), "..", "shared", "reward_test_vectors.json")
        with open(vectors_path, "r", encoding="utf-8") as f:
            vectors = json.load(f)

        for item in vectors:
            res = calculate_reward(item["inputs"], item["weights"])
            self.assertAlmostEqual(res["reward"], item["expectedReward"], places=3)
            self.assertEqual(res["excludeFromPolicy"], item["expectedExclude"])

    def test_reward_api_endpoint(self):
        payload = {
            "baselineLatency": [120, 115, 125, 110, 130],
            "candidateLatency": [60, 58, 62, 59, 61],
            "baselineError": 0.0,
            "candidateError": 0.0,
            "baselineMemory": 100,
            "candidateMemory": 105,
            "testsPassed": True,
            "verdict": "accepted"
        }
        req = RewardRequest(**payload)
        data = compute_experiment_reward(req)
        self.assertTrue(data["success"])
        self.assertGreater(data["reward"], 0.20)
        self.assertFalse(data["excludeFromPolicy"])

    def test_embed_api_endpoint(self):
        payload = {
            "texts": [
                "performance | batch | get orders handler | batch queries with $in | success",
                "performance | async | login handler | crypto pbkdf2Sync to async | success"
            ]
        }
        req = EmbedRequest(**payload)
        data = generate_embeddings(req)
        self.assertTrue(data["success"])
        self.assertEqual(len(data["embeddings"]), 2)
        self.assertEqual(len(data["embeddings"][0]), 384)
        # Check unit norm
        norm = np.linalg.norm(data["embeddings"][0])
        self.assertAlmostEqual(norm, 1.0, places=2)


if __name__ == "__main__":
    unittest.main()
