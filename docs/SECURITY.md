# EVOLVE Security Specification & Threat Model

EVOLVE is designed to execute and benchmark **untrusted, third-party codebases** submitted by multi-tenant users. This document details the defense-in-depth security model, sandbox containment boundaries, input sanitation guards, and authentication controls.

---

## 1. Threat Model & Trust Boundaries

```
[Untrusted Client / Network]
             │
             ▼ (JWT Auth + Rate Limiting + Upload Guards)
[EVOLVE Core Server & Host System]  <─── High Trust / Protected Boundary
             │
             ▼ (Docker API / Unix Socket)
[Hardened Docker Container]         <─── Low Trust / Untrusted Code Boundary
   ├── Non-root UID 1001
   ├── Read-Only Root Filesystem
   ├── Dropped Capabilities (ALL)
   ├── 1 CPU / 512MB RAM / 100 PIDs
   └── Ephemeral tmpfs Mounts
```

### Potential Attack Vectors
1. **Container Breakout & Host Compromise**: Malicious target app invokes native binary exploits to escape Docker container.
2. **Denial of Service / Fork Bomb**: Target code spawns infinite child processes or consumes infinite memory to starve the host.
3. **Data Exfiltration / SSRF**: Target code connects to host metadata endpoints (`169.254.169.254`), internal databases, or external botnets.
4. **Archive Poisoning (Zip-Slip)**: Target zip archive contains relative path traversals (`../../etc/passwd`) or symlinks targeting host files.
5. **Credential Leakage**: Host secrets, API keys, or database credentials exposed to sandbox environments or user reports.

---

## 2. Hardened Sandbox Containment

Every benchmarked application is isolated inside a dedicated container provisioned via `dockerode` adhering to strict security constraints:

### 2.1 Kernel Capabilities & Privileges
- **All Capabilities Dropped**: `CapDrop: ['ALL']` strips every Linux capability (`CAP_SYS_ADMIN`, `CAP_NET_ADMIN`, `CAP_RAW_NET`, etc.).
- **No Privilege Escalation**: `SecurityOpt: ['no-new-privileges:true']` prevents `setuid` binaries from gaining elevated privileges.
- **Unprivileged User**: Executed strictly as UID 1001 / GID 1001 (`evolve`). The root user never executes untrusted code.

### 2.2 Filesystem Immutability
- **Read-Only Root Filesystem**: `ReadonlyRootfs: true` ensures the container's base filesystem cannot be written or modified.
- **Ephemeral Scratch Mounts**: Only memory-backed `tmpfs` mounts (`/tmp` and `/run`) are writable, with size limits capped at 64MB.

### 2.3 Resource Quotas (cgroups v2)
- **CPU Quota**: Restricted to 1 CPU core (`NanoCpus: 1_000_000_000`, `CpuPeriod: 100_000`, `CpuQuota: 100_000`).
- **Memory Quota**: Hard limit of 512MB RAM (`Memory: 536_870_912`, `MemorySwap: 536_870_912` to prevent swap exhaustion).
- **Anti-Fork Bomb**: Hard process limit of 100 PIDs (`PidsLimit: 100`).

### 2.4 Network Isolation
- Containers operate with network isolation during benchmarking.
- Only a single ephemeral unprivileged port is mapped to loopback (`127.0.0.1`) strictly for synthetic load test injection and telemetry harvesting.

---

## 3. Upload & Archive Safety (`uploadGuard.js`)

Before any archive is unpacked, the raw zip payload undergoes multi-stage validation:

1. **Zip-Slip Traversal Guard**: Every entry path is normalized and verified. Any entry containing `../`, absolute paths (`/etc/`), or Windows drive letters (`C:\`) is immediately rejected.
2. **Symlink Prohibition**: Any archive entry possessing Unix symlink mode bits (`mode & 0o120000 === 0o120000`) is rejected.
3. **Decompression Bomb Protection**:
   - Maximum uncompressed size: **50 MB**.
   - Maximum file count: **500 files**.
4. **Binary & Executable Blocking**:
   - Rejects any file ending with `.exe`, `.dll`, `.so`, `.sh`, `.bat`, `.cmd`, `.bin`, `.elf`, or `.com`.
   - Rejects hidden executable bits in file permissions.

---

## 4. Multi-Tenant Authentication & Access Control

### 4.1 Cryptographic Password Hashing
- **Algorithm**: PBKDF2 (Password-Based Key Derivation Function 2).
- **Parameters**: HMAC-SHA512, 100,000 iterations, 32-byte cryptographically secure random salt (`crypto.randomBytes(32)`).
- **Execution**: Fully asynchronous execution preventing event-loop stalls during authentication.

### 4.2 Stateless Session Management (JWT)
- **Algorithm**: HMAC-SHA256 with constant-time verification.
- **Expiration**: Standard 24-hour expiration with cryptographic signature validation.

### 4.3 Per-User Ownership Verification
- Every project record maintains an `ownerId` foreign key.
- `requireProjectOwnership` middleware verifies that the authenticated user owns the requested resource before allowing access to runs, defect reports, patches, or optimization controls.

---

## 5. Information Hygiene & Secrets Redaction (`redact.js`)

All runtime logs, unified diffs, telemetry streams, and error traces are scrubbed through a multi-pattern regex sanitizer before storage:
- **API Keys**: OpenAI, Anthropic, Google Gemini, and Stripe key formats (`sk-`, `AIza`, `pk_`).
- **Authorization Headers**: Bearer tokens, basic auth credentials.
- **Database Connection URIs**: Passwords scrubbed from `mongodb://`, `postgres://`, `mysql://`, `redis://`.
- **Environment Variables**: Scrubbed from child process environments; sandbox containers receive isolated dummy environment definitions.

---

## 6. Denial-of-Service Defense: Sliding-Window Rate Limiting

- In-memory sliding-window rate limiter (`createRateLimiter`).
- Automatically throttles high-frequency abusive clients (returning HTTP 429 `TooManyRequests`).
- Configurable per-IP rate limits across sensitive endpoints (`/api/projects`, `/api/projects/:id/optimize`).
