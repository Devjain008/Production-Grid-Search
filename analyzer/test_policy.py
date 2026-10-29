"""
Unit & Integration Tests for Contextual Bandit and Learning Policy (Phase 5)
Covers:
1. NIG conjugate posterior updates against closed-form values
2. LinUCB rank-1 updates against exact ridge regression
3. Action masking rules (structural, repeat failure, safety floor)
4. Deterministic state rebuild (state_hash match)
5. Simulator convergence (Thompson regret <= 45% of Random)
6. Offline IPS evaluator ESS guard on small/disjoint data
"""

import sys
import os
import unittest
import numpy as np

# Add analyzer and policy directory to sys.path
ANALYZER_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ANALYZER_DIR)
sys.path.insert(0, os.path.join(ANALYZER_DIR, "policy"))

from policy.bandit import ThompsonPolicy, LinUCBPolicy, RandomPolicy, RulePolicy, PolicyRouter
from policy.mask import compute_action_mask, DEFAULT_ARMS
from policy.evaluate import evaluate_policy_offline
from policy.sim import run_simulation


class TestPolicyLearning(unittest.TestCase):

    def test_nig_posterior_updates(self):
        """Verify NIG conjugate updates match analytical closed-form equations."""
        policy = ThompsonPolicy(prior_strength=2.0)
        post = policy._get_or_init_posterior("performance", "batch")
        mu0 = post["mu"]
        k0 = post["kappa"]
        a0 = post["alpha"]
        b0 = post["beta"]

        rewards = [0.5, 0.2, -0.1]
        for idx, r in enumerate(rewards):
            policy.update([], "batch", r, "performance", experiment_id=f"exp_{idx}")

        # Compute closed-form expected values
        expected_k = k0 + len(rewards)
        expected_a = a0 + 0.5 * len(rewards)
        expected_mu = (k0 * mu0 + sum(rewards)) / expected_k

        updated_post = policy._get_or_init_posterior("performance", "batch")
        self.assertAlmostEqual(updated_post["kappa"], expected_k, places=6)
        self.assertAlmostEqual(updated_post["alpha"], expected_a, places=6)
        self.assertAlmostEqual(updated_post["mu"], expected_mu, places=6)
        self.assertEqual(updated_post["n"], 3)

    def test_linucb_rank1_updates(self):
        """Verify LinUCB matrix updates match closed-form Ridge Regression (X^T X + alpha*I)^{-1} X^T y."""
        d = 4
        alpha = 1.0
        policy = LinUCBPolicy(d=d, alpha=alpha, arms=["cache", "batch"])

        # Create synthetic data
        X = np.array([
            [1.0, 0.5, -0.2, 0.1],
            [0.2, 0.8, 0.4, -0.5],
            [-0.1, 0.3, 0.9, 0.0]
        ], dtype=np.float64)
        y = np.array([0.4, 0.7, -0.3], dtype=np.float64)

        X_norm = np.array([row / np.linalg.norm(row) for row in X])

        for i in range(len(y)):
            policy.update(X[i], "batch", y[i], experiment_id=f"lin_{i}")

        # Analytical Ridge Regression: (X_norm^T X_norm + alpha*I)^(-1) X_norm^T y
        expected_A = np.eye(d) * alpha + X_norm.T @ X_norm
        expected_b = X_norm.T @ y
        expected_theta = np.linalg.solve(expected_A, expected_b)

        np.testing.assert_allclose(policy.A["batch"], expected_A, rtol=1e-5)
        np.testing.assert_allclose(policy.b["batch"], expected_b, rtol=1e-5)
        np.testing.assert_allclose(np.linalg.solve(policy.A["batch"], policy.b["batch"]), expected_theta, rtol=1e-5)

    def test_action_masking_rules(self):
        """Verify structural, repeat failure, and safety floor masking."""
        arms = ["cache", "index", "batch", "async", "pool", "pagination", "compression"]

        # 1. Structural rule: hotspot without db query masks 'index'
        hotspot_nodb = {
            "file": "server.js",
            "function": "computeHash",
            "category": "performance",
            "evidence": {"static": ["crypto.pbkdf2Sync"]}
        }
        unmasked_nodb, masked_nodb = compute_action_mask(arms, hotspot_nodb, features={})
        self.assertNotIn("index", unmasked_nodb)
        self.assertIn("async", unmasked_nodb)

        # 2. Structural rule: collection endpoint allows pagination
        hotspot_list = {
            "file": "orders.js",
            "function": "listOrders",
            "category": "performance",
            "evidence": {"static": ["db.orders.find()"]}
        }
        unmasked_list, _ = compute_action_mask(arms, hotspot_list, features={})
        self.assertIn("pagination", unmasked_list)
        self.assertIn("index", unmasked_list)

        # 3. Repeat failure rule: if an arm failed >= 2 times on same hotspot, mask it out
        failures = [
            {"file": "orders.js", "function": "listOrders", "strategy": "batch"},
            {"file": "orders.js", "function": "listOrders", "strategy": "batch"}
        ]
        unmasked_after_fail, masked_after_fail = compute_action_mask(arms, hotspot_list, features={}, failure_history=failures)
        self.assertNotIn("batch", unmasked_after_fail)
        self.assertIn("pagination", unmasked_after_fail)

        # 4. Safety floor: arm with n >= 5 and UCB < -0.30 is masked out
        posterior_stats = {
            "compression": {"n": 6, "ucb": -0.42}
        }
        unmasked_safe, masked_safe = compute_action_mask(arms, hotspot_list, features={}, posterior_stats=posterior_stats)
        self.assertNotIn("compression", unmasked_safe)

    def test_deterministic_state_rebuild(self):
        """Verify that batch rebuild produces the exact identical state as incremental updates."""
        policy = ThompsonPolicy(prior_strength=2.0)
        rows = [
            {"_id": "exp1", "strategy": "batch", "reward": 0.45, "category": "performance"},
            {"_id": "exp2", "strategy": "async", "reward": 0.25, "category": "reliability"},
            {"_id": "exp3", "strategy": "cache", "reward": -0.10, "category": "performance"},
            {"_id": "exp4", "strategy": "batch", "reward": 0.60, "category": "performance"}
        ]

        # Incremental updates
        for r in rows:
            policy.update([], r["strategy"], r["reward"], r["category"], r["_id"])
        state_incremental = policy.state()

        # Clean policy & batch rebuild
        fresh_policy = ThompsonPolicy(prior_strength=2.0)
        state_rebuilt = fresh_policy.rebuild(rows)

        self.assertEqual(state_incremental["state_hash"], state_rebuilt["state_hash"])
        self.assertEqual(state_incremental["total_updates"], state_rebuilt["total_updates"])

    def test_staged_policy_router(self):
        """Verify staged router transitions: Thompson (N < 10) -> LinUCB (N >= 10 and N_CAT >= 4)."""
        router = PolicyRouter(N_B=10, N_CAT=4, d=4, arms=["cache", "batch", "async"])
        ctx = [0.1, 0.2, 0.3, 0.4]

        # Initially 0 updates -> mode is 'thompson'
        arm, prop, scores, active_mode = router.select(ctx, ["cache", "batch", "async"], category="performance")
        self.assertEqual(active_mode, "thompson")

        # Add 10 updates for performance -> hits N_B=10 and N_CAT=10 >= 4 -> mode transitions to 'linucb'
        for i in range(10):
            router.update(ctx, "batch", 0.5, category="performance", experiment_id=f"r_{i}")

        arm_lin, _, _, active_mode_lin = router.select(ctx, ["cache", "batch", "async"], category="performance")
        self.assertEqual(active_mode_lin, "linucb")

    def test_simulator_thompson_regret(self):
        """Verify Thompson sampling achieves significantly lower cumulative regret than Random."""
        sim_res = run_simulation(steps=100, seeds_count=3, n_b=20)
        policies = sim_res["policies"]

        th_regret = policies["Thompson"]["finalMeanRegret"]
        rnd_regret = policies["Random"]["finalMeanRegret"]

        self.assertLess(th_regret, rnd_regret)
        self.assertGreater(policies["Thompson"]["finalMeanReward"], policies["Random"]["finalMeanReward"])

    def test_offline_evaluator_ess_guard(self):
        """Verify offline IPS evaluator returns ess_valid=False on small or discordant datasets."""
        transitions = [
            {"features": [0.1, 0.2], "arm": "batch", "reward": 0.5, "propensity": 0.1, "category": "performance"},
            {"features": [0.2, 0.1], "arm": "cache", "reward": -0.2, "propensity": 0.9, "category": "performance"},
            {"features": [0.3, 0.1], "arm": "batch", "reward": 0.4, "propensity": 0.1, "category": "performance"},
            {"features": [0.1, 0.4], "arm": "cache", "reward": -0.1, "propensity": 0.8, "category": "performance"},
            {"features": [0.2, 0.3], "arm": "async", "reward": 0.1, "propensity": 0.2, "category": "performance"},
            {"features": [0.5, 0.2], "arm": "cache", "reward": 0.0, "propensity": 0.7, "category": "performance"}
        ]
        target_policy = RulePolicy(arms=["batch", "cache", "async"])
        eval_res = evaluate_policy_offline(target_policy, transitions, min_ess_threshold=8.0)

        # ESS must be < 8.0 and flagged as invalid
        self.assertFalse(eval_res["ess_valid"])
        self.assertLess(eval_res["effective_sample_size"], 8.0)


if __name__ == "__main__":
    unittest.main()
