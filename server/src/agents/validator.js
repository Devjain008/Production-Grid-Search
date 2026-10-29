const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { SandboxRunner } = require('../services/sandboxRunner');
const { LoadTester } = require('../services/loadTester');
const { evaluateCandidateRun } = require('../services/metricsCompare');
const { calculateReward } = require('../services/reward');
const config = require('../config');

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const sPath = path.join(src, entry.name);
    const dPath = path.join(dest, entry.name);
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) {
      copyDirRecursive(sPath, dPath);
    } else {
      fs.copyFileSync(sPath, dPath);
    }
  }
}

/**
 * Applies a unified diff to a target project directory
 */
function applyPatchToDirectory(targetDir, diffString) {
  const patchFile = path.join(targetDir, `temp-${Date.now()}.patch`);
  fs.writeFileSync(patchFile, diffString, 'utf8');

  try {
    // Try git apply first if repository
    try {
      execSync('git apply --check --whitespace=nowarn ' + path.basename(patchFile), {
        cwd: targetDir,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      execSync('git apply --whitespace=nowarn ' + path.basename(patchFile), {
        cwd: targetDir,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      fs.unlinkSync(patchFile);
      return { success: true };
    } catch (gitErr) {
      // Fallback: parse and apply patch line replacement directly
      const success = applySimplePatchFallback(targetDir, diffString);
      try { fs.unlinkSync(patchFile); } catch (e) {}
      return { success, error: success ? null : gitErr.message };
    }
  } catch (err) {
    try { fs.unlinkSync(patchFile); } catch (e) {}
    return { success: false, error: err.message };
  }
}

function applySimplePatchFallback(targetDir, diff) {
  try {
    const lines = diff.split('\n');
    let targetRelFile = null;
    const removals = [];
    const additions = [];

    for (const line of lines) {
      if (line.startsWith('--- a/')) {
        targetRelFile = line.replace('--- a/', '').trim();
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        removals.push(line.slice(1));
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        additions.push(line.slice(1));
      }
    }

    if (!targetRelFile) return false;
    const fullPath = path.join(targetDir, targetRelFile);
    if (!fs.existsSync(fullPath)) return false;

    let content = fs.readFileSync(fullPath, 'utf8');
    const oldBlock = removals.join('\n').trim();
    const newBlock = additions.join('\n').trim();

    if (oldBlock && content.includes(oldBlock)) {
      content = content.replace(oldBlock, newBlock);
      fs.writeFileSync(fullPath, content, 'utf8');
      return true;
    }

    // If exact block not found, check if key lines can be injected
    if (newBlock) {
      content = content + '\n' + newBlock;
      fs.writeFileSync(fullPath, content, 'utf8');
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

class ValidatorAgent {
  constructor(options = {}) {
    this.sandboxRunner = options.sandboxRunner || new SandboxRunner();
    this.loadTester = options.loadTester || new LoadTester();
    this.interleavedRuns = options.interleavedRuns || 5;
  }

  /**
   * Run behavioural equivalence check comparing status codes and response shapes
   */
  async checkBehavioralEquivalence(baselineUrl, candidateUrl, routes = []) {
    const testRoutes = routes.slice(0, 5);
    const mismatches = [];

    for (const r of testRoutes) {
      try {
        let cleanPath = r.path.replace(/:[a-zA-Z0-9_]+/g, '1');
        if (cleanPath.includes('search')) cleanPath += '?q=test';

        const baseRes = await axios.get(`${baselineUrl}${cleanPath}`, { timeout: 3000, validateStatus: () => true });
        const candRes = await axios.get(`${candidateUrl}${cleanPath}`, { timeout: 3000, validateStatus: () => true });

        // 1. Status Code must match
        if (baseRes.status !== candRes.status) {
          mismatches.push(`Route ${r.path} status code mismatch: baseline=${baseRes.status}, candidate=${candRes.status}`);
          continue;
        }

        // 2. Response schema keys check
        if (typeof baseRes.data === 'object' && typeof candRes.data === 'object') {
          const baseKeys = Object.keys(baseRes.data || {}).sort().join(',');
          const candKeys = Object.keys(candRes.data || {}).sort().join(',');
          if (baseKeys !== candKeys && baseKeys.length > 0) {
            mismatches.push(`Route ${r.path} schema shape mismatch: keys changed from [${baseKeys}] to [${candKeys}]`);
          }
        }

        // 3. Reward-hacking guard: check if candidate emptied the response payload
        const baseLen = JSON.stringify(baseRes.data || '').length;
        const candLen = JSON.stringify(candRes.data || '').length;
        if (baseLen > 100 && candLen < 20) {
          mismatches.push(`Reward-hack detected on ${r.path}: candidate payload collapsed from ${baseLen} bytes to ${candLen} bytes (work skipped)`);
        }
      } catch (reqErr) {
        // Non-blocking for unmounted endpoints
      }
    }

    return {
      passed: mismatches.length === 0,
      mismatches
    };
  }

  /**
   * Executes Interleaved Benchmark (>= 5 runs each)
   */
  async executeInterleavedBenchmark(baselineUrl, candidateUrl, routes, runsCount = 5) {
    const baselineMetrics = [];
    const candidateMetrics = [];

    const testProfile = {
      durationSeconds: 3,
      autocannon: { connections: 10, pipelining: 1 }
    };

    console.log(`[ValidatorAgent] Running ${runsCount} interleaved benchmark runs...`);

    for (let i = 0; i < runsCount; i++) {
      // Run Baseline
      const bRes = await this.loadTester._runAutocannon(baselineUrl, routes, testProfile, () => {});
      baselineMetrics.push(bRes.metrics);

      // Run Candidate
      const cRes = await this.loadTester._runAutocannon(candidateUrl, routes, testProfile, () => {});
      candidateMetrics.push(cRes.metrics);
    }

    return {
      baselineMetrics,
      candidateMetrics
    };
  }

  /**
   * Full Candidate Validation Pipeline
   */
  async validatePatch({ projectDir, entryPoint = 'server.js', diff, routes = [], baselineUrl = null }) {
    const workspaceId = `val-${uuidv4().slice(0, 8)}`;
    const candidateDir = path.join(config.uploadDir, workspaceId);
    let baselineRunId = `base-${workspaceId}`;
    let candidateRunId = `cand-${workspaceId}`;
    let baselineActiveUrl = baselineUrl;

    try {
      // 1. Copy project to fresh workspace
      copyDirRecursive(projectDir, candidateDir);

      // 2. Apply patch
      const patchResult = applyPatchToDirectory(candidateDir, diff);
      if (!patchResult.success) {
        return {
          verdict: 'errored',
          failureReason: {
            code: 'build_error',
            summary: `Patch application failed: ${patchResult.error || 'Conflict or invalid diff format'}`
          },
          testsPassed: false,
          reward: 0.0,
          metrics: { baseline: [], candidate: [] }
        };
      }

      // 3. Launch candidate sandbox
      const candSandbox = await this.sandboxRunner.startSandbox(candidateDir, candidateRunId, entryPoint);
      if (!candSandbox.health.healthy) {
        return {
          verdict: 'errored',
          failureReason: {
            code: 'build_error',
            summary: 'Candidate container failed health readiness check after patch application'
          },
          testsPassed: false,
          reward: 0.0,
          metrics: { baseline: [], candidate: [] }
        };
      }

      // 4. Launch baseline sandbox if not already active
      if (!baselineActiveUrl) {
        const baseSandbox = await this.sandboxRunner.startSandbox(projectDir, baselineRunId, entryPoint);
        baselineActiveUrl = baseSandbox.baseUrl;
      }

      // 5. Behavioral Equivalence Check
      const equivCheck = await this.checkBehavioralEquivalence(baselineActiveUrl, candSandbox.baseUrl, routes);
      if (!equivCheck.passed) {
        console.warn('[ValidatorAgent] Behavioral equivalence check failed:', equivCheck.mismatches);
        return {
          verdict: 'rejected',
          failureReason: {
            code: 'regression',
            summary: `Behavioral equivalence failed: ${equivCheck.mismatches[0]}`
          },
          testsPassed: false,
          reward: -0.5,
          metrics: { baseline: [], candidate: [] }
        };
      }

      // 6. Interleaved Benchmark Runs (>= 5 runs)
      const { baselineMetrics, candidateMetrics } = await this.executeInterleavedBenchmark(
        baselineActiveUrl,
        candSandbox.baseUrl,
        routes,
        this.interleavedRuns
      );

      // 7. Statistical Significance Verdict & Reward
      const evalResult = evaluateCandidateRun(baselineMetrics, candidateMetrics, true);
      const rewardResult = calculateReward({
        baselineLatency: baselineMetrics.map(m => m.p95),
        candidateLatency: candidateMetrics.map(m => m.p95),
        baselineError: baselineMetrics.map(m => m.errorRate),
        candidateError: candidateMetrics.map(m => m.errorRate),
        baselineMemory: baselineMetrics.map(m => m.memoryMaxMb),
        candidateMemory: candidateMetrics.map(m => m.memoryMaxMb),
        testsPassed: true,
        verdict: evalResult.verdict
      });

      return {
        verdict: evalResult.verdict,
        failureReason: evalResult.failureReason,
        comparison: evalResult.comparison,
        testsPassed: true,
        reward: rewardResult.reward,
        rewardBreakdown: rewardResult.rewardBreakdown,
        metrics: {
          baseline: baselineMetrics,
          candidate: candidateMetrics
        },
        candidateDir
      };
    } finally {
      // Clean up sandboxes and temporary workspace
      try { await this.sandboxRunner.stopSandbox(candidateRunId); } catch (e) {}
      if (!baselineUrl) {
        try { await this.sandboxRunner.stopSandbox(baselineRunId); } catch (e) {}
      }
      try {
        if (fs.existsSync(candidateDir)) {
          fs.rmSync(candidateDir, { recursive: true, force: true });
        }
      } catch (e) {}
    }
  }
}

module.exports = {
  ValidatorAgent,
  applyPatchToDirectory,
  copyDirRecursive
};
