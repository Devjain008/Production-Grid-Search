# EVOLVE 5-Minute Interactive Demo Script

This script walks through a live, end-to-end demonstration of the EVOLVE platform using the pre-seeded `Buggy Shop E-Commerce API` project.

---

## 1. Quick Setup (15 Seconds)

Run the demo seed command from the repository root:

```bash
# Ingests sample codebase, executes baseline, generates defect rankings, and produces reports
npm run demo
```

Now start the development server and frontend:

```bash
npm run dev
```

Open your browser to **`http://localhost:3000`**. The demo project **`Demo: Buggy Shop E-Commerce API [DEMO DATA]`** is automatically active.

---

## 2. Interactive Tour & Talking Points

### Minute 1: Project Overview & The Non-Functional Gap
- **View**: Click **Overview** in the sidebar.
- **Talking Point**:
  > *"Developers test functional requirements with unit tests, but non-functional performance defects (N+1 queries, synchronous event-loop blocks, unbounded memory leaks) silently escape to production. EVOLVE provides autonomous non-functional verification."*
- **Key Visuals**:
  - Point to the **Pipeline Stepper**: Upload $\to$ Baseline $\to$ Analysis $\to$ Optimization $\to$ Verified Final Report.
  - Show the **Before vs After Distribution Panel**: Baseline p95 was **148.6 ms**; compounded accepted patches lowered tail latency to **68.5 ms** (a **53.9% reduction**), backed by $n \ge 5$ runs with 95% bootstrap confidence intervals.
  - Mention the **Capacity Classification**: System went from *Bottlenecked* under 20 concurrent users to *High Throughput* capable of 250+ RPS.

---

### Minute 2: Ranked Bottlenecks & Static Analysis
- **View**: Click **Defects** in the sidebar.
- **Talking Point**:
  > *"Instead of generating generic suggestions, EVOLVE combines AST-level Semgrep security and performance rules with dynamic runtime flamegraph profiling."*
- **Key Visuals**:
  - Show the **Ranked Defect Table**:
    1. **Rank 1**: N+1 simulated query loop in `server.js:42` (Category: `performance`, Anomaly Score: `0.92`, Suggested Strategy: `batch`).
    2. **Rank 2**: Synchronous password hashing `pbkdf2Sync` inside request handler blocking the event loop (Lag: `48ms`, Suggested Strategy: `async`).
    3. **Rank 3**: Unbounded memory store leaking customer analytics events (Suggested Strategy: `pool`/`cache`).
  - Click on any row to expand the source code snippet and evidence details.

---

### Minute 3: The Multi-Agent Optimization Loop
- **View**: Click **Optimize** in the sidebar.
- **Talking Point**:
  > *"Unlike naive LLM code assistants that blindly propose changes, EVOLVE uses a stateful LangGraph agent loop with strict checks: Patcher proposes, Critic scrutinizes, functional tests verify, and a statistical load test decides."*
- **Key Visuals**:
  - Point out the **Critic Safety Filter**: Show how an unconstrained patch attempting an early return or memory cache without a TTL is flagged:
    `[CRITIC REJECTED] In-memory caching without explicit write invalidation causes stale reads on updated products.`
  - Highlight the **Statistical Verdict**: Patch accepted only because p95 improved by > 15% with Mann-Whitney $p < 0.05$ and zero error regressions.

---

### Minute 4: Contextual Bandit Learning & Experiment Memory
- **View**: Click **Memory**, then **Policy**.
- **Talking Point**:
  > *"Every attempt, whether accepted or rejected, is committed to vector memory. Over time, EVOLVE learns which strategy works for which bottleneck without expensive deep RL retraining."*
- **Key Visuals**:
  - In **Memory**: Show the Strategy $\times$ Category win rate matrix (e.g. `batch` wins ~80% on N+1 performance bottlenecks; `cache` fails on write-heavy routes).
  - In **Policy**: Switch between `Rule`, `Shadow`, and `Learned` modes. Point out the LinUCB feature weights and action masking rules that prevent nonsensical proposals. Note the explicit `[SIMULATED]` vs `[EMPIRICAL]` badges.

---

### Minute 5: Defensible Final Report & Sandbox Guarantees
- **View**: Click **Reports**, then **Settings**.
- **Talking Point**:
  > *"Every engineering optimization must be defensible to leadership and safe to run on untrusted tenant repositories."*
- **Key Visuals**:
  - In **Reports**: Review the 12-section final report with the 1-page leadership summary, Wilson 95% confidence intervals, and 1-click downloads for PDF, HTML, Markdown, and JSON.
  - In **Settings**: Highlight the sandbox containment guarantees: cgroups v2 resource bounds (1 CPU, 512MB RAM), `CapDrop: ALL`, read-only root filesystem, non-root UID 1001, and Zip-Slip archive validation.
  - Demonstrate the **GDPR Data Export** button and **Delete Project** cascading wipe.
