const Experiment = require('../models/Experiment');
const { calculateReward } = require('../services/reward');
const { evaluateCandidateRun } = require('../services/metricsCompare');
const { reflect } = require('../services/reflect');
const { VectorStore, cosineSimilarity } = require('../services/vectorStore');
const { redactSecrets, deterministicTextProjection } = require('../services/embedder');

const vectorStore = new VectorStore();
vectorStore.initCollections();

/**
 * Check for near-duplicate diffs on the same project and hotspot
 */
async function checkNearDuplicate(projectId, hotspot, diff) {
  if (!diff) return null;
  const recentExps = await Experiment.find({
    projectId,
    'hotspot.file': hotspot.file,
    'hotspot.function': hotspot.function
  }).limit(20);

  const newDiffVec = deterministicTextProjection(diff, 128);

  for (const exp of recentExps) {
    if (!exp.diff) continue;
    const existingDiffVec = deterministicTextProjection(exp.diff, 128);
    const sim = cosineSimilarity(newDiffVec, existingDiffVec);
    if (sim >= 0.95) {
      return exp._id;
    }
  }
  return null;
}

/**
 * POST /api/memory/experiments
 */
async function createExperiment(req, res) {
  try {
    const {
      projectId,
      runId,
      baselineRunId,
      hotspot,
      features = {},
      featureVersion = 1,
      strategy,
      diff = '',
      metrics = { baseline: [], candidate: [] },
      testsPassed = true,
      verdict: explicitVerdict,
      failureReason: explicitFailureReason,
      provenance = {}
    } = req.body;

    if (!projectId || !hotspot || !strategy) {
      return res.status(400).json({ error: 'Missing required fields: projectId, hotspot, and strategy are required.' });
    }

    // 1. Hygiene & Diff Sanitize
    const maxDiffLength = 50000;
    const cleanDiff = redactSecrets(diff).slice(0, maxDiffLength);
    const lines = cleanDiff.split('\n');
    const linesAdded = lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).length;
    const linesRemoved = lines.filter(l => l.startsWith('-') && !l.startsWith('---')).length;

    // 2. Statistical Verdict Evaluation if metrics arrays are provided
    let verdict = explicitVerdict || 'inconclusive';
    let failureReason = explicitFailureReason || { code: 'none', summary: '' };
    let comparison = req.body.comparison || {};

    if (metrics.baseline?.length >= 1 && metrics.candidate?.length >= 1) {
      const evalResult = evaluateCandidateRun(metrics.baseline, metrics.candidate, testsPassed);
      if (!explicitVerdict) {
        verdict = evalResult.verdict;
        failureReason = evalResult.failureReason;
      }
      comparison = evalResult.comparison || comparison;
    }

    // 3. Compute Reward
    const bLatency = metrics.baseline?.map(m => m.p95 || m) || [100];
    const cLatency = metrics.candidate?.map(m => m.p95 || m) || [100];
    const bErr = metrics.baseline?.map(m => m.errorRate || 0) || [0];
    const cErr = metrics.candidate?.map(m => m.errorRate || 0) || [0];
    const bMem = metrics.baseline?.map(m => m.memoryMaxMb || 50) || [50];
    const cMem = metrics.candidate?.map(m => m.memoryMaxMb || 50) || [50];

    const rewardResult = calculateReward({
      baselineLatency: bLatency,
      candidateLatency: cLatency,
      baselineError: bErr,
      candidateError: cErr,
      baselineMemory: bMem,
      candidateMemory: cMem,
      testsPassed,
      verdict
    });

    // 4. Duplicate Check
    const duplicateOf = await checkNearDuplicate(projectId, hotspot, cleanDiff);
    const isDuplicate = Boolean(duplicateOf);
    const excludeFromPolicy = rewardResult.excludeFromPolicy || isDuplicate;

    // 5. Generate Reusable Lesson
    const tempExp = { strategy, hotspot, verdict, failureReason, comparison };
    const lesson = req.body.lesson || reflect(tempExp);

    // 6. Save to MongoDB
    const experiment = new Experiment({
      projectId,
      runId,
      baselineRunId,
      hotspot,
      features,
      featureVersion,
      strategy,
      diff: cleanDiff,
      diffStats: {
        filesChanged: 1,
        linesAdded,
        linesRemoved
      },
      metrics,
      comparison,
      testsPassed,
      reward: rewardResult.reward,
      rewardBreakdown: rewardResult.rewardBreakdown,
      verdict,
      failureReason,
      lesson,
      provenance,
      excludeFromPolicy,
      isDuplicate,
      duplicateOf
    });

    await experiment.save();

    // 7. Upsert to Vector Memory Store
    await vectorStore.upsertExperiment(experiment);

    res.status(201).json({
      success: true,
      experiment
    });
  } catch (err) {
    console.error('[MemoryController] Error creating experiment:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/memory/experiments
 */
async function listExperiments(req, res) {
  try {
    const {
      projectId,
      strategy,
      verdict,
      category,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};
    if (projectId) query.projectId = projectId;
    if (strategy) query.strategy = strategy;
    if (verdict) query.verdict = verdict;
    if (category) query['hotspot.category'] = category;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Experiment.countDocuments(query);
    const experiments = await Experiment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      experiments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/memory/experiments/:id
 */
async function getExperiment(req, res) {
  try {
    const experiment = await Experiment.findById(req.params.id);
    if (!experiment) return res.status(404).json({ error: 'Experiment not found' });
    res.json({ success: true, experiment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/memory/similar
 */
async function searchSimilarExperiments(req, res) {
  try {
    const {
      hotspot,
      features,
      strategy,
      k = 5,
      onlyFailures = false,
      onlySuccesses = false
    } = req.body;

    const results = await vectorStore.searchSimilar({
      hotspot,
      features,
      strategy,
      k: parseInt(k, 10) || 5,
      onlyFailures: Boolean(onlyFailures),
      onlySuccesses: Boolean(onlySuccesses)
    });

    res.json({
      success: true,
      count: results.length,
      similar: results
    });
  } catch (err) {
    console.error('[MemoryController] Error querying similar experiments:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/memory/stats
 * Strategy x Category matrix with n, winRate, meanReward, medianReward
 */
async function getMemoryStats(req, res) {
  try {
    const filter = { isDuplicate: { $ne: true } };
    if (req.query.projectId) filter.projectId = req.query.projectId;

    const experiments = await Experiment.find(filter).lean();

    const groups = {};
    for (const exp of experiments) {
      const cat = exp.hotspot?.category || 'performance';
      const strat = exp.strategy || 'other';
      const key = `${strat}:${cat}`;

      if (!groups[key]) {
        groups[key] = {
          strategy: strat,
          category: cat,
          total: 0,
          accepted: 0,
          rewards: [],
          recentVerdicts: []
        };
      }

      groups[key].total++;
      if (exp.verdict === 'accepted') {
        groups[key].accepted++;
      }
      groups[key].rewards.push(exp.reward || 0);
      if (groups[key].recentVerdicts.length < 20) {
        groups[key].recentVerdicts.push(exp.verdict);
      }
    }

    const stats = Object.values(groups).map(g => {
      const winRate = g.total > 0 ? parseFloat(((g.accepted / g.total) * 100).toFixed(1)) : 0;
      const sumRewards = g.rewards.reduce((a, b) => a + b, 0);
      const meanReward = g.total > 0 ? parseFloat((sumRewards / g.total).toFixed(4)) : 0;
      const sortedRewards = [...g.rewards].sort((a, b) => a - b);
      const mid = Math.floor(sortedRewards.length / 2);
      const medianReward = sortedRewards.length % 2 !== 0
        ? sortedRewards[mid]
        : (sortedRewards[mid - 1] + sortedRewards[mid]) / 2;

      return {
        strategy: g.strategy,
        category: g.category,
        n: g.total,
        winRate,
        meanReward,
        medianReward: parseFloat(medianReward.toFixed(4)),
        last20Trend: g.recentVerdicts
      };
    });

    res.json({
      success: true,
      totalExperiments: experiments.length,
      stats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/memory/policy-data
 * Returns clean policy training rows where excludeFromPolicy = false
 */
async function getPolicyData(req, res) {
  try {
    const featureVersion = parseInt(req.query.featureVersion, 10) || 1;
    const filter = {
      excludeFromPolicy: false,
      featureVersion
    };

    if (req.query.projectId) filter.projectId = req.query.projectId;

    const rows = await Experiment.find(filter)
      .select('features strategy reward verdict createdAt')
      .lean();

    res.json({
      success: true,
      count: rows.length,
      featureVersion,
      data: rows.map(r => ({
        features: r.features?.vector?.length > 0 ? r.features.vector : r.features,
        strategy: r.strategy,
        reward: r.reward,
        verdict: r.verdict
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * DELETE /api/memory/experiments/:id
 */
async function deleteExperiment(req, res) {
  try {
    const { id } = req.params;
    await Experiment.findByIdAndDelete(id);
    await vectorStore.deleteExperiment(id);
    res.json({ success: true, message: `Experiment ${id} deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createExperiment,
  listExperiments,
  getExperiment,
  searchSimilarExperiments,
  getMemoryStats,
  getPolicyData,
  deleteExperiment,
  vectorStore
};
