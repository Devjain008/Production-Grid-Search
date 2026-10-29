"""
Action Masking and Safety Engine
Filters invalid or unsafe optimization strategies before bandit exploration.
"""

from typing import List, Dict, Any, Tuple

DEFAULT_ARMS = ["cache", "index", "batch", "async", "pool", "pagination", "compression"]


def compute_action_mask(
    arms: List[str],
    hotspot: Dict[str, Any],
    features: Dict[str, Any],
    failure_history: List[Dict[str, Any]] = None,
    posterior_stats: Dict[str, Dict[str, Any]] = None,
    safe_floor: float = -0.30,
    n_min: int = 5
) -> Tuple[List[str], List[Dict[str, str]]]:
    """
    Computes active unmasked arms and records explanations for masked arms.
    Returns: (unmasked_arms, masked_explanations)
    """
    failure_history = failure_history or []
    posterior_stats = posterior_stats or {}

    unmasked = []
    masked = []

    func_name = (hotspot.get("function") or "").lower()
    file_name = (hotspot.get("file") or "").lower()
    category = hotspot.get("category") or "performance"
    static_evidence = hotspot.get("evidence", {}).get("static", [])

    has_db = any(
        "query" in str(s).lower() or "db" in str(s).lower() or "find" in str(s).lower()
        for s in static_evidence
    ) or "order" in func_name or "user" in func_name or "product" in func_name

    has_list_response = "users" in func_name or "orders" in func_name or "products" in func_name or "list" in func_name

    # Count historical failures per arm on this specific hotspot
    hotspot_key = f"{file_name}:{func_name}"
    arm_failures: Dict[str, int] = {}
    for entry in failure_history:
        entry_key = f"{entry.get('file', '').lower()}:{entry.get('function', '').lower()}"
        if entry_key == hotspot_key:
            arm = entry.get("strategy")
            if arm:
                arm_failures[arm] = arm_failures.get(arm, 0) + 1

    for arm in arms:
        # 1. Structural rule: index requires database query in hotspot
        if arm == "index" and not has_db:
            masked.append({"arm": arm, "why": "Hotspot contains no detectable database query or storage lookups"})
            continue

        # 2. Structural rule: pagination requires list/collection endpoint
        if arm == "pagination" and not has_list_response:
            masked.append({"arm": arm, "why": "Hotspot is not a collection or list endpoint (pagination inapplicable)"})
            continue

        # 3. Repeat failure rule: >= 2 prior failures on this exact hotspot
        if arm_failures.get(arm, 0) >= 2:
            masked.append({"arm": arm, "why": f"Strategy '{arm}' failed {arm_failures[arm]} times previously on this hotspot"})
            continue

        # 4. Statistical safety floor: UCB < SAFE_FLOOR with n >= N_MIN
        arm_stat = posterior_stats.get(arm, {})
        n_obs = arm_stat.get("n", 0)
        ucb = arm_stat.get("ucb", 1.0)
        if n_obs >= n_min and ucb < safe_floor:
            masked.append({"arm": arm, "why": f"Posterior UCB ({ucb:.2f}) is below safe floor ({safe_floor}) with n={n_obs} (proven harmful)"})
            continue

        unmasked.append(arm)

    return unmasked, masked
