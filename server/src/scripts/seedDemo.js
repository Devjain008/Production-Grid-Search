const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Project = require('../models/Project');
const Run = require('../models/Run');
const DefectReport = require('../models/DefectReport');
const Experiment = require('../models/Experiment');
const User = require('../models/User');
const { generateFinalReport } = require('../services/report');
const config = require('../config');
const { connectDB, disconnectDB } = require('../config/db');

async function seedDemoData() {
  console.log('[SeedDemo] Initializing EVOLVE demo dataset...');
  await connectDB();

  // 1. Ensure Demo User
  let demoUser = await User.findOne({ email: 'demo@evolve.local' });
  if (!demoUser) {
    const { salt, hash } = await User.hashPassword('evolveDemoPassword2026');
    demoUser = new User({
      email: 'demo@evolve.local',
      username: 'demo_developer',
      salt,
      passwordHash: hash,
      role: 'demo'
    });
    await demoUser.save();
  }

  // 2. Clear previous demo projects
  await Project.deleteMany({ isDemo: true });

  const samplePath = path.join(__dirname, '..', '..', 'samples', 'buggy-shop');

  // 3. Create Demo Project
  const project = new Project({
    name: 'Demo: Buggy Shop E-Commerce API',
    sourceType: 'zip',
    sourcePath: fs.existsSync(samplePath) ? samplePath : null,
    ownerId: demoUser._id,
    isDemo: true,
    isPublic: true,
    status: 'ready',
    detectedRoutes: [
      { method: 'GET', path: '/orders', params: [], filePath: 'server.js', line: 42 },
      { method: 'POST', path: '/login', params: [], filePath: 'server.js', line: 78 },
      { method: 'GET', path: '/products', params: [], filePath: 'server.js', line: 112 },
      { method: 'GET', path: '/items', params: [], filePath: 'server.js', line: 140 },
      { method: 'GET', path: '/metrics', params: [], filePath: 'server.js', line: 165 },
      { method: 'GET', path: '/health', params: [], filePath: 'server.js', line: 180 }
    ],
    meta: {
      entryPoint: 'server.js',
      fileCount: 4,
      executionMode: 'sandboxed_container'
    }
  });
  await project.save();

  // 4. Create Baseline Run
  const baselineRun = new Run({
    projectId: project._id,
    type: 'baseline',
    status: 'completed',
    profile: 'stress',
    metrics: {
      p50: 64.2,
      p90: 118.5,
      p95: 148.6,
      p99: 215.4,
      rps: 84.2,
      errorRate: 0.001,
      cpu: 82.5,
      memoryMb: 114.2,
      eventLoopLagP95: 52.4
    },
    containerInfo: {
      containerId: 'demo-container-001',
      port: 5000
    }
  });
  await baselineRun.save();

  project.baselineRunId = baselineRun._id;
  await project.save();

  // 5. Create Ranked Defect Report
  const defectReport = new DefectReport({
    projectId: project._id,
    runId: baselineRun._id,
    totalFindings: 6,
    rankedDefects: [
      {
        rank: 1,
        file: 'server.js',
        line: 45,
        functionName: 'getOrdersHandler',
        category: 'performance',
        severity: 5,
        hotnessScore: 0.94,
        anomalyScore: 0.88,
        complexity: 8,
        fusionScore: 0.92,
        suggestedStrategy: 'batch',
        strategyConfidence: 0.95,
        evidence: {
          static: ['Database query inside loop: await Order.findOne()'],
          dynamic: ['dbTimeShare: 72%'],
          anomaly: ['High P95 latency outlier on /orders']
        }
      },
      {
        rank: 2,
        file: 'server.js',
        line: 82,
        functionName: 'loginHandler',
        category: 'performance',
        severity: 4,
        hotnessScore: 0.86,
        anomalyScore: 0.79,
        complexity: 4,
        fusionScore: 0.84,
        suggestedStrategy: 'async',
        strategyConfidence: 0.91,
        evidence: {
          static: ['Blocking crypto call: bcrypt.hashSync inside request handler'],
          dynamic: ['eventLoopLagP95: 52ms']
        }
      },
      {
        rank: 3,
        file: 'server.js',
        line: 115,
        functionName: 'getProductsHandler',
        category: 'architecture',
        severity: 3,
        hotnessScore: 0.68,
        anomalyScore: 0.62,
        complexity: 3,
        fusionScore: 0.70,
        suggestedStrategy: 'pagination',
        strategyConfidence: 0.85,
        evidence: {
          static: ['Missing pagination: Product.find() without limit or cursor']
        }
      },
      {
        rank: 4,
        file: 'server.js',
        line: 145,
        functionName: 'itemsCache',
        category: 'performance',
        severity: 3,
        hotnessScore: 0.62,
        anomalyScore: 0.55,
        complexity: 3,
        fusionScore: 0.64,
        suggestedStrategy: 'pool',
        strategyConfidence: 0.80,
        evidence: {
          static: ['Unbounded in-memory map without TTL eviction policy']
        }
      }
    ]
  });
  await defectReport.save();

  // 6. Create Synthetic Experiments
  const demoJobId = 'demo-job-auto-01';

  const exp1 = new Experiment({
    projectId: project._id,
    baselineRunId: baselineRun._id,
    hotspot: {
      file: 'server.js',
      line: 45,
      function: 'getOrdersHandler',
      category: 'performance',
      defectRank: 1
    },
    features: { staticSeverity: 5, hotness: 0.94, dbTimeShare: 0.72, vector: [0.9, 0.7, 0.8] },
    strategy: 'batch',
    diff: `--- a/server.js\n+++ b/server.js\n@@ -45,5 +45,3 @@\n-  for (const item of orderIds) {\n-    const details = await Order.findOne({ _id: item });\n+  const allDetails = await Order.find({ _id: { $in: orderIds } });\n`,
    diffStats: { filesChanged: 1, linesAdded: 2, linesRemoved: 3 },
    metrics: {
      baseline: [148.6, 145.2, 150.1, 147.9, 149.2],
      candidate: [88.4, 91.2, 89.5, 87.9, 90.1]
    },
    comparison: {
      p95DeltaPct: -39.4,
      rpsDeltaPct: 45.2,
      errorDelta: 0.0,
      memDeltaPct: 2.1,
      mannWhitneyP: 0.0079,
      effectSize: 0.92,
      nBaseline: 5,
      nCandidate: 5
    },
    testsPassed: true,
    reward: 0.58,
    rewardBreakdown: { latency: 0.40, errorPenalty: 0.0, memPenalty: 0.0, testPenalty: 0.0 },
    verdict: 'accepted',
    failureReason: { code: 'none', summary: '' },
    lesson: 'Batching item lookups using MongoDB $in eliminated the N+1 loop and dropped /orders latency by 39%.',
    provenance: {
      agentVersion: '2.0.0',
      llmModel: 'demo-patcher',
      policyMode: 'learned',
      policyVersion: 1,
      propensity: 0.88,
      scores: { batch: { mean: 0.65 } }
    }
  });
  await exp1.save();

  const exp2 = new Experiment({
    projectId: project._id,
    baselineRunId: baselineRun._id,
    hotspot: {
      file: 'server.js',
      line: 82,
      function: 'loginHandler',
      category: 'performance',
      defectRank: 2
    },
    features: { staticSeverity: 4, hotness: 0.86, eventLoopLagP95: 52.4, vector: [0.8, 0.9, 0.4] },
    strategy: 'async',
    diff: `--- a/server.js\n+++ b/server.js\n@@ -82,3 +82,3 @@\n-  const hash = bcrypt.hashSync(password, 10);\n+  const hash = await bcrypt.hash(password, 10);\n`,
    diffStats: { filesChanged: 1, linesAdded: 1, linesRemoved: 1 },
    metrics: {
      baseline: [89.5, 91.2, 88.4, 90.1, 89.0],
      candidate: [68.2, 69.4, 67.8, 68.9, 68.5]
    },
    comparison: {
      p95DeltaPct: -23.8,
      rpsDeltaPct: 28.4,
      errorDelta: 0.0,
      memDeltaPct: -1.2,
      mannWhitneyP: 0.008,
      effectSize: 0.84,
      nBaseline: 5,
      nCandidate: 5
    },
    testsPassed: true,
    reward: 0.42,
    rewardBreakdown: { latency: 0.25, errorPenalty: 0.0, memPenalty: 0.0, testPenalty: 0.0 },
    verdict: 'accepted',
    failureReason: { code: 'none', summary: '' },
    lesson: 'Replacing synchronous bcrypt.hashSync with asynchronous bcrypt.hash freed the event loop and prevented request starvation.',
    provenance: {
      agentVersion: '2.0.0',
      llmModel: 'demo-patcher',
      policyMode: 'learned',
      policyVersion: 1,
      propensity: 0.92,
      scores: { async: { mean: 0.58 } }
    }
  });
  await exp2.save();

  const exp3 = new Experiment({
    projectId: project._id,
    baselineRunId: baselineRun._id,
    hotspot: {
      file: 'server.js',
      line: 145,
      function: 'itemsCache',
      category: 'performance',
      defectRank: 4
    },
    features: { staticSeverity: 3, hotness: 0.62 },
    strategy: 'cache',
    diff: `--- a/server.js\n+++ b/server.js\n@@ -145,2 +145,4 @@\n+  if (cache.has(req.params.id)) return res.json(cache.get(req.params.id));\n`,
    diffStats: { filesChanged: 1, linesAdded: 2, linesRemoved: 0 },
    metrics: { baseline: [68.5], candidate: [69.1] },
    comparison: { p95DeltaPct: 0.8, rpsDeltaPct: -1.2, mannWhitneyP: 0.45 },
    testsPassed: false,
    reward: -0.65,
    rewardBreakdown: { latency: 0.0, errorPenalty: 0.0, memPenalty: 0.0, testPenalty: 0.65 },
    verdict: 'rejected',
    failureReason: { code: 'tests_failed', summary: 'Cache invalidation bug caused state desynchronization in integration tests.' },
    lesson: 'In-memory caching without explicit write invalidation causes stale reads on updated products.',
    provenance: { policyMode: 'learned' }
  });
  await exp3.save();

  // 7. Generate Full Multi-Format Report Artifacts
  await generateFinalReport({
    projectId: project._id,
    jobId: demoJobId,
    formats: ['html', 'pdf', 'md', 'json']
  });

  console.log(`\n==============================================================`);
  console.log(` EVOLVE DEMO READY: Open http://localhost:3000 to explore!`);
  console.log(` Project:       ${project.name} [DEMO DATA]`);
  console.log(` Baseline P95:  148.6 ms  -->  Final P95: 68.5 ms (-53.9%)`);
  console.log(` Experiments:   3 (2 Accepted, 1 Rejected)`);
  console.log(` Report:        Artifacts generated in uploadDir/reports/${demoJobId}/`);
  console.log(`==============================================================\n`);

  await disconnectDB();
}

if (require.main === module) {
  seedDemoData().then(() => process.exit(0)).catch(err => {
    console.error('[SeedDemo] Error:', err);
    process.exit(1);
  });
}

module.exports = { seedDemoData };
