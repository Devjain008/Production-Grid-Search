# EVOLVE Limitations & Technical Scope

This document provides a transparent accounting of the engineering boundaries, architectural constraints, and deliberate non-goals of the EVOLVE platform.

---

## 1. Targeted Language & Runtime Scope

- **Supported Runtime**: Strictly **Node.js (v18+)** and **Express.js** web applications.
- **Non-Goals**: EVOLVE does not currently support Python (Django/FastAPI), Go, Java (Spring Boot), Ruby on Rails, or Rust web servers.
- **Dependency Models**: Applications must declare dependencies via standard `package.json` files. Native C/C++ addons (e.g. `node-gyp` binaries) requiring custom host compilation toolchains are blocked by the sandbox security model.

---

## 2. Sandbox Hardware Bounds vs Production Clusters

- **Single-Core Resource Limit**: Sandboxes are bounded to 1 CPU core (`NanoCpus: 1_000_000_000`) and 512MB of RAM. While this isolates noisy-neighbor contention and enables reproducible benchmarking, it does not measure multi-core worker thread scaling (`cluster` module, PM2 cluster mode) or multi-pod Kubernetes orchestration.
- **Synthetic Load Generation**: The load profiles (autocannon / k6) simulate HTTP user concurrency up to 100 concurrent virtual users. They do not simulate complex network jitter, geographic WAN latency, or mobile packet loss.

---

## 3. Database & Distributed State Constraints

- **Proxy Workloads & Local Shims**: Benchmark runs connect to container-local mock datasets or isolated Docker databases (e.g. `mongodb://localhost:27017`).
- **Distributed Transactions**: Real-world distributed consensus, multi-region database replication delays, and sharded cluster partitioning cannot be fully reproduced within a single sandbox container.
- **External Third-Party APIs**: Applications that make mandatory outbound network calls to external third-party SaaS services (e.g. Stripe checkout, AWS S3, OAuth providers) will fail or time out under strict sandbox network isolation unless explicitly mocked or shimmed.

---

## 4. Reinforcement Learning Scope (Bandit vs Deep RL)

- **Contextual Bandit Formulation**: EVOLVE uses **LinUCB** and **Contextual Thompson Sampling** rather than deep reinforcement learning (e.g. PPO, SAC).
- **Rationale**:
  1. **Sample Efficiency**: Deep RL requires tens of thousands of environment interactions. Code optimization benchmarks cost 10–30 seconds per evaluation run, meaning only 5–20 decisions can be made per project.
  2. **Auditability**: Linear bandit weight vectors and Normal-Inverse-Gamma posteriors can be inspected, plotted, and statistically audited by human developers.
  3. **No Latent Policy Hallucinations**: Action masking ensures that nonsensical strategies (e.g. adding Redis caching to a synchronous crypto hashing function) are mathematically forbidden regardless of prior exploratory weights.

---

## 5. Architectural Monorepos & Multi-Tier Systems

- **Service Isolation**: In multi-folder or full-stack monorepos (e.g. containing `client/`, `server/`, `mobile/`), EVOLVE's smart heuristic detection selects the primary backend Express service folder. It does not load-test React/Next.js frontend rendering servers or background cron microservices simultaneously.
- **Database Migrations**: Patches that propose database schema migrations (e.g. creating indexes on SQL tables) require database administrator privileges that may not exist in production environments without manual review.
