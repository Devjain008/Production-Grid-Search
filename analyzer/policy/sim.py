"""
EVOLVE Synthetic Policy Simulator
Simulates a multi-armed contextual bandit environment with clear feature-dependent optima.
Labels all metrics strictly as [SIMULATED].
"""

from typing import Dict, Any, List, Tuple
import numpy as np
from bandit import RandomPolicy, RulePolicy, ThompsonPolicy, LinUCBPolicy, PolicyRouter
from mask import DEFAULT_ARMS

ARMS = DEFAULT_ARMS


def generate_synthetic_context(rng: np.random.Generator) -> Tuple[List[float], str, str]:
    """
    Generates a 16-dimensional normalized synthetic context vector.
    Returns: (context_vector, category, optimal_arm)
    """
    ctx_type = rng.choice(["batch_dominant", "async_dominant", "cache_dominant", "pagination_dominant"])
    features = np.zeros(16, dtype=np.float64)

    if ctx_type == "batch_dominant":
        # dbTimeShare high (index 4)
        features[0] = 0.9   # static severity
        features[4] = 0.85  # dbTimeShare
        optimal = "batch"
        category = "performance"
    elif ctx_type == "async_dominant":
        # eventLoopLag high (index 2)
        features[0] = 0.8
        features[2] = 0.95  # eventLoopLag
        optimal = "async"
        category = "performance"
    elif ctx_type == "cache_dominant":
        # read-heavy, high route RPS (index 8)
        features[0] = 0.7
        features[8] = 0.90  # routeRps
        optimal = "cache"
        category = "performance"
    else:
        # pagination dominant, complexity high (index 7)
        features[0] = 0.6
        features[7] = 0.85  # complexity
        optimal = "pagination"
        category = "architecture"

    # Add minor noise
    features += rng.normal(0, 0.05, size=16)
    norm = np.linalg.norm(features)
    features = (features / norm) if norm > 0 else features

    return features.tolist(), category, optimal


def evaluate_synthetic_reward(arm: str, optimal_arm: str, rng: np.random.Generator) -> Tuple[float, float]:
    """
    Calculates simulated reward and regret:
    Optimal arm yields mean reward ~ +0.65; sub-optimal arms yield mean reward ~ -0.10 to +0.15.
    Returns: (reward, regret)
    """
    optimal_mean = 0.65
    if arm == optimal_arm:
        mean_r = optimal_mean
    elif arm in ["cache", "batch", "async"] and optimal_arm in ["cache", "batch", "async"]:
        mean_r = 0.20  # Partial positive transfer
    else:
        mean_r = -0.15

    noise = float(rng.normal(0, 0.15))
    reward = float(np.clip(mean_r + noise, -1.0, 1.0))
    regret = float(max(0.0, optimal_mean - mean_r))

    return reward, regret


def run_simulation(
    steps: int = 500,
    seeds_count: int = 20,
    n_b: int = 40
) -> Dict[str, Any]:
    """
    Runs T steps x seeds per policy and records cumulative reward & cumulative regret.
    """
    policies_config = {
        "Random": lambda: RandomPolicy(arms=ARMS),
        "Rule": lambda: RulePolicy(arms=ARMS),
        "Thompson": lambda: ThompsonPolicy(arms=ARMS, prior_strength=2.0),
        "LinUCB": lambda: LinUCBPolicy(d=16, arms=ARMS, alpha=0.5),
        "Router": lambda: PolicyRouter(N_B=n_b, N_CAT=10, d=16, arms=ARMS)
    }

    results = {}

    for name, init_fn in policies_config.items():
        all_rewards = []
        all_regrets = []

        for s in range(seeds_count):
            seed = 1000 + s
            rng = np.random.default_rng(seed)
            pol = init_fn()

            cum_r = 0.0
            cum_reg = 0.0
            r_trajectory = []
            reg_trajectory = []

            for t in range(steps):
                ctx, cat, optimal = generate_synthetic_context(rng)
                unmasked = list(ARMS)

                # Policy decision
                if name == "Router":
                    chosen, prop, scores, _ = pol.select(ctx, unmasked, category=cat, seed=seed + t)
                else:
                    chosen, prop, scores = pol.select(ctx, unmasked, category=cat, seed=seed + t)

                # Simulated environment response
                rew, reg = evaluate_synthetic_reward(chosen, optimal, rng)

                # Policy update
                pol.update(ctx, chosen, rew, category=cat)

                cum_r += rew
                cum_reg += reg
                r_trajectory.append(cum_r)
                reg_trajectory.append(cum_reg)

            all_rewards.append(r_trajectory)
            all_regrets.append(reg_trajectory)

        rewards_arr = np.array(all_rewards)   # (seeds, steps)
        regrets_arr = np.array(all_regrets)

        mean_reward = np.mean(rewards_arr, axis=0)
        p2_5_reward = np.percentile(rewards_arr, 2.5, axis=0)
        p97_5_reward = np.percentile(rewards_arr, 97.5, axis=0)

        mean_regret = np.mean(regrets_arr, axis=0)
        p2_5_regret = np.percentile(regrets_arr, 2.5, axis=0)
        p97_5_regret = np.percentile(regrets_arr, 97.5, axis=0)

        # Sample down to 25 timeline checkpoints for compact serialization
        indices = np.linspace(0, steps - 1, 25, dtype=int)

        results[name] = {
            "isSimulated": True,
            "steps": steps,
            "seeds": seeds_count,
            "finalMeanReward": round(float(mean_reward[-1]), 2),
            "finalMeanRegret": round(float(mean_regret[-1]), 2),
            "timeline": [
                {
                    "step": int(idx + 1),
                    "meanReward": round(float(mean_reward[idx]), 2),
                    "rewardCI": [round(float(p2_5_reward[idx]), 2), round(float(p97_5_reward[idx]), 2)],
                    "meanRegret": round(float(mean_regret[idx]), 2),
                    "regretCI": [round(float(p2_5_regret[idx]), 2), round(float(p97_5_regret[idx]), 2)]
                }
                for idx in indices
            ]
        }

    return {
        "status": "SIMULATED",
        "steps": steps,
        "seeds": seeds_count,
        "policies": results
    }
