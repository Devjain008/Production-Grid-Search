const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Experiment = require('../models/Experiment');
const { VectorStore } = require('../services/vectorStore');
const { calculateReward } = require('../services/reward');
const { reflect } = require('../services/reflect');
const { connectDb } = require('../config/db');

/**
 * Seed 60 synthetic experiments with known planted win rates across strategies & categories:
 * - batch on N+1 queries (performance): ~80% win rate (16/20 accepted)
 * - cache on search/read hotspots: ~70% win rate (7/10 accepted)
 * - cache on write-heavy routes: ~20% win rate (2/10 accepted)
 * - async on blocking sync calls: ~85% win rate (9/10 accepted)
 * - pagination on unbounded queries: ~80% win rate (8/10 accepted)
 */
async function seedExperiments(projectIdStr = null, customVectorStore = null) {
  await connectDb();
  const vectorStore = customVectorStore || new VectorStore();
  await vectorStore.initCollections();

  const dummyProjectId = projectIdStr
    ? new mongoose.Types.ObjectId(projectIdStr)
    : new mongoose.Types.ObjectId('660000000000000000000001');

  console.log(`[SeedExperiments] Seeding 60 synthetic experiments for project ${dummyProjectId}...`);

  // Clear existing seeded test experiments
  await Experiment.deleteMany({ projectId: dummyProjectId });

  const templates = [
    // 1. Batch strategy on N+1 query (20 experiments, 16 accepted -> 80% win rate)
    ...Array.from({ length: 20 }, (_, i) => {
      const isWin = i < 16;
      return {
        strategy: 'batch',
        hotspot: {
          file: 'server.js',
          line: 120,
          function: 'getOrdersHandler',
          category: 'performance',
          defectRank: 1
        },
        verdict: isWin ? 'accepted' : 'rejected',
        failureCode: isWin ? 'none' : 'regression',
        failureSummary: isWin ? '' : 'Memory inflation during batch grouping',
        bLat: 650,
        cLat: isWin ? 140 : 680,
        bErr: 0.0,
        cErr: isWin ? 0.0 : 0.03,
        bMem: 60,
        cMem: isWin ? 65 : 140,
        diff: `--- a/server.js\n+++ b/server.js\n@@ -120,5 +120,5 @@\n-for (const o of orders) await simulateDbQuery();\n+await simulateDbQuery(); const map = new Map();`
      };
    }),

    // 2. Cache strategy on search queries (10 experiments, 7 accepted -> 70% win rate)
    ...Array.from({ length: 10 }, (_, i) => {
      const isWin = i < 7;
      return {
        strategy: 'cache',
        hotspot: {
          file: 'server.js',
          line: 105,
          function: 'searchHandler',
          category: 'performance',
          defectRank: 3
        },
        verdict: isWin ? 'accepted' : 'rejected',
        failureCode: isWin ? 'none' : 'regression',
        failureSummary: isWin ? '' : 'Unbounded memory leak without TTL',
        bLat: 280,
        cLat: isWin ? 40 : 260,
        bErr: 0.0,
        cErr: 0.0,
        bMem: 50,
        cMem: isWin ? 60 : 190,
        diff: `--- a/server.js\n+++ b/server.js\n@@ -105,3 +105,4 @@\n+if (cache.has(q)) return cache.get(q);\n const res = products.filter();`
      };
    }),

    // 3. Cache strategy on write-heavy routes (10 experiments, 2 accepted -> 20% win rate)
    ...Array.from({ length: 10 }, (_, i) => {
      const isWin = i < 2;
      return {
        strategy: 'cache',
        hotspot: {
          file: 'server.js',
          line: 175,
          function: 'createReviewHandler',
          category: 'reliability',
          defectRank: 5
        },
        verdict: isWin ? 'accepted' : 'rejected',
        failureCode: isWin ? 'none' : 'regression',
        failureSummary: isWin ? '' : 'Stale cached writes caused data inconsistency',
        bLat: 120,
        cLat: isWin ? 70 : 130,
        bErr: 0.0,
        cErr: isWin ? 0.0 : 0.15,
        bMem: 50,
        cMem: 52,
        diff: `--- a/server.js\n+++ b/server.js\n@@ -175,2 +175,2 @@\n-reviews.push(review);\n+cache.set(review.id, review);`
      };
    }),

    // 4. Async strategy on sync PBKDF2/bcrypt (10 experiments, 9 accepted -> 90% win rate)
    ...Array.from({ length: 10 }, (_, i) => {
      const isWin = i < 9;
      return {
        strategy: 'async',
        hotspot: {
          file: 'server.js',
          line: 155,
          function: 'loginHandler',
          category: 'performance',
          defectRank: 2
        },
        verdict: isWin ? 'accepted' : 'rejected',
        failureCode: isWin ? 'none' : 'tests_failed',
        failureSummary: isWin ? '' : 'Promise rejection in callback handler',
        bLat: 420,
        cLat: isWin ? 65 : 450,
        bErr: 0.0,
        cErr: isWin ? 0.0 : 0.05,
        bMem: 50,
        cMem: 55,
        diff: `--- a/server.js\n+++ b/server.js\n@@ -155,2 +155,2 @@\n-crypto.pbkdf2Sync();\n+await crypto.pbkdf2();`
      };
    }),

    // 5. Pagination strategy on unbounded user fetch (10 experiments, 8 accepted -> 80% win rate)
    ...Array.from({ length: 10 }, (_, i) => {
      const isWin = i < 8;
      return {
        strategy: 'pagination',
        hotspot: {
          file: 'server.js',
          line: 65,
          function: 'getUsersHandler',
          category: 'architecture',
          defectRank: 4
        },
        verdict: isWin ? 'accepted' : 'rejected',
        failureCode: isWin ? 'none' : 'tests_failed',
        failureSummary: isWin ? '' : 'Changed response schema broke client test suite',
        bLat: 310,
        cLat: isWin ? 55 : 300,
        bErr: 0.0,
        cErr: 0.0,
        bMem: 90,
        cMem: isWin ? 45 : 95,
        diff: `--- a/server.js\n+++ b/server.js\n@@ -65,2 +65,2 @@\n-res.json({ users: mockUsers });\n+res.json({ users: mockUsers.slice(0, 20) });`
      };
    })
  ];

  const createdDocs = [];

  for (const t of templates) {
    const p95DeltaPct = parseFloat((((t.cLat - t.bLat) / t.bLat) * 100).toFixed(2));
    const comparison = {
      p95DeltaPct,
      rpsDeltaPct: t.verdict === 'accepted' ? 45.0 : -5.0,
      errorDelta: t.cErr - t.bErr,
      memDeltaPct: parseFloat((((t.cMem - t.bMem) / t.bMem) * 100).toFixed(2)),
      mannWhitneyP: t.verdict === 'accepted' ? 0.008 : 0.35,
      effectSize: t.verdict === 'accepted' ? 0.85 : 0.05,
      nBaseline: 5,
      nCandidate: 5
    };

    const rewardResult = calculateReward({
      baselineLatency: t.bLat,
      candidateLatency: t.cLat,
      baselineError: t.bErr,
      candidateError: t.cErr,
      baselineMemory: t.bMem,
      candidateMemory: t.cMem,
      testsPassed: t.verdict !== 'rejected' || t.failureCode !== 'tests_failed',
      verdict: t.verdict
    });

    const expDoc = new Experiment({
      projectId: dummyProjectId,
      hotspot: t.hotspot,
      features: {
        staticSeverity: 5,
        hotness: 45.0,
        eventLoopLagP95: 50.0,
        gcPauseMs: 120.0,
        dbTimeShare: 35.0,
        heapSlope: 10.0,
        anomalyScore: 0.85,
        complexity: 8,
        routeRps: 80.0
      },
      featureVersion: 1,
      strategy: t.strategy,
      diff: t.diff,
      diffStats: { filesChanged: 1, linesAdded: 5, linesRemoved: 5 },
      metrics: {
        baseline: [t.bLat, t.bLat + 5, t.bLat - 5, t.bLat + 2, t.bLat - 3],
        candidate: [t.cLat, t.cLat + 5, t.cLat - 5, t.cLat + 2, t.cLat - 3]
      },
      comparison,
      testsPassed: t.verdict !== 'rejected' || t.failureCode !== 'tests_failed',
      reward: rewardResult.reward,
      rewardBreakdown: rewardResult.rewardBreakdown,
      verdict: t.verdict,
      failureReason: {
        code: t.failureCode,
        summary: t.failureSummary
      },
      lesson: reflect({
        strategy: t.strategy,
        hotspot: t.hotspot,
        verdict: t.verdict,
        failureReason: { code: t.failureCode, summary: t.failureSummary },
        comparison
      }),
      excludeFromPolicy: t.verdict === 'inconclusive' || t.verdict === 'errored'
    });

    await expDoc.save();
    await vectorStore.upsertExperiment(expDoc);
    createdDocs.push(expDoc);
  }

  console.log(`[SeedExperiments] Successfully seeded and indexed ${createdDocs.length} experiments.`);
  return {
    projectId: dummyProjectId,
    count: createdDocs.length,
    experiments: createdDocs
  };
}

module.exports = {
  seedExperiments
};
