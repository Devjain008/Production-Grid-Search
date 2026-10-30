# EVOLVE REST API Specification

The EVOLVE platform exposes a RESTful JSON API accompanied by Server-Sent Events (SSE) streaming for long-running autonomous workflows.

---

## 1. Authentication & Security Headers

All protected endpoints require an HTTP Authorization header containing a valid JSON Web Token (JWT):

```http
Authorization: Bearer <JWT_TOKEN>
```

When multi-tenant authentication is active, project ownership is strictly checked on every project-scoped resource.

---

## 2. Authentication Endpoints

### `POST /api/auth/register`
Creates a new tenant user account.

- **Request Body**:
  ```json
  {
    "email": "developer@company.com",
    "password": "SecurePassword123!",
    "username": "dev_alex"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "660000000000000000000001",
      "email": "developer@company.com",
      "username": "dev_alex",
      "role": "user"
    }
  }
  ```

### `POST /api/auth/login`
Authenticates an existing tenant user and issues a JWT token.

- **Request Body**:
  ```json
  {
    "email": "developer@company.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "id": "660000000000000000000001", "email": "developer@company.com", "role": "user" }
  }
  ```

### `GET /api/user/export`
Exports all personal tenant data for GDPR compliance.

- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: Complete JSON archive of user profile, owned projects, baseline runs, and experiments.

---

## 3. Project Management Endpoints

### `POST /api/projects`
Uploads a new Node.js / Express codebase via zip archive or GitHub repository URL.

- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `projectZip`: Zip file (subject to Zip-Slip & bomb validation).
  - `repoUrl` (optional): Git repository URL.
  - `projectName` (optional): Display name.
  - `profile` (optional): Initial baseline profile (`load`, `stress`, `spike`, `soak`).
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "project": {
      "_id": "660000000000000000000002",
      "name": "E-Commerce API",
      "status": "ready",
      "detectedRoutes": [
        { "method": "GET", "path": "/orders", "line": 42 }
      ],
      "baselineRunId": "660000000000000000000003"
    }
  }
  ```

### `POST /api/projects/demo`
Seeds the instant pre-configured demo project (`Buggy Shop E-Commerce API`).

- **Response `201 Created`**: Initialized demo project with baseline run, defect reports, and experiments.

### `GET /api/projects`
Lists all projects accessible to the authenticated tenant.

- **Response `200 OK`**: Array of project summaries.

### `GET /api/projects/:id`
Retrieves project metadata, detected routes, and baseline status.

- **Response `200 OK`**: Full project entity.

### `DELETE /api/projects/:id`
Performs cascading deletion of a project, including all associated runs, defect reports, experiments, uploaded source files, and final report artifacts.

- **Response `200 OK`**: `{ "success": true, "message": "Project deleted." }`

---

## 4. Benchmarking & Runs

### `POST /api/projects/:id/baseline`
Triggers an isolated container baseline benchmark run.

- **Request Body**:
  ```json
  { "profile": "load" }
  ```
- **Response `202 Accepted`**:
  ```json
  { "success": true, "runId": "660000000000000000000004", "status": "queued" }
  ```

### `GET /api/runs/:id`
Retrieves the execution status and metrics scorecard of a benchmark run.

- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "run": {
      "_id": "660000000000000000000004",
      "status": "completed",
      "metrics": {
        "p50": 42.1,
        "p95": 148.6,
        "p99": 280.4,
        "rps": 84.5,
        "errorRate": 0.0,
        "eventLoopLagP95Ms": 18.2,
        "memoryMaxMb": 112.5
      },
      "nfrScorecard": {
        "verdict": "NEEDS_OPTIMIZATION",
        "overallScore": 72
      }
    }
  }
  ```

### `POST /api/runs/:id/virtual-request`
Simulates a live HTTP request to test a specific route through the UI playground.

---

## 5. Defect Analysis & Profiling

### `POST /api/projects/:id/analyze`
Executes ESLint security rules, custom Semgrep bottleneck patterns, and dynamic anomaly analysis.

- **Response `200 OK`**: Ranked list of defects with anomaly scores and suggested strategies.

### `GET /api/projects/:id/defects`
Retrieves the latest ranked defect report for a project.

### `GET /api/projects/:id/flamegraph`
Retrieves 0x / CPU flamegraph visualization data.

---

## 6. Autonomous Agent Optimization

### `POST /api/projects/:id/optimize`
Starts the multi-agent optimization loop (`LangGraph`).

- **Request Body**:
  ```json
  {
    "baselineRunId": "660000000000000000000004",
    "budget": 5,
    "policyMode": "learned"
  }
  ```
- **Response `202 Accepted`**:
  ```json
  { "success": true, "jobId": "opt-job-1714000000", "status": "queued" }
  ```

### `GET /api/optimize/:jobId`
Server-Sent Events (SSE) stream or JSON status tracker:
- `event: progress`: Current pipeline stage (`selectHotspot`, `patch`, `critic`, `benchmark`, `verdict`).
- `event: completed`: Optimization summary with accepted patches and performance deltas.

### `GET /api/optimize/:jobId/patch`
Downloads the cumulative unified diff (`optimized.patch`) containing all verified accepted patches.

---

## 7. Experiment Memory & Vector Store

### `POST /api/memory/similar`
Retrieves similar past defect resolutions and failure lessons using cosine similarity.

- **Request Body**:
  ```json
  {
    "hotspot": { "category": "performance", "function": "getOrders" },
    "features": { "staticSeverity": 5, "hotness": 45.0 },
    "strategy": "batch",
    "k": 5,
    "onlyFailures": false
  }
  ```
- **Response `200 OK`**: Top-$k$ nearest neighbor experiment records.

### `GET /api/memory/stats`
Retrieves empirical win rates and mean rewards grouped by Strategy $\times$ Category.

### `GET /api/memory/policy-data`
Retrieves clean training vectors for contextual bandit policies where `excludeFromPolicy = false`.

---

## 8. Final Report Generator

### `POST /api/reports`
Generates comprehensive 12-section technical and leadership reports.

- **Request Body**:
  ```json
  {
    "projectId": "660000000000000000000002",
    "jobId": "opt-job-1714000000",
    "formats": ["html", "pdf", "md", "json"]
  }
  ```
- **Response `201 Created`**: URLs and file paths for generated artifacts.

### `GET /api/reports/:id/download?format=pdf`
Downloads the generated report artifact in the requested format (`html`, `pdf`, `md`, `json`).

---

## 9. Contextual Bandit Policy API (FastAPI `/policy`)

### `POST /policy/select`
Selects an optimization strategy arm conditioned on normalized defect feature vector:
- **Request**: `{ "features": [0.5, 0.2, ...], "hotspot_category": "performance", "mode": "learned" }`
- **Response**: `{ "strategy": "batch", "arm_index": 2, "probabilities": {...}, "mode": "learned" }`

### `POST /policy/update`
Dispatches an asynchronous reward update to refine LinUCB/Thompson posterior distributions.
- **Request**: `{ "features": [...], "strategy": "batch", "reward": 0.82 }`
- **Response**: `{ "success": true }`
