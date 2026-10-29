# EVOLVE: Autonomous Sandboxed Node.js Benchmarking & Optimization Platform

EVOLVE is a closed-loop engineering platform designed to accept untrusted Node.js/Express projects, execute them inside hardened sandboxes with resource bounds, discover endpoints, simulate virtual user traffic, and synthesize rigorous baseline performance profiles.

---

## Architecture (Phase 1: Upload + Sandbox + Baseline)

- **Frontend**: React (Vite) + Tailwind CSS + Lucide Icons + Recharts
- **Backend Orchestrator**: Node.js, Express, BullMQ, Redis, Mongoose, MongoDB
- **Sandbox Engine**: Dockerode container runner with CPU (1 Core), Memory (512MB), PID (100), and network isolation constraints; includes secured process isolation fallback for local execution.
- **Route Discovery**: AST-based Express route parser with `@babel/parser` and `@babel/traverse`.
- **Load Generation**: Autocannon pure-JS engine + automated k6 script generator supporting `load`, `stress`, `spike`, and `soak` scenarios.
- **Telemetry Sidecar**: `perf_hooks` event loop lag monitor attached into process execution without source code mutation.

---

## Directory Structure

```text
evolve/
  .env.example                  # Environment configuration template
  docker-compose.yml            # Multi-service stack (Mongo, Redis, Server, Client)
  README.md                     # Architecture and verification guide
  sandbox/
    Dockerfile.sandbox          # Hardened unprivileged container definition
    telemetry.js                # Event loop lag & memory telemetry sidecar
  load-scripts/
    base-profiles.js            # Load, stress, spike, and soak test configurations
    k6-generator.js             # AST-to-k6 script generator
  samples/
    buggy-express-app/          # Sample Express app with injected bugs
      server.js                 # N+1 query, sync hash, memory leak, unindexed scan
      package.json
      test/app.test.js          # Functional acceptance test
  server/
    Dockerfile
    package.json
    jest.config.js
    src/
      server.js                 # API server and worker bootstrap
      config/                   # Mongo, Redis, Docker, and environment config
      models/                   # Project, Run, and Experiment Mongoose schemas
      queues/                   # BullMQ queue managers
      services/                 # SandboxRunner, LoadTester, RouteDetector, MetricsCompare
      workers/                  # BullMQ Sandbox and Loadtest worker consumers
      controllers/              # Project and Run REST endpoints
      routes/                   # Express router definitions
    tests/
      sandboxRunner.test.js     # Container limits, isolation, and lifecycle tests
      metricsCompare.test.js    # Mann-Whitney U, variance, and guarded regressions tests
      routeDetector.test.js     # AST route extraction tests
  client/
    Dockerfile
    package.json
    vite.config.js
    index.html
    src/
      main.jsx
      App.jsx                   # Master dashboard view with live polling
      components/
        Header.jsx              # Navigation and status
        UploadCard.jsx          # Zip upload, GitHub URL, and profile picker
        BaselineReport.jsx      # Metrics cards, step progression, route table
        MetricsCharts.jsx       # Recharts latency distribution and resource timeline
        ProjectList.jsx         # Project history and baseline switcher
```

---

## How to Run

### Option A: Local Development Mode (Step-by-Step)

1. **Install Dependencies**:
   ```bash
   # Server
   cd evolve/server
   npm install

   # Client
   cd ../client
   npm install

   # Sample App
   cd ../samples/buggy-express-app
   npm install
   ```

2. **Configure Environment**:
   ```bash
   cd evolve
   cp .env.example .env
   ```

3. **Start MongoDB and Redis**:
   ```bash
   docker run -d -p 27017:27017 --name evolve-mongo mongo:7.0
   docker run -d -p 6379:6379 --name evolve-redis redis:7-alpine
   ```

4. **Start Server**:
   ```bash
   cd evolve/server
   npm start
   ```

5. **Start Client Dashboard**:
   ```bash
   cd evolve/client
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

### Option B: Docker Compose

```bash
cd evolve
docker-compose up --build
```
Client dashboard will be available at `http://localhost:3000`, API at `http://localhost:5000`.

---

## How to Test

### 1. Run Unit Tests (Sandbox, Metrics Comparison, Route Parser)

```bash
cd evolve/server
npm test
```

### 2. Functional Acceptance Test on Buggy Express Sample

```bash
cd evolve/samples/buggy-express-app
npm test
```

### 3. End-to-End Baseline Test

1. Create a zip of `evolve/samples/buggy-express-app`.
2. Open the EVOLVE dashboard at `http://localhost:3000`.
3. Drag & drop `buggy-express-app.zip` and select the **Standard Load** profile.
4. Click **Run Baseline Benchmark**.
5. Observe the live progression:
   - Route AST discovery identifies 6 routes (`/health`, `/api/info`, `/api/users`, `/api/auth/login`, `/api/analytics/events`, `/api/items/search`).
   - Sandbox runner boots container with CPU, Memory, and PID caps.
   - Health check polls until ready.
   - Autocannon / k6 executes load scenario.
   - Latency percentiles (p50, p95, p99), RPS, error rate, and event-loop lag are displayed in the baseline report.
