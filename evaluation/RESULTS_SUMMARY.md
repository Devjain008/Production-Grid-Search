# EVOLVE Empirical Evaluation Results
**Generated**: 2026-10-30T03:22:33.284Z | **Status**: `[MOCK / DRY RUN]` | **Total Trials ($N$)**: 264
**Benchmark Apps ($M$)**: 11 (analytics-collector, auth-service, blog-api, buggy-shop, catalog-service, chat-service, inventory-tracker, notification-hub, open-source-micro-uncontrolled, payment-gateway, user-profile)

> [!IMPORTANT]
> **Data Authenticity Notice**:
> All numbers presented below derive strictly from `evaluation/results.json` generated across >= 3 random seeds per condition.
> Confidence intervals represent **bootstrap 95% CIs** over $B=500$ resamples.
> Mode: **[MOCK / DRY RUN]**.

---

## 1. Primary Performance Comparison Across Conditions
| Condition | Description | Relative P95 Reduction (%) [95% CI] | Accepted Patch Rate [95% CI] | False-Accept Rate (Held-Out) [95% CI] | Tokens / Accepted Patch | Bench Runs / Patch |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **B1** | Unit Tests Only (No Benchmarks) | **8.3%** [7.863, 8.713] | 87.9% | **38.5%** [HIGH RISK] | 1844 | 1.5 |
| **B2** | Random Strategy + Full Validation | **16.1%** [15.643, 16.487] | 21.9% | 3.5% | 4434 | 5.5 |
| **B3** | Greedy Strategy + Full Validation | **24%** [23.613, 24.417] | 41.8% | 4.5% | 2954 | 5.5 |
| **FULL** | Rule-Based Policy (Full System) | **38.5%** [38.077, 38.857] | 67.9% | **2.5%** | 1844 | 5.5 |
| **FULL+L** | **Learned Policy (Contextual Bandit)** | **43.7%** [43.207, 44.053] | **73.9%** | **2.0%** | **1567** | **5.5** |

---

## 2. Component Ablations
| Ablation | Localization Recall | P95 Latency Reduction (%) | False-Accept Rate | Tokens Spent / Win | Key Takeaway |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ABL_NO_MEMORY** | 100.0% | 33.1% | 3.5% | 2492 | Forgetting past failures repeats doomed strategies on similar functions. |
| **ABL_NO_CRITIC** | 100.0% | 35% | 8.5% | 3324 | Critic removes syntactically broken patches early, saving 44% in compute tokens. |
| **ABL_CONTEXT_FREE**| 100.0%| 37.3% | 3.0% | 2029 | Ignoring feature context slows discovery on cross-cutting bottlenecks. |

---

## 3. Localization Accuracy
- **Mean Recall**: **100.0%** vs Injected Ground Truth
- **Mean Precision**: **84.3%**
- **Top-3 Hit Rate**: **100%** (Bottleneck ranked in top 3 in all controlled benchmark suites)

---

## 4. Figures
- Latency Reduction Bar Chart: `evaluation/figures/p95_reduction.svg`
- False Accept Rate Comparison: `evaluation/figures/false_accept_rate.svg`
