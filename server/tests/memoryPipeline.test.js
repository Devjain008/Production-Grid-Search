const request = require('supertest');
const mongoose = require('mongoose');
const { connectDb } = require('../src/config/db');
const { seedExperiments } = require('../src/scripts/seedExperiments');
const { reindexAllExperiments } = require('../src/services/reindexMemory');
const { VectorStore } = require('../src/services/vectorStore');
const express = require('express');
const apiRoutes = require('../src/routes/api');

let app;
let dummyProjectId;
const vectorStore = new VectorStore();

beforeAll(async () => {
  await connectDb();
  app = express();
  app.use(express.json());
  app.use('/api', apiRoutes);

  dummyProjectId = new mongoose.Types.ObjectId().toString();
  await seedExperiments(dummyProjectId, vectorStore);
}, 30000);

afterAll(async () => {
  const Experiment = require('../src/models/Experiment');
  await Experiment.deleteMany({ projectId: dummyProjectId });
});

describe('Phase 3: Experiment Memory & Vector Retrieval Pipeline Tests', () => {
  test('GET /api/memory/stats recovers planted win rates within +/- 10 points', async () => {
    const res = await request(app)
      .get(`/api/memory/stats?projectId=${dummyProjectId}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.totalExperiments).toBe(60);

    const stats = res.body.stats;

    // Batch on performance (N+1 queries): planted ~80%
    const batchStat = stats.find(s => s.strategy === 'batch' && s.category === 'performance');
    expect(batchStat).toBeDefined();
    expect(batchStat.n).toBe(20);
    expect(batchStat.winRate).toBeGreaterThanOrEqual(70);
    expect(batchStat.winRate).toBeLessThanOrEqual(90);

    // Cache on reliability (write-heavy): planted ~20%
    const cacheRelStat = stats.find(s => s.strategy === 'cache' && s.category === 'reliability');
    expect(cacheRelStat).toBeDefined();
    expect(cacheRelStat.n).toBe(10);
    expect(cacheRelStat.winRate).toBeGreaterThanOrEqual(10);
    expect(cacheRelStat.winRate).toBeLessThanOrEqual(30);

    // Async on performance (sync calls): planted ~90%
    const asyncStat = stats.find(s => s.strategy === 'async' && s.category === 'performance');
    expect(asyncStat).toBeDefined();
    expect(asyncStat.winRate).toBeGreaterThanOrEqual(80);
    expect(asyncStat.winRate).toBeLessThanOrEqual(100);
  });

  test('POST /api/memory/similar returns same-category cases and surfaces failed attempts with lessons', async () => {
    // Query for N+1 query hotspot
    const queryPayload = {
      hotspot: {
        category: 'performance',
        function: 'getOrdersHandler',
        description: 'Loop database query N+1 anti-pattern'
      },
      features: {
        staticSeverity: 5,
        hotness: 45.0,
        eventLoopLagP95: 50.0
      },
      strategy: 'batch',
      k: 5
    };

    const res = await request(app)
      .post('/api/memory/similar')
      .send(queryPayload)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.similar.length).toBe(5);

    // All top returned cases must be the batch strategy and performance category
    for (const item of res.body.similar) {
      expect(item.strategy).toBe('batch');
      expect(item.category).toBe('performance');
    }

    // Query for failures only to surface failure lessons
    const failureQuery = {
      ...queryPayload,
      strategy: 'cache',
      onlyFailures: true,
      k: 3
    };

    const failRes = await request(app)
      .post('/api/memory/similar')
      .send(failureQuery)
      .expect(200);

    expect(failRes.body.success).toBe(true);
    expect(failRes.body.similar.length).toBeGreaterThan(0);
    for (const item of failRes.body.similar) {
      expect(item.verdict).toBe('rejected');
      expect(item.lesson.length).toBeGreaterThan(10);
    }
  });

  test('GET /api/memory/policy-data strictly excludes inconclusive and errored experiments', async () => {
    const res = await request(app)
      .get(`/api/memory/policy-data?projectId=${dummyProjectId}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    // Ensure no inconclusive or errored verdicts appear in training policy data
    for (const row of res.body.data) {
      expect(row.verdict).not.toBe('inconclusive');
      expect(row.verdict).not.toBe('errored');
    }
  });

  test('Reindex idempotently restores identical retrieval results after store wipe', async () => {
    // 1. Initial retrieval score
    const beforeSearch = await vectorStore.searchSimilar({
      hotspot: { category: 'performance', function: 'getOrdersHandler' },
      k: 3
    });

    // 2. Wipe vector store and reindex from MongoDB
    const reindexRes = await reindexAllExperiments({
      projectId: dummyProjectId,
      vectorStore,
      wipeFirst: true
    });
    expect(reindexRes.totalIndexed).toBe(60);

    // 3. Retrieval after reindex
    const afterSearch = await vectorStore.searchSimilar({
      hotspot: { category: 'performance', function: 'getOrdersHandler' },
      k: 3
    });

    expect(afterSearch.length).toBe(beforeSearch.length);
    expect(afterSearch[0].id).toBe(beforeSearch[0].id);
    expect(afterSearch[0].score).toBeCloseTo(beforeSearch[0].score, 2);
  });
});
