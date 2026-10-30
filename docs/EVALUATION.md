# EVOLVE Evaluation & Reproduction Guide

This guide details the evaluation methodology, experimental conditions, reproduction commands, and data structures used to benchmark EVOLVE across 11 diverse Node.js / Express microservice workloads.

---

## 1. Evaluation Matrix

The evaluation suite executes a systematic matrix across **11 benchmark applications**, **8 experimental conditions**, and **3 independent seeds** ($11 \times 8 \times 3 = 264$ trials).

### 1.1 Benchmark Applications (`samples/`)

| # | Application | Domain | Architectural Bottleneck | Verified Ground Truth |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `buggy-shop` | E-Commerce API | N+1 database queries on `/orders`, synchronous hashing | `GROUND_TRUTH.json` |
| 2 | `blog-api` | Content Platform | Unindexed search queries, missing pagination | `GROUND_TRUTH.json` |
| 3 | `auth-service` | Identity Provider | Blocking `pbkdf2Sync` inside high-throughput `/login` | `GROUND_TRUTH.json` |
| 4 | `analytics-collector` | Event Ingestion | Unbounded memory store leaking events | `GROUND_TRUTH.json` |
| 5 | `catalog-service` | Inventory Index | Synchronous JSON file parsing on read queries | `GROUND_TRUTH.json` |
| 6 | `notification-hub` | Message Broker | Sequential outbound HTTP requests without connection pooling | `GROUND_TRUTH.json` |
| 7 | `payment-gateway` | Financial Processing | Missing idempotency keys, sync encryption routines | `GROUND_TRUTH.json` |
| 8 | `chat-service` | Real-time Messaging | High event-loop lag due to unbuffered message dispatch | `GROUND_TRUTH.json` |
| 9 | `inventory-tracker` | Supply Chain | Unbounded array searches without hash index | `GROUND_TRUTH.json` |
| 10 | `user-profile` | Account Settings | Heavy uncompressed JSON payload delivery | `GROUND_TRUTH.json` |
| 11 | `open-source-micro-uncontrolled` | Public Microservice | Uncontrolled real-world sample without artificial defects | `GROUND_TRUTH.json` |

---

## 2. Experimental Conditions

1. **`B1` (Unoptimized Baseline)**: Raw application under load with no optimizations applied.
2. **`B2` (Heuristic Rule-Based)**: Static rules and lint-level heuristics applying deterministic strategy mappings.
3. **`B3` (Unconstrained LLM)**: Generative code patching without the Critic safety filter or statistical verification gates.
4. **`FULL` (EVOLVE Rule-Based Policy)**: Full multi-agent loop with Critic review, statistical verification, and vector memory, using the deterministic rule policy.
5. **`FULL+L` (EVOLVE Learned Policy)**: Full multi-agent loop using the online contextual bandit policy (Thompson sampling + LinUCB) trained on past experiment memory.
6. **`ABL_NO_MEMORY` (Ablation: Memory Disabled)**: EVOLVE agent loop operating with vector memory disabled ($k=0$ similar cases, no failure lessons).
7. **`ABL_NO_CRITIC` (Ablation: Critic Disabled)**: EVOLVE agent loop bypassing Critic diff safety review directly to benchmark execution.
8. **`ABL_CONTEXT_FREE` (Ablation: Context-Free Bandit)**: Multi-armed bandit policy choosing strategies without conditioning on defect context features.

---

## 3. Reproduction Commands

### 3.1 Fast Dry Run (Deterministic CI Verification)
Simulates the evaluation matrix using synthetic ground-truth response models to verify pipeline integrity in ~5 seconds without Docker requirements:

```bash
# Run from repository root
npm run eval:dry

# Or directly via node
node evolve/evaluation/runner.js --dry
```

### 3.2 Full Benchmark Execution (Production Sandboxes)
Executes full containerized benchmarks with real load-generation against live Docker sandboxes:

```bash
# Ensure Docker daemon and MongoDB are active
docker compose up -d

# Run full evaluation matrix across all 11 applications
npm run eval

# Run with custom budget or seed subset
node evolve/evaluation/runner.js --seeds 42,107 --budget 5
```

---

## 4. Output Artifacts

Running the evaluation runner automatically populates the following artifacts in `evolve/evaluation/`:

1. **`results.json`**: Complete raw metrics for every trial (p95 latency, RPS, memory, error rates, false acceptances, sample size $n$, runtime).
2. **`results.csv`**: Tabular CSV export suitable for ingestion into R, Pandas, or Jupyter notebooks.
3. **`figures/p95_reduction.svg`**: Publication-quality vector bar chart illustrating p95 latency reduction (%) across all conditions with 95% bootstrap error bars.
4. **`figures/false_accept_rate.svg`**: Vector bar chart depicting false accept rate (%) comparing unconstrained baselines against EVOLVE's statistical verdict.
5. **`RESULTS_SUMMARY.md`**: Formatted Markdown report detailing condition means, standard deviations, and bootstrap confidence intervals.

---

## 5. Statistical Rigor & Data Integrity

- **Sample Size**: Each benchmark measurement represents at least $n \ge 5$ independent load-test runs per condition-seed tuple.
- **Bootstrap Confidence Intervals**: 95% confidence intervals are computed using 1,000 bootstrap resamples ($B=1000$).
- **No Manual Imputation**: All summary tables and figures are generated directly from `results.json` without hardcoded constants.
- **Labeling Standard**: Artifacts produced under `--dry` mode are explicitly stamped with `[DRY RUN / MOCK DATA]`, while full container runs are labeled `[REAL BENCHMARK DATA]`.
