"""
Anomaly Detection Module for EVOLVE
Analyzes per-route metric windows (p95 latency, error rate, RPS, memory).
Uses Isolation Forest (scikit-learn) with fixed random_state.
Falls back to robust Z-Score analysis when fewer than 20 windows exist.
"""

from typing import List, Dict, Any
import numpy as np
from sklearn.ensemble import IsolationForest


def compute_z_score_anomalies(windows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Fallback method when fewer than 20 windows exist.
    Calculates per-metric Z-score deviations from the distribution mean.
    """
    if not windows:
        return []

    features = ["p95", "errorRate", "rps", "memoryMb"]
    data = []
    for w in windows:
        data.append([
            float(w.get("p95", 0.0)),
            float(w.get("errorRate", 0.0)),
            float(w.get("rps", 0.0)),
            float(w.get("memoryMb", 0.0)),
        ])

    arr = np.array(data, dtype=np.float64)
    means = np.mean(arr, axis=0)
    stds = np.std(arr, axis=0)

    # Avoid zero-division
    stds[stds == 0] = 1e-6

    results = []
    for idx, w in enumerate(windows):
        row = arr[idx]
        z_scores = np.abs((row - means) / stds)
        max_z_idx = int(np.argmax(z_scores))
        max_z = float(z_scores[max_z_idx])

        # Normalize z-score to [0, 1] using sigmoid-like scaling
        anomaly_score = float(1.0 / (1.0 + np.exp(-0.8 * (max_z - 1.5))))
        anomaly_score = round(min(1.0, max(0.0, anomaly_score)), 4)

        results.append({
            "route": w.get("route", f"route-{idx}"),
            "anomalyScore": anomaly_score,
            "isAnomaly": anomaly_score > 0.65,
            "topContributingMetric": features[max_z_idx],
            "method": "z-score-fallback",
            "metrics": {
                "p95": float(w.get("p95", 0.0)),
                "errorRate": float(w.get("errorRate", 0.0)),
                "rps": float(w.get("rps", 0.0)),
                "memoryMb": float(w.get("memoryMb", 0.0))
            }
        })

    return results


def compute_isolation_forest_anomalies(windows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Primary Isolation Forest anomaly detection for >= 20 windows.
    Returns per-route anomaly score (0-1) and identifies top contributing metric.
    """
    features = ["p95", "errorRate", "rps", "memoryMb"]
    data = []
    for w in windows:
        data.append([
            float(w.get("p95", 0.0)),
            float(w.get("errorRate", 0.0)),
            float(w.get("rps", 0.0)),
            float(w.get("memoryMb", 0.0)),
        ])

    arr = np.array(data, dtype=np.float64)

    # Fixed random state for strict reproducibility
    model = IsolationForest(
        n_estimators=100,
        contamination=0.15,
        random_state=42
    )
    model.fit(arr)

    # Decision function returns negative scores for anomalies (lower = more anomalous)
    raw_scores = model.decision_function(arr)
    # Invert and normalize to [0, 1] range: lower decision_function -> higher anomaly score
    min_s = float(np.min(raw_scores))
    max_s = float(np.max(raw_scores))
    span = (max_s - min_s) if (max_s - min_s) > 1e-6 else 1.0

    # Feature importances via deviation from population medians
    medians = np.median(arr, axis=0)
    stds = np.std(arr, axis=0)
    stds[stds == 0] = 1e-6

    results = []
    for idx, w in enumerate(windows):
        norm_score = 1.0 - ((raw_scores[idx] - min_s) / span)
        norm_score = round(float(np.clip(norm_score, 0.0, 1.0)), 4)

        row = arr[idx]
        deviations = np.abs((row - medians) / stds)
        top_metric_idx = int(np.argmax(deviations))

        results.append({
            "route": w.get("route", f"route-{idx}"),
            "anomalyScore": norm_score,
            "isAnomaly": norm_score > 0.60,
            "topContributingMetric": features[top_metric_idx],
            "method": "isolation-forest",
            "metrics": {
                "p95": float(w.get("p95", 0.0)),
                "errorRate": float(w.get("errorRate", 0.0)),
                "rps": float(w.get("rps", 0.0)),
                "memoryMb": float(w.get("memoryMb", 0.0))
            }
        })

    return results


def detect_anomalies(windows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Orchestrate anomaly detection: uses Isolation Forest when >= 20 windows exist,
    otherwise automatically falls back to robust Z-score analysis.
    """
    if len(windows) < 20:
        return compute_z_score_anomalies(windows)
    return compute_isolation_forest_anomalies(windows)
