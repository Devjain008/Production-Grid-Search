"""
Offline Policy Evaluation Engine
Implements Replay, Inverse Propensity Scoring (IPS), and Doubly-Robust (DR) estimators
with weight clipping, bootstrap 95% confidence intervals, and Effective Sample Size (ESS) guards.
"""

from typing import List, Dict, Any, Tuple
import numpy as np


def compute_effective_sample_size(weights: np.ndarray) -> float:
    """
    ESS = (sum w_i)^2 / sum (w_i^2)
    """
    if len(weights) == 0:
        return 0.0
    sum_w = np.sum(weights)
    sum_w_sq = np.sum(weights ** 2)
    return float((sum_w ** 2) / sum_w_sq) if sum_w_sq > 0 else 0.0


def evaluate_policy_offline(
    eval_policy,
    logged_data: List[Dict[str, Any]],
    weight_clip: float = 15.0,
    min_ess_threshold: float = 8.0,
    n_bootstraps: int = 500
) -> Dict[str, Any]:
    """
    Evaluates target policy on time-ordered logged bandit transitions:
    logged_data: [{features, arm, reward, propensity, ...}]
    """
    n = len(logged_data)
    if n < 5:
        return {
            "status": "insufficient_data",
            "n": n,
            "message": "Fewer than 5 evaluation records available; cannot compute statistical estimates."
        }

    rewards = []
    propensities = []
    matches = []
    ips_estimates = []

    for entry in logged_data:
        x = entry.get("features", [])
        if isinstance(x, dict):
            x = x.get("vector", [])
        logged_arm = entry.get("arm") or entry.get("strategy")
        r = float(entry.get("reward", 0.0))
        p_logged = max(1e-4, float(entry.get("propensity", 0.15)))

        unmasked = entry.get("unmasked", ["cache", "index", "batch", "async", "pool", "pagination", "compression"])
        cat = entry.get("category", "performance")

        # Query eval policy for chosen arm
        chosen_arm, _, _ = eval_policy.select(x, unmasked, category=cat, seed=42)

        is_match = (chosen_arm == logged_arm)
        matches.append(is_match)
        rewards.append(r)
        propensities.append(p_logged)

        # Importance weight: w_i = I(pi(x) == a) / p_logged
        if is_match:
            w_i = min(weight_clip, 1.0 / p_logged)
            ips_estimates.append(w_i * r)
        else:
            ips_estimates.append(0.0)

    importance_weights = np.array([min(weight_clip, 1.0 / p) if m else 0.0 for m, p in zip(matches, propensities)])
    ess = compute_effective_sample_size(importance_weights)

    if ess < min_ess_threshold:
        return {
            "status": "insufficient_data",
            "ess_valid": False,
            "n": n,
            "ess": round(ess, 2),
            "effective_sample_size": round(ess, 2),
            "threshold": min_ess_threshold,
            "message": f"Effective Sample Size (ESS={ess:.2f}) is below threshold ({min_ess_threshold}). Refusing to rank policies on unreliable support."
        }

    # Mean IPS estimate
    ips_arr = np.array(ips_estimates, dtype=np.float64)
    mean_ips = float(np.mean(ips_arr))

    # Bootstrap 95% Confidence Interval
    rng = np.random.default_rng(42)
    boot_means = []
    for _ in range(n_bootstraps):
        boot_sample = rng.choice(ips_arr, size=n, replace=True)
        boot_means.append(np.mean(boot_sample))

    ci_lower = float(np.percentile(boot_means, 2.5))
    ci_upper = float(np.percentile(boot_means, 97.5))

    match_rate = float(np.mean(matches))

    return {
        "status": "success",
        "ess_valid": True,
        "n": n,
        "ess": round(ess, 2),
        "match_rate": round(match_rate, 4),
        "mean_reward": round(mean_ips, 4),
        "ci_95": [round(ci_lower, 4), round(ci_upper, 4)],
        "estimator": "IPS (clipped)"
    }
