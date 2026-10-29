"""
EVOLVE Analyzer Microservice (FastAPI)
Provides endpoints for Anomaly Detection, Reward Scoring, Vector Embeddings,
and Contextual Bandit Policy Learning (Thompson Sampling -> LinUCB -> Staged Router).
"""

import sys
import os
from typing import List, Dict, Any, Optional
import hashlib
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Add local directory and policy package to sys.path
sys.path.append(os.path.dirname(__file__))
sys.path.append(os.path.join(os.path.dirname(__file__), "policy"))

from anomaly import detect_anomalies
from scoring import calculate_reward
from policy.bandit import PolicyRouter, ThompsonPolicy, LinUCBPolicy, RandomPolicy, RulePolicy
from policy.mask import compute_action_mask, DEFAULT_ARMS
from policy.evaluate import evaluate_policy_offline
from policy.sim import run_simulation

app = FastAPI(
    title="EVOLVE ML Analyzer & Policy Engine",
    description="Staged contextual bandit policy learning, anomaly detection, and reward scoring",
    version="2.0.0"
)

# Global Production Policy Router
policy_router = PolicyRouter(N_B=40, N_CAT=10, d=16, arms=DEFAULT_ARMS)
logged_transitions: List[Dict[str, Any]] = []


class MetricWindow(BaseModel):
    route: str
    p95: float
    errorRate: float
    rps: float
    memoryMb: float


class AnomalyRequest(BaseModel):
    windows: List[MetricWindow]


class EmbedRequest(BaseModel):
    texts: List[str]


class RewardRequest(BaseModel):
    baselineLatency: Any
    candidateLatency: Any
    baselineError: Optional[Any] = 0.0
    candidateError: Optional[Any] = 0.0
    baselineMemory: Optional[Any] = 1.0
    candidateMemory: Optional[Any] = 1.0
    testsPassed: Optional[bool] = True
    verdict: Optional[str] = "accepted"
    weights: Optional[Dict[str, float]] = None


class PolicySelectRequest(BaseModel):
    hotspot: Dict[str, Any]
    features: Optional[Dict[str, Any]] = None
    featureVersion: Optional[int] = 1
    projectId: Optional[str] = None
    failureHistory: Optional[List[Dict[str, Any]]] = None
    seed: Optional[int] = None


class PolicyUpdateRequest(BaseModel):
    features: Optional[Any] = None
    featureVersion: Optional[int] = 1
    arm: str
    reward: float
    category: Optional[str] = "performance"
    experimentId: Optional[str] = None


class PolicyRebuildRequest(BaseModel):
    rows: List[Dict[str, Any]]
    featureVersion: Optional[int] = 1


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "evolve-analyzer",
        "version": "2.0.0",
        "total_policy_updates": policy_router.total_updates,
        "active_policy_mode": policy_router.state()["active_mode"]
    }


@app.post("/anomaly")
def analyze_route_anomalies(request: AnomalyRequest):
    if not request.windows:
        raise HTTPException(status_code=400, detail="Metric windows array cannot be empty")

    dict_windows = [w.dict() for w in request.windows]
    anomalies = detect_anomalies(dict_windows)
    anomalies.sort(key=lambda x: x["anomalyScore"], reverse=True)

    return {
        "success": True,
        "count": len(anomalies),
        "anomalies": anomalies
    }


@app.post("/reward")
def compute_experiment_reward(request: RewardRequest):
    params = request.dict()
    weights = params.pop("weights", None)
    result = calculate_reward(params, weights)
    return {"success": True, **result}


@app.post("/embed")
def generate_embeddings(request: EmbedRequest):
    if not request.texts:
        raise HTTPException(status_code=400, detail="Texts array cannot be empty")

    dim = 384
    embeddings = []

    for text in request.texts:
        vec = np.zeros(dim, dtype=np.float64)
        clean = text.lower().replace("-", " ").replace("_", " ")
        tokens = [t for t in clean.split() if t]

        for i, token in enumerate(tokens):
            h = hashlib.sha256(token.encode("utf-8")).digest()
            for j in range(32):
                idx = (h[j] + j * 12) % dim
                sign = 1.0 if (h[(j + 1) % 32] % 2 == 0) else -1.0
                weight = 1.0 / np.sqrt(i + 1.0)
                vec[idx] += sign * weight

            if i > 0:
                bi = f"{tokens[i-1]}_{token}"
                bi_h = hashlib.sha256(bi.encode("utf-8")).digest()
                for k in range(16):
                    idx = (bi_h[k] + k * 23) % dim
                    sign = 1.0 if (bi_h[(k + 1) % 16] % 2 == 0) else -1.0
                    vec[idx] += sign * 1.5

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        embeddings.append([round(float(x), 6) for x in vec])

    return {
        "success": True,
        "count": len(embeddings),
        "dimension": dim,
        "embeddings": embeddings
    }


# ==========================================
# PHASE 5 POLICY BANDIT ENDPOINTS
# ==========================================

@app.post("/policy/select")
def select_policy_arm(request: PolicySelectRequest):
    """
    POST /policy/select: Selects an arm using action masking and staged PolicyRouter.
    Returns: chosen arm, reason, propensity, scores, and masked arms.
    """
    # 1. Reject mismatched feature versions
    if request.featureVersion and request.featureVersion != 1:
        raise HTTPException(status_code=400, detail=f"Unsupported featureVersion {request.featureVersion}. Active version is 1.")

    hotspot = request.hotspot
    category = hotspot.get("category") or "performance"
    features = request.features or {}
    ctx_vector = features.get("vector") if isinstance(features, dict) else features
    if not ctx_vector:
        ctx_vector = [0.5] * 16

    # 2. Compute Action Masking & Safety
    unmasked, masked = compute_action_mask(
        arms=DEFAULT_ARMS,
        hotspot=hotspot,
        features=features,
        failure_history=request.failureHistory or []
    )

    if not unmasked:
        return {
            "success": True,
            "arm": "none",
            "reason": "All strategies were masked due to structural incompatibility or repeat failures.",
            "propensity": 1.0,
            "scores": {},
            "policyVersion": "v1.0.0",
            "mode": "masked_all",
            "masked": masked
        }

    # 3. Policy Decision via Staged Router
    chosen_arm, propensity, scores, mode = policy_router.select(
        context=ctx_vector,
        unmasked_arms=unmasked,
        category=category,
        seed=request.seed
    )

    reason = f"Selected '{chosen_arm}' via {mode.upper()} policy router (propensity={propensity:.4f})"
    if mode == "thompson":
        reason += f" [Cold-start stage: n={policy_router.total_updates} < N_B=40]"
    else:
        reason += f" [Contextual LinUCB stage: n={policy_router.total_updates} >= N_B=40]"

    return {
        "success": True,
        "arm": chosen_arm,
        "reason": reason,
        "propensity": propensity,
        "scores": scores,
        "policyVersion": "v1.0.0",
        "mode": mode,
        "masked": masked
    }


@app.post("/policy/update")
def update_policy(request: PolicyUpdateRequest):
    """
    POST /policy/update: Updates policy parameters with observed benchmark reward.
    Idempotent by experimentId.
    """
    if request.featureVersion and request.featureVersion != 1:
        # Ignore legacy or incompatible feature versions
        return {"success": False, "skipped": True, "reason": "Incompatible featureVersion"}

    ctx_vector = request.features.get("vector") if isinstance(request.features, dict) else request.features
    if not ctx_vector:
        ctx_vector = [0.5] * 16

    applied = policy_router.update(
        context=ctx_vector,
        arm=request.arm,
        reward=request.reward,
        category=request.category or "performance",
        experiment_id=request.experimentId
    )

    if applied and request.experimentId:
        logged_transitions.append({
            "experimentId": request.experimentId,
            "arm": request.arm,
            "reward": request.reward,
            "category": request.category or "performance",
            "features": ctx_vector,
            "featureVersion": 1
        })

    return {
        "success": True,
        "applied": applied,
        "totalUpdates": policy_router.total_updates,
        "activeMode": policy_router.state()["active_mode"]
    }


@app.post("/policy/rebuild")
def rebuild_policy(request: PolicyRebuildRequest):
    """
    POST /policy/rebuild: Deterministically replays rows from /policy-data in order.
    """
    valid_rows = [r for r in request.rows if r.get("featureVersion", 1) == 1]
    state = policy_router.rebuild(valid_rows)

    return {
        "success": True,
        "rebuiltRows": len(valid_rows),
        "stateHash": state["state_hash"],
        "totalUpdates": policy_router.total_updates,
        "activeMode": state["active_mode"]
    }


@app.get("/policy/state")
def get_policy_state():
    """
    GET /policy/state: Returns full policy state and hyperparameters.
    """
    return {
        "success": True,
        "state": policy_router.state()
    }


@app.get("/policy/stats")
def get_policy_stats():
    """
    GET /policy/stats: Returns empirical stats per category x arm with 95% credible intervals.
    """
    categories = ["performance", "reliability", "architecture", "other"]
    matrix = []

    for cat in categories:
        for arm in DEFAULT_ARMS:
            post = policy_router.thompson._get_or_init_posterior(cat, arm)
            n_obs = post["n"]
            mean_r = post["mu"]
            # 95% Credible interval from posterior Student's t / Normal approx
            ci_half = 1.96 * np.sqrt(post["beta"] / (post["alpha"] * post["kappa"]))
            ci = [round(float(mean_r - ci_half), 4), round(float(mean_r + ci_half), 4)]

            matrix.append({
                "category": cat,
                "arm": arm,
                "n": n_obs,
                "meanReward": round(float(mean_r), 4),
                "credibleInterval95": ci,
                "isReliable": n_obs >= 5
            })

    return {
        "success": True,
        "totalUpdates": policy_router.total_updates,
        "activeMode": policy_router.state()["active_mode"],
        "stats": matrix
    }


@app.post("/policy/evaluate")
def evaluate_offline():
    """
    POST /policy/evaluate: Runs offline IPS evaluation with ESS checking on logged transitions.
    """
    result = evaluate_policy_offline(policy_router, logged_transitions)
    return {"success": True, "evaluation": result}


@app.post("/policy/simulate")
def run_sim(steps: int = 500, seeds: int = 20):
    """
    POST /policy/simulate: Runs synthetic multi-seed simulation comparing policies.
    All outputs strictly labeled [SIMULATED].
    """
    result = run_simulation(steps=steps, seeds_count=seeds, n_b=40)
    return {"success": True, "simulation": result}


@app.post("/policy/export-dataset")
def export_dataset():
    """
    POST /policy/export-dataset: Exports logged transitions for Stage C RL training.
    """
    return {
        "success": True,
        "count": len(logged_transitions),
        "data": logged_transitions
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
