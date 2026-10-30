# EVOLVE: Autonomous Sandboxed Node.js Benchmarking & Self-Healing Platform

**EVOLVE** is an end-to-end, closed-loop optimization platform for Node.js and Express microservices. It isolates untrusted uploaded repositories in secured, resource-bounded sandboxes, benchmarks non-functional performance under realistic synthetic loads, ranks bottlenecks via static and dynamic profiling, orchestrates AI agents to propose verified patches, decides statistically whether to accept or reject them, and learns optimal strategy selection over time using contextual bandits.

---

## Key Capabilities (Phases 1–6)

- **Hardened Sandboxing**: CPU (1 core), Memory (512MB), and PID (100) bounds via Linux cgroups v2; `CapDrop: ALL`, read-only root filesystem, unprivileged UID 1001, and process isolation.
- **Archive Ingestion Safety**: Strict Zip-Slip traversal rejection (`../`), symlink prohibition, decompression bomb caps (max 500 files / 50MB), executable binary blocking, and secrets redaction pass.
- **Non-Functional Profiling**: Continuous event-loop lag monitoring (`perf_hooks`), heap slope tracking, CPU flamegraphs (0x), and custom Semgrep bottleneck rules.
- **Stateful Multi-Agent Loop**: LangGraph orchestration with Patcher proposing code diffs, Critic filtering safety issues & reward hacking, functional test validation, and statistical load benchmarks.
- **Statistical Verdict Engine**: Mann-Whitney U significance testing ($p < 0.05$) across $n \ge 5$ runs with bootstrap confidence intervals, guarded error rates, and memory limits.
- **Persistent Experiment Memory**: Qdrant vector memory and MongoDB store linking AST context, normalized features, unified diffs, and lessons learned.
- **Contextual Bandit Policy**: LinUCB with Sherman-Morrison updates and Thompson sampling under action masking constraints, operating in `rule`, `shadow`, or `learned` modes.
- **Evaluation Matrix Harness**: Automated evaluation runner benchmarking 11 applications across 8 experimental conditions $\times$ 3 seeds ($N = 264$ trials).
- **Comprehensive Final Reports**: Multi-format technical reports (HTML, PDF, Markdown, JSON) featuring 12 standardized sections and a 1-page leadership summary with Wilson 95% confidence intervals.
- **Unified React Dashboard**: 8-tab accessible web application (Overview, Baseline, Defects, Optimize, Memory, Policy, Reports, Settings) with before/after p95 distribution charts and live SSE streaming.

---

## System Architecture

```text
evolve/
  docs/                         # In-depth architectural & operational documentation
    ARCHITECTURE.md             # System components, state machines, and protocols
    EVALUATION.md               # Benchmark matrix, reproduction steps, and conditions
    SECURITY.md                 # Threat model, sandbox containment, and upload guards
    API.md                      # Complete OpenAPI / REST specification
    LIMITATIONS.md              # Scope, non-goals, and technical constraints
    DEMO.md                     # 5-minute interactive demo script with talking points
  evaluation/                   # Evaluation harness & benchmark runner
    runner.js                   # Matrix runner (11 apps x 8 conditions x 3 seeds)
    results.json                # Raw experimental trial data
    results.csv                 # Tabular CSV export
    RESULTS_SUMMARY.md          # Formatted Markdown report
    figures/                    # Publication-quality vector SVG plots
  samples/                      # 11 Benchmark applications with verified GROUND_TRUTH.json
    buggy-shop/                 # E-commerce API (N+1 queries, sync hashing)
    blog-api/                   # Content API (unindexed search, missing pagination)
    auth-service/               # Identity provider (blocking pbkdf2Sync)
    analytics-collector/        # Event ingestion (unbounded memory leak)
    catalog-service/            # Inventory index (sync JSON file reads)
    notification-hub/           # Message broker (sequential outbound HTTP)
    payment-gateway/            # Financial processing (missing idempotency keys)
    chat-service/               # Real-time messaging (unbuffered message dispatch)
    inventory-tracker/          # Supply chain (unindexed array lookups)
    user-profile/               # Account settings (uncompressed payloads)
    open-source-micro-uncontrolled/ # Real-world uncontrolled microservice
  sandbox/
    Dockerfile.sandbox          # Hardened unprivileged container definition
    telemetry.js                # Event loop lag & memory telemetry sidecar
  analyzer/                     # Python FastAPI service, profiling & bandit policy
    main.py                     # Policy & anomaly API endpoints
    policy/                     # LinUCB, Thompson sampling, sim, evaluator
    tests/                      # Policy, scoring, and anomaly unit tests
  server/                       # Node.js / Express orchestrator
    src/
      server.js                 # API server and worker bootstrap
      agents/                   # LangGraph agent loop, patcher, critic, policy
      controllers/              # REST controllers (auth, projects, memory, reports)
      middleware/               # Upload guard, security headers, rate limiting, auth
      models/                   # User, Project, Run, DefectReport, Experiment, Report
      services/                 # SandboxRunner, LoadTester, Report, Redact, Reaper
    tests/                      # 16 Jest test suites (76 unit/integration tests)
  client/                       # React 18 / Vite single-page dashboard
    src/
      components/               # Overview, Baseline, Defects, Optimize, Memory, Policy, Reports
      App.jsx                   # Master 8-tab shell navigation
```

---

## Quickstart: 1-Command Demo

Seed the pre-configured demo project and view the interactive dashboard in seconds:

```bash
# 1. Ingest demo project, execute baseline, generate defects, and produce reports
npm run demo

# 2. Start the local server and client dashboard
npm run dev
```

Open **`http://localhost:3000`** in your browser. The demo project **`Demo: Buggy Shop E-Commerce API [DEMO DATA]`** is ready with before-vs-after metrics, defect rankings, rejected critic attempts, and downloadable reports.

For a step-by-step presentation walkthrough, see [DEMO.md](docs/DEMO.md).

---

## Evaluation Reproduction

To reproduce all 264 trials across the evaluation matrix:

```bash
# Fast dry run (deterministic CI verification, ~5 seconds)
npm run eval:dry

# Full containerized evaluation matrix (requires Docker)
npm run eval
```

Generated metrics and plots are stored in `evolve/evaluation/` (`results.json`, `results.csv`, `figures/p95_reduction.svg`, `figures/false_accept_rate.svg`). See [EVALUATION.md](docs/EVALUATION.md) for detailed condition specifications and statistics.

---

## Verification & Test Suite

### Node.js / Jest Test Suite (16 Suites, 76 Tests)
```bash
cd evolve/server
npm test
```
All 16 test suites pass with 100% test coverage:
1. `securityAndHardening.test.js` (JWT, PBKDF2, Zip-Slip, bomb protection, binary blocking, redaction, rate limiting)
2. `sandboxContainment.test.js` (UID 1001, CapDrop ALL, read-only rootfs, cgroups v2 limits, credential isolation)
3. `reportAndOwnership.test.js` (Multi-tenant project isolation, Wilson 95% CIs, 12-section multi-format generator)
4. `evalHarness.test.js` (Bootstrap confidence intervals, ground-truth consistency, 11 benchmark datasets)
5. `learnedPolicy.test.js` (Rule, shadow, and learned modes, FastAPI fallback, update dispatch)
6. `agentLoop.test.js` (LangGraph patcher, critic safety review, reward-hack rejection, diff sanitization)
7. `memoryPipeline.test.js` (Planted win rates, vector retrieval, negative failure lessons, idempotent reindexing)
8. `e2e.test.js` (End-to-end sandbox launch, route parsing, synthetic load testing, teardown)
9. `mernMonorepo.test.js` (Automatic nested Express service folder resolution from fullstack zip)
10. `monorepoResolve.test.js` (Smart package.json resolution across nested structures)
11. `metricsCompare.test.js` (Mann-Whitney U statistical significance, guarded metric regressions)
12. `reward.test.js` (Reward mathematical parity, clipping, inconclusive zero-reward)
13. `reflect.test.js` (Structured lesson generation from accepted and rejected runs)
14. `routeDetector.test.js` (AST route extraction from Express router definitions)
15. `nfrCapacity.test.js` (Non-functional requirement scorecard and capacity classification)
16. `sandboxRunner.test.js` (Dockerode container limits, health polling, clean teardown)

### Python / Bandit Policy Test Suite (10 Tests)
```bash
cd evolve/analyzer
python -m unittest test_policy.py test_scoring.py test_anomaly.py
```
Covers Normal-Inverse-Gamma conjugate posterior updates, LinUCB rank-1 updates, action masking, simulator convergence, offline IPS evaluation, and anomaly scores.

---

## Documentation Index

- [System Architecture & Protocols](docs/ARCHITECTURE.md)
- [Evaluation Matrix & Reproduction Guide](docs/EVALUATION.md)
- [Security Model & Sandbox Containment](docs/SECURITY.md)
- [Complete REST API Specification](docs/API.md)
- [Technical Limitations & Non-Goals](docs/LIMITATIONS.md)
- [5-Minute Interactive Demo Script](docs/DEMO.md)
