"""
Multi-Armed and Contextual Bandit Policies for EVOLVE
Implements Random, Rule, Thompson Sampling (NIG), LinUCB, and Staged PolicyRouter.
"""

from typing import Dict, Any, List, Tuple, Optional
import numpy as np
import hashlib
from base import Policy
from mask import DEFAULT_ARMS

# Default rule mapping per category
CATEGORY_DEFAULT_RULE = {
    "performance": "batch",
    "reliability": "async",
    "architecture": "pagination",
    "security": "none",
    "other": "cache"
}


class RandomPolicy(Policy):
    def __init__(self, arms: List[str] = None):
        self.arms = arms or DEFAULT_ARMS

    def select(self, context, unmasked_arms, category="performance", seed=None):
        if not unmasked_arms:
            return "none", 1.0, {}
        rng = np.random.default_rng(seed)
        chosen = str(rng.choice(unmasked_arms))
        propensity = 1.0 / len(unmasked_arms)
        scores = {a: {"mean": 0.0, "ucb": 0.0, "sample": 0.0} for a in unmasked_arms}
        return chosen, round(propensity, 6), scores

    def update(self, context, arm, reward, category="performance", experiment_id=None):
        return True

    def state(self):
        return {"name": "RandomPolicy", "arms": self.arms}

    def load(self, state_dict):
        self.arms = state_dict.get("arms", DEFAULT_ARMS)

    def rebuild(self, rows):
        return self.state()


class RulePolicy(Policy):
    def __init__(self, arms: List[str] = None):
        self.arms = arms or DEFAULT_ARMS

    def select(self, context, unmasked_arms, category="performance", seed=None):
        if not unmasked_arms:
            return "none", 1.0, {}
        favored = CATEGORY_DEFAULT_RULE.get(category, "batch")
        chosen = favored if favored in unmasked_arms else unmasked_arms[0]
        propensity = 1.0  # Deterministic
        scores = {a: {"mean": 1.0 if a == chosen else 0.0, "ucb": 1.0 if a == chosen else 0.0, "sample": 1.0 if a == chosen else 0.0} for a in unmasked_arms}
        return chosen, propensity, scores

    def update(self, context, arm, reward, category="performance", experiment_id=None):
        return True

    def state(self):
        return {"name": "RulePolicy"}

    def load(self, state_dict):
        pass

    def rebuild(self, rows):
        return self.state()


class ThompsonPolicy(Policy):
    """
    Context-free Thompson Sampling with Normal-Inverse-Gamma (NIG) Conjugate Prior per (category, arm).
    Prior seeded mildly in favor of rule-suggested strategy.
    """
    def __init__(self, arms: List[str] = None, prior_strength: float = 2.0, eps: float = 0.05):
        self.arms = arms or DEFAULT_ARMS
        self.prior_strength = prior_strength
        self.eps = eps
        self.seen_experiment_ids = set()
        # post[(cat, arm)] = {"mu": float, "kappa": float, "alpha": float, "beta": float, "n": int, "rewards": []}
        self.posteriors: Dict[Tuple[str, str], Dict[str, Any]] = {}

    def _get_or_init_posterior(self, category: str, arm: str) -> Dict[str, Any]:
        key = (category, arm)
        if key not in self.posteriors:
            favored = CATEGORY_DEFAULT_RULE.get(category)
            # Mild prior: +0.25 mean for rule favored arm, 0.0 for others
            prior_mu = 0.25 if arm == favored else 0.0
            self.posteriors[key] = {
                "mu": prior_mu,
                "kappa": self.prior_strength,
                "alpha": 2.0,
                "beta": 0.5,
                "n": 0,
                "rewards": []
            }
        return self.posteriors[key]

    def select(self, context, unmasked_arms, category="performance", seed=None):
        if not unmasked_arms:
            return "none", 1.0, {}

        rng = np.random.default_rng(seed)

        # Draw posterior samples for each unmasked arm
        samples = {}
        means = {}
        ucbs = {}

        for arm in unmasked_arms:
            post = self._get_or_init_posterior(category, arm)
            # Sample sigma2 from Inv-Gamma(alpha, beta) => 1 / Gamma(alpha, scale=1/beta)
            sigma2 = 1.0 / rng.gamma(post["alpha"], 1.0 / post["beta"])
            # Sample theta from Normal(mu, sigma2 / kappa)
            theta = rng.normal(post["mu"], np.sqrt(sigma2 / post["kappa"]))
            samples[arm] = float(theta)
            means[arm] = float(post["mu"])
            # 95% UCB approximation
            ucbs[arm] = float(post["mu"] + 1.96 * np.sqrt(post["beta"] / (post["alpha"] * post["kappa"])))

        # Epsilon floor exploration
        if rng.random() < self.eps:
            chosen = str(rng.choice(unmasked_arms))
        else:
            chosen = max(unmasked_arms, key=lambda a: samples[a])

        # Monte Carlo Propensity Estimation (2000 draws)
        propensity = self._estimate_propensity_mc(unmasked_arms, category, chosen, mc_draws=2000, seed=seed)

        scores = {
            a: {
                "mean": round(means[a], 4),
                "ucb": round(ucbs[a], 4),
                "sample": round(samples[a], 4)
            } for a in unmasked_arms
        }

        return chosen, round(propensity, 6), scores

    def _estimate_propensity_mc(self, arms: List[str], category: str, target_arm: str, mc_draws: int = 2000, seed=None) -> float:
        rng = np.random.default_rng(seed)
        wins = 0

        # Precompute posterior params
        params = [self._get_or_init_posterior(category, a) for a in arms]

        for _ in range(mc_draws):
            draws = []
            for p in params:
                sigma2 = 1.0 / rng.gamma(p["alpha"], 1.0 / p["beta"])
                draws.append(rng.normal(p["mu"], np.sqrt(sigma2 / p["kappa"])))
            best_idx = int(np.argmax(draws))
            if arms[best_idx] == target_arm:
                wins += 1

        mc_prob = wins / float(mc_draws)
        # Combine with epsilon-floor uniform distribution
        final_prop = (1.0 - self.eps) * mc_prob + (self.eps / len(arms))
        return float(final_prop)

    def update(self, context, arm, reward, category="performance", experiment_id=None):
        if experiment_id and experiment_id in self.seen_experiment_ids:
            return False  # Idempotent skip
        if experiment_id:
            self.seen_experiment_ids.add(experiment_id)

        post = self._get_or_init_posterior(category, arm)
        r = float(np.clip(reward, -1.0, 1.0))
        post["rewards"].append(r)

        # Incremental NIG conjugate update
        mu0 = post["mu"]
        k0 = post["kappa"]
        a0 = post["alpha"]
        b0 = post["beta"]

        k_n = k0 + 1.0
        mu_n = (k0 * mu0 + r) / k_n
        a_n = a0 + 0.5
        b_n = b0 + 0.5 * (k0 / k_n) * ((r - mu0) ** 2)

        post["mu"] = float(mu_n)
        post["kappa"] = float(k_n)
        post["alpha"] = float(a_n)
        post["beta"] = float(b_n)
        post["n"] += 1
        return True

    def state(self):
        serialized_post = {}
        for (cat, arm), p in self.posteriors.items():
            key = f"{cat}::{arm}"
            serialized_post[key] = {k: v for k, v in p.items() if k != "rewards"}
            serialized_post[key]["rewards_count"] = len(p["rewards"])

        state_hash = hashlib.sha256(str(sorted(serialized_post.items())).encode("utf-8")).hexdigest()
        return {
            "name": "ThompsonPolicy",
            "arms": self.arms,
            "prior_strength": self.prior_strength,
            "eps": self.eps,
            "posteriors": serialized_post,
            "total_updates": len(self.seen_experiment_ids),
            "state_hash": state_hash
        }

    def load(self, state_dict):
        self.arms = state_dict.get("arms", DEFAULT_ARMS)
        self.prior_strength = state_dict.get("prior_strength", 2.0)
        self.eps = state_dict.get("eps", 0.05)
        raw_post = state_dict.get("posteriors", {})
        self.posteriors = {}
        for key, p in raw_post.items():
            cat, arm = key.split("::")
            self.posteriors[(cat, arm)] = {
                "mu": p["mu"],
                "kappa": p["kappa"],
                "alpha": p["alpha"],
                "beta": p["beta"],
                "n": p["n"],
                "rewards": []
            }

    def rebuild(self, rows):
        self.posteriors.clear()
        self.seen_experiment_ids.clear()
        for r in rows:
            arm = r.get("strategy") or r.get("arm")
            cat = r.get("hotspot", {}).get("category") or r.get("category") or "performance"
            rew = r.get("reward", 0.0)
            exp_id = str(r.get("_id") or r.get("experimentId") or "")
            if arm:
                self.update([], arm, rew, cat, exp_id)
        return self.state()


class LinUCBPolicy(Policy):
    """
    Contextual Disjoint Linear Upper Confidence Bound (LinUCB) Policy.
    Numerically stable: uses np.linalg.solve on (A_a, b_a) without explicit inverse.
    """
    def __init__(self, d: int = 16, arms: List[str] = None, alpha: float = 0.5, eps: float = 0.05):
        self.d = d
        self.arms = arms or DEFAULT_ARMS
        self.alpha = alpha
        self.eps = eps
        self.seen_experiment_ids = set()
        # Per arm: A_a in R^{d x d}, b_a in R^d
        self.A: Dict[str, np.ndarray] = {a: np.identity(d, dtype=np.float64) for a in self.arms}
        self.b: Dict[str, np.ndarray] = {a: np.zeros(d, dtype=np.float64) for a in self.arms}
        self.counts: Dict[str, int] = {a: 0 for a in self.arms}

    def _normalize_context(self, context: Any) -> np.ndarray:
        if context is None or (isinstance(context, (list, np.ndarray)) and len(context) == 0):
            ctx = np.zeros(self.d, dtype=np.float64)
        else:
            ctx = np.array(context[:self.d], dtype=np.float64)
            if len(ctx) < self.d:
                ctx = np.pad(ctx, (0, self.d - len(ctx)), "constant")
        norm = np.linalg.norm(ctx)
        return (ctx / norm) if norm > 0 else ctx

    def select(self, context, unmasked_arms, category="performance", seed=None):
        if not unmasked_arms:
            return "none", 1.0, {}

        x = self._normalize_context(context)
        rng = np.random.default_rng(seed)

        means = {}
        ucbs = {}
        samples = {}

        for arm in unmasked_arms:
            A_a = self.A.get(arm, np.identity(self.d))
            b_a = self.b.get(arm, np.zeros(self.d))

            # Solve theta_hat = A_a \ b_a
            theta_hat = np.linalg.solve(A_a, b_a)
            # Solve A_a v = x => v = A_a^-1 x, then s = x^T v = x^T A_a^-1 x
            v = np.linalg.solve(A_a, x)
            var_x = float(np.dot(x, v))
            std_x = np.sqrt(max(0.0, var_x))

            expected_r = float(np.dot(theta_hat, x))
            ucb_score = expected_r + self.alpha * std_x

            means[arm] = expected_r
            ucbs[arm] = ucb_score
            samples[arm] = ucb_score

        # Epsilon floor
        if rng.random() < self.eps:
            chosen = str(rng.choice(unmasked_arms))
            propensity = self.eps / len(unmasked_arms)
        else:
            chosen = max(unmasked_arms, key=lambda a: ucbs[a])
            propensity = (1.0 - self.eps) + (self.eps / len(unmasked_arms))

        scores = {
            a: {
                "mean": round(means[a], 4),
                "ucb": round(ucbs[a], 4),
                "sample": round(samples[a], 4)
            } for a in unmasked_arms
        }

        return chosen, round(propensity, 6), scores

    def update(self, context, arm, reward, category="performance", experiment_id=None):
        if experiment_id and experiment_id in self.seen_experiment_ids:
            return False
        if experiment_id:
            self.seen_experiment_ids.add(experiment_id)

        if arm not in self.A:
            self.A[arm] = np.identity(self.d, dtype=np.float64)
            self.b[arm] = np.zeros(self.d, dtype=np.float64)
            self.counts[arm] = 0

        x = self._normalize_context(context)
        r = float(np.clip(reward, -1.0, 1.0))

        # Rank-1 update: A_a += x x^T, b_a += r x
        self.A[arm] += np.outer(x, x)
        self.b[arm] += r * x
        self.counts[arm] += 1
        return True

    def state(self):
        serialized_models = {}
        for arm in self.arms:
            A_list = self.A[arm].tolist()
            b_list = self.b[arm].tolist()
            serialized_models[arm] = {
                "A_trace": float(np.trace(self.A[arm])),
                "b_sum": float(np.sum(self.b[arm])),
                "count": self.counts[arm]
            }

        state_hash = hashlib.sha256(str(sorted(serialized_models.items())).encode("utf-8")).hexdigest()
        return {
            "name": "LinUCBPolicy",
            "d": self.d,
            "arms": self.arms,
            "alpha": self.alpha,
            "eps": self.eps,
            "models": serialized_models,
            "total_updates": len(self.seen_experiment_ids),
            "state_hash": state_hash
        }

    def load(self, state_dict):
        self.d = state_dict.get("d", 16)
        self.arms = state_dict.get("arms", DEFAULT_ARMS)
        self.alpha = state_dict.get("alpha", 0.5)
        self.eps = state_dict.get("eps", 0.05)

    def rebuild(self, rows):
        self.seen_experiment_ids.clear()
        for arm in self.arms:
            self.A[arm] = np.identity(self.d, dtype=np.float64)
            self.b[arm] = np.zeros(self.d, dtype=np.float64)
            self.counts[arm] = 0

        for r in rows:
            arm = r.get("strategy") or r.get("arm")
            rew = r.get("reward", 0.0)
            ctx = r.get("features", [])
            if isinstance(ctx, dict):
                ctx = ctx.get("vector", [])
            exp_id = str(r.get("_id") or r.get("experimentId") or "")
            if arm:
                self.update(ctx, arm, rew, "performance", exp_id)

        return self.state()


class PolicyRouter(Policy):
    """
    Staged Production Router:
    n_total < N_B (40) -> ThompsonPolicy (context-free conjugate NIG)
    n_total >= N_B (40) -> LinUCBPolicy (contextual linear models)
    Per-category fallback to ThompsonPolicy if category has < N_CAT (10) rows.
    """
    def __init__(self, N_B: int = 40, N_CAT: int = 10, d: int = 16, arms: List[str] = None):
        self.N_B = N_B
        self.N_CAT = N_CAT
        self.arms = arms or DEFAULT_ARMS
        self.thompson = ThompsonPolicy(arms=self.arms)
        self.linucb = LinUCBPolicy(d=d, arms=self.arms)
        self.total_updates = 0
        self.category_counts: Dict[str, int] = {}

    def select(self, context, unmasked_arms, category="performance", seed=None):
        cat_count = self.category_counts.get(category, 0)
        mode = "thompson"

        # Staged decision: require both global N_B and category N_CAT thresholds
        if self.total_updates >= self.N_B and cat_count >= self.N_CAT:
            mode = "linucb"
            chosen, prop, scores = self.linucb.select(context, unmasked_arms, category, seed)
        else:
            mode = "thompson"
            chosen, prop, scores = self.thompson.select(context, unmasked_arms, category, seed)

        return chosen, prop, scores, mode

    def update(self, context, arm, reward, category="performance", experiment_id=None):
        # Update both constituent policies
        t_ok = self.thompson.update(context, arm, reward, category, experiment_id)
        l_ok = self.linucb.update(context, arm, reward, category, experiment_id)

        if t_ok or l_ok:
            self.total_updates += 1
            self.category_counts[category] = self.category_counts.get(category, 0) + 1
            return True
        return False

    def state(self):
        return {
            "name": "PolicyRouter",
            "N_B": self.N_B,
            "N_CAT": self.N_CAT,
            "total_updates": self.total_updates,
            "category_counts": self.category_counts,
            "active_mode": "linucb" if self.total_updates >= self.N_B else "thompson",
            "thompson_state": self.thompson.state(),
            "linucb_state": self.linucb.state(),
            "state_hash": hashlib.sha256(f"{self.total_updates}:{sorted(self.category_counts.items())}".encode("utf-8")).hexdigest()
        }

    def load(self, state_dict):
        self.N_B = state_dict.get("N_B", 40)
        self.N_CAT = state_dict.get("N_CAT", 10)
        self.total_updates = state_dict.get("total_updates", 0)
        self.category_counts = state_dict.get("category_counts", {})
        if "thompson_state" in state_dict:
            self.thompson.load(state_dict["thompson_state"])
        if "linucb_state" in state_dict:
            self.linucb.load(state_dict["linucb_state"])

    def rebuild(self, rows):
        self.total_updates = 0
        self.category_counts.clear()
        self.thompson.rebuild(rows)
        self.linucb.rebuild(rows)
        for r in rows:
            cat = r.get("hotspot", {}).get("category") or r.get("category") or "performance"
            self.total_updates += 1
            self.category_counts[cat] = self.category_counts.get(cat, 0) + 1
        return self.state()
