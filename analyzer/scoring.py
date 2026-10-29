"""
EVOLVE Scoring & Reward Engine (Python)
Strict mathematical parity with Node.js reward.js.
"""

from typing import Dict, Any, List, Union
import numpy as np


def calculate_reward(
    params: Dict[str, Any],
    custom_weights: Dict[str, float] = None
) -> Dict[str, Any]:
    """
    Computes reward matching:
    r = w1*(L_base - L_cand)/L_base - w2*max(0, E_cand - E_base) - w3*max(0, Mem_cand - Mem_base)/Mem_base - w4*[tests fail]
    """
    weights = {
        "w1": 0.5,
        "w2": 0.3,
        "w3": 0.1,
        "w4": 0.5
    }
    if custom_weights:
        weights.update(custom_weights)

    verdict = params.get("verdict", "accepted")
    if verdict in ["inconclusive", "errored"]:
        return {
            "reward": 0.0,
            "rewardBreakdown": {
                "latency": 0.0,
                "errorPenalty": 0.0,
                "memPenalty": 0.0,
                "testPenalty": 0.0
            },
            "excludeFromPolicy": True
        }

    def get_val(val: Union[float, int, List[float]]) -> float:
        if isinstance(val, list):
            return float(np.median(val)) if len(val) > 0 else 0.0
        return float(val) if val is not None else 0.0

    l_base = get_val(params.get("baselineLatency", 1.0))
    l_cand = get_val(params.get("candidateLatency", 1.0))
    e_base = get_val(params.get("baselineError", 0.0))
    e_cand = get_val(params.get("candidateError", 0.0))
    m_base = get_val(params.get("baselineMemory", 1.0))
    m_cand = get_val(params.get("candidateMemory", 1.0))
    tests_passed = bool(params.get("testsPassed", True))

    safe_l_base = l_base if l_base > 0 else 1.0
    safe_m_base = m_base if m_base > 0 else 1.0

    latency_reward = weights["w1"] * ((safe_l_base - l_cand) / safe_l_base)
    error_penalty = weights["w2"] * max(0.0, e_cand - e_base)
    mem_penalty = weights["w3"] * (max(0.0, m_cand - safe_m_base) / safe_m_base)
    test_penalty = 0.0 if tests_passed else weights["w4"]

    raw_reward = latency_reward - error_penalty - mem_penalty - test_penalty
    clipped_reward = max(-1.0, min(1.0, raw_reward))
    rounded_reward = round(clipped_reward, 4)

    return {
        "reward": rounded_reward,
        "rewardBreakdown": {
            "latency": round(latency_reward, 4),
            "errorPenalty": round(error_penalty, 4),
            "memPenalty": round(mem_penalty, 4),
            "testPenalty": round(test_penalty, 4)
        },
        "excludeFromPolicy": False
    }
