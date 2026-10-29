# EVOLVE Policy Learning Engine

## 1. Problem Formulation
EVOLVE formulates software performance optimization as a multi-armed contextual bandit problem with safety constraints and staged learning:
- **Decision point**: When an engineering bottleneck (hotspot) is identified, choose an optimization strategy.
- **Arms $\mathcal{A}$**: `cache`, `index`, `batch`, `async`, `pool`, `pagination`, `compression` (7 discrete strategies).
- **Context $x \in \mathbb{R}^d$**: Normalized feature vector from static analysis, profiler, and runtime telemetry ($d=16$ in `featureVersion: 1`).
- **Reward $r \in [-1, 1]$**: Scalar reward from controlled benchmarks:
  $$r = w_1 \frac{L_{\text{base}} - L_{\text{cand}}}{L_{\text{base}}} - w_2 \max(0, E_{\text{cand}} - E_{\text{base}}) - w_3 \frac{\max(0, \text{Mem}_{\text{cand}} - \text{Mem}_{\text{base}})}{\text{Mem}_{\text{base}}} - w_4 [\text{tests fail}]$$
- **Dataset**: Only validated experiments with `excludeFromPolicy = false` and matching `featureVersion` are admitted to training logs. Inconclusive and errored experiments are filtered.

---

## 2. Policy Progression (Staged Router)
Because real software benchmarks are expensive and cold-start data is scarce, EVOLVE employs a staged policy router:

```
[Cold Start: N < 40]             [Contextual: N >= 40]             [Stage C (Future)]
Thompson Sampling (NIG)   -->    LinUCB / Contextual Thompson  -->  PPO / DQN (Bandit)
Per-category Gaussian            Disjoint ridge linear models       Offline policy opt
Mild rule-seeded prior           Active feature exploration         Requires N >= 500
```

1. **Stage A - Context-Free Thompson Sampling ($N < N_B$, default 40)**:
   - Models Gaussian rewards with a conjugate **Normal-Inverse-Gamma (NIG)** posterior per $(\text{category}, \text{arm})$:
     $$(\mu, \kappa, \alpha, \beta)$$
   - Seeded with a mild prior centered on the rule-based suggested strategy (prior weight $\kappa_0 = 2.0$), preventing disastrous early exploration while naturally decaying as empirical data accumulates ($n \to \infty$).
2. **Stage B - LinUCB & Contextual Thompson ($N \ge N_B$)**:
   - Disjoint linear model per arm: $\mathbb{E}[r \mid x, a] = x^\top \theta_a$.
   - Ridge regularization matrix $A_a = D^\top D + \lambda I_d$, vector $b_a = D^\top r$.
   - Solved via Cholesky decomposition ($A_a = L L^\top$) for numerical stability without explicit matrix inversions in hot paths.
   - Features an $\epsilon$-floor ($\epsilon = 0.05$) for continuous exploration and propensity logging for off-policy evaluation.
3. **Stage C - Deep RL / Offline Policy Optimization ($N \ge 500$)**:
   - `train_ppo.py` trains offline on logged transitions $(x, a, r, p)$ using Doubly-Robust (DR) off-policy evaluation guards.
   - Disabled by default until empirical sample size passes the $N_C$ threshold.

---

## 3. Action Masking and Safety
An arm $a$ is masked ($\mathcal{M}(x) = 0$) under the following conditions:
1. **Structural incompatibility**: e.g., `index` masked when the hotspot contains no database queries; `pagination` masked when the route is not a collection.
2. **Repeated failure history**: Any arm that has failed $\ge 2$ times on this exact hotspot is masked.
3. **Safety floor filter**: Arms whose 95% posterior upper confidence bound (UCB) on reward is below $\text{SAFE\_FLOOR} = -0.30$ with $n \ge 5$ are pruned.
4. **All-masked escape**: If all arms are masked, returns `arm="none"` with diagnostic reason to cleanly skip the hotspot without looping.
