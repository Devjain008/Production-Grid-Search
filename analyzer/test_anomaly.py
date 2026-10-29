"""
Unit & Integration Tests for Anomaly Detection Microservice
"""

import pytest
from fastapi.testclient import TestClient
from main import app
from anomaly import detect_anomalies, compute_z_score_anomalies, compute_isolation_forest_anomalies

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_z_score_fallback_few_windows():
    # 5 windows (< 20 threshold triggers z-score fallback)
    windows = [
        {"route": "GET /health", "p95": 5.0, "errorRate": 0.0, "rps": 100.0, "memoryMb": 40.0},
        {"route": "GET /info", "p95": 8.0, "errorRate": 0.0, "rps": 95.0, "memoryMb": 42.0},
        {"route": "GET /users", "p95": 12.0, "errorRate": 0.01, "rps": 80.0, "memoryMb": 45.0},
        {"route": "GET /products", "p95": 15.0, "errorRate": 0.0, "rps": 70.0, "memoryMb": 50.0},
        # Extreme anomaly route: p95 = 950ms, errorRate = 0.45
        {"route": "POST /login", "p95": 950.0, "errorRate": 0.45, "rps": 12.0, "memoryMb": 280.0},
    ]

    results = detect_anomalies(windows)
    assert len(results) == 5
    assert results[0]["method"] == "z-score-fallback"

    # Find the login route
    login_anomaly = next(r for r in results if r["route"] == "POST /login")
    assert login_anomaly["anomalyScore"] > 0.70
    assert login_anomaly["topContributingMetric"] in ["p95", "errorRate", "memoryMb"]


def test_isolation_forest_many_windows():
    # 25 windows (>= 20 threshold triggers Isolation Forest)
    windows = []
    for i in range(24):
        windows.append({
            "route": f"GET /route-{i}",
            "p95": 10.0 + (i % 5),
            "errorRate": 0.01,
            "rps": 50.0 + (i % 10),
            "memoryMb": 50.0 + (i % 3)
        })

    # Add 1 distinct outlier anomaly
    windows.append({
        "route": "GET /orders-slow",
        "p95": 850.0,
        "errorRate": 0.35,
        "rps": 4.0,
        "memoryMb": 350.0
    })

    results = detect_anomalies(windows)
    assert len(results) == 25
    assert results[0]["method"] == "isolation-forest"

    # The outlier must have the highest anomaly score
    slow_anomaly = next(r for r in results if r["route"] == "GET /orders-slow")
    assert slow_anomaly["anomalyScore"] > 0.60


def test_api_post_anomaly_endpoint():
    payload = {
        "windows": [
            {"route": "GET /health", "p95": 5.0, "errorRate": 0.0, "rps": 100.0, "memoryMb": 30.0},
            {"route": "POST /login", "p95": 820.0, "errorRate": 0.25, "rps": 15.0, "memoryMb": 250.0}
        ]
    }
    response = client.post("/anomaly", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["anomalies"]) == 2
    # First anomaly in response should be the highest score
    assert data["anomalies"][0]["route"] == "POST /login"
