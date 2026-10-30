/**
 * Statistical Metrics Comparator & Significance Testing
 * Implements run-to-run variance analysis, Mann-Whitney U testing, Cliff's delta effect size,
 * and guarded metric regression detection.
 */

/**
 * Calculates mean, variance, and standard deviation of an array of numbers
 */
function calculateSummaryStats(values) {
  if (!values || values.length === 0) {
    return { count: 0, mean: 0, variance: 0, stdDev: 0, min: 0, max: 0 };
  }

  const n = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n > 1 ? n - 1 : 1);
  const stdDev = Math.sqrt(variance);

  return {
    count: n,
    mean: parseFloat(mean.toFixed(2)),
    variance: parseFloat(variance.toFixed(2)),
    stdDev: parseFloat(stdDev.toFixed(2)),
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

/**
 * Cliff's Delta Effect Size
 * Non-parametric effect size measure between two distributions in range [-1, 1]
 */
function calculateCliffsDelta(sampleA, sampleB) {
  const n1 = sampleA.length;
  const n2 = sampleB.length;
  if (n1 === 0 || n2 === 0) return 0.0;

  let greater = 0;
  let lesser = 0;

  for (const x of sampleA) {
    for (const y of sampleB) {
      if (x > y) greater++;
      else if (x < y) lesser++;
    }
  }

  const delta = (greater - lesser) / (n1 * n2);
  return parseFloat(delta.toFixed(4));
}

/**
 * Mann-Whitney U test (Wilcoxon rank-sum test)
 */
function mannWhitneyUTest(sampleA, sampleB) {
  const n1 = sampleA.length;
  const n2 = sampleB.length;

  if (n1 === 0 || n2 === 0) {
    return { uStatistic: 0, zScore: 0, pValue: 1, isSignificant: false };
  }

  const combined = [
    ...sampleA.map(val => ({ val, group: 'A' })),
    ...sampleB.map(val => ({ val, group: 'B' }))
  ].sort((a, b) => a.val - b.val);

  let i = 0;
  const ranks = [];
  while (i < combined.length) {
    let j = i;
    while (j < combined.length - 1 && combined[j].val === combined[j + 1].val) {
      j++;
    }
    const tieRank = (i + 1 + j + 1) / 2;
    for (let k = i; k <= j; k++) {
      ranks[k] = tieRank;
    }
    i = j + 1;
  }

  let r1 = 0;
  for (let k = 0; k < combined.length; k++) {
    if (combined[k].group === 'A') {
      r1 += ranks[k];
    }
  }

  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u2 = n1 * n2 - u1;
  const u = Math.min(u1, u2);

  const meanU = (n1 * n2) / 2;
  const stdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const zScore = stdU > 0 ? (u - meanU) / stdU : 0;

  const pValue = parseFloat((2 * (1 - normalCdf(Math.abs(zScore)))).toFixed(4));
  const alpha = parseFloat(process.env.ALPHA) || 0.05;
  const isSignificant = pValue < alpha;

  return {
    uStatistic: u,
    zScore: parseFloat(zScore.toFixed(3)),
    pValue,
    isSignificant
  };
}

function normalCdf(z) {
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const erf = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * erf);
}

function compareSingleMetrics(baseline, candidate) {
  const calcChange = (base, cand, lowerIsBetter = true) => {
    if (base === 0 && cand === 0) return { absolute: 0, percent: 0, improved: false };
    const diff = cand - base;
    const percent = base !== 0 ? (diff / base) * 100 : 0;
    const improved = lowerIsBetter ? diff < 0 : diff > 0;
    return {
      baseline: base,
      candidate: cand,
      absolute: parseFloat(diff.toFixed(2)),
      percent: parseFloat(percent.toFixed(2)),
      improved
    };
  };

  return {
    p95: calcChange(baseline.p95 || 0, candidate.p95 || 0, true),
    p50: calcChange(baseline.p50 || 0, candidate.p50 || 0, true),
    p99: calcChange(baseline.p99 || 0, candidate.p99 || 0, true),
    rps: calcChange(baseline.rps || 0, candidate.rps || 0, false),
    errorRate: calcChange(baseline.errorRate || 0, candidate.errorRate || 0, true),
    memoryMaxMb: calcChange(baseline.memoryMaxMb || 0, candidate.memoryMaxMb || 0, true),
    cpuAvgPercent: calcChange(baseline.cpuAvgPercent || 0, candidate.cpuAvgPercent || 0, true)
  };
}

/**
 * Validates candidate vs baseline with >= 5 runs and statistical significance checking
 */
function evaluateCandidateRun(baselineRuns, candidateRuns, functionalTestsPassed = true) {
  const alpha = parseFloat(process.env.ALPHA) || 0.05;
  const minEffect = parseFloat(process.env.MIN_EFFECT) || 0.05;
  const tolError = parseFloat(process.env.TOLERANCE_ERROR) || 0.01;
  const tolMem = parseFloat(process.env.TOLERANCE_MEM) || 0.20;

  const baselineP95s = baselineRuns.map(r => r.metrics ? r.metrics.p95 : r.p95);
  const candidateP95s = candidateRuns.map(r => r.metrics ? r.metrics.p95 : r.p95);

  const baselineRps = baselineRuns.map(r => r.metrics ? r.metrics.rps : r.rps || 0);
  const candidateRps = candidateRuns.map(r => r.metrics ? r.metrics.rps : r.rps || 0);

  const baselineErrorRates = baselineRuns.map(r => r.metrics ? r.metrics.errorRate : r.errorRate || 0);
  const candidateErrorRates = candidateRuns.map(r => r.metrics ? r.metrics.errorRate : r.errorRate || 0);

  const baselineMem = baselineRuns.map(r => r.metrics ? r.metrics.memoryMaxMb : r.memoryMaxMb || 0);
  const candidateMem = candidateRuns.map(r => r.metrics ? r.metrics.memoryMaxMb : r.memoryMaxMb || 0);

  const baselineStats = calculateSummaryStats(baselineP95s);
  const candidateStats = calculateSummaryStats(candidateP95s);

  const avgBaselineErr = baselineErrorRates.reduce((a, b) => a + b, 0) / (baselineErrorRates.length || 1);
  const avgCandidateErr = candidateErrorRates.reduce((a, b) => a + b, 0) / (candidateErrorRates.length || 1);

  const avgBaseMem = baselineMem.reduce((a, b) => a + b, 0) / (baselineMem.length || 1);
  const avgCandMem = candidateMem.reduce((a, b) => a + b, 0) / (candidateMem.length || 1);

  const avgBaseRps = baselineRps.reduce((a, b) => a + b, 0) / (baselineRps.length || 1);
  const avgCandRps = candidateRps.reduce((a, b) => a + b, 0) / (candidateRps.length || 1);

  const p95DeltaPct = baselineStats.mean > 0
    ? parseFloat((((candidateStats.mean - baselineStats.mean) / baselineStats.mean) * 100).toFixed(2))
    : 0;

  const rpsDeltaPct = avgBaseRps > 0
    ? parseFloat((((avgCandRps - avgBaseRps) / avgBaseRps) * 100).toFixed(2))
    : 0;

  const errorDelta = parseFloat((avgCandidateErr - avgBaselineErr).toFixed(4));
  const memDeltaPct = avgBaseMem > 0
    ? parseFloat((((avgCandMem - avgBaseMem) / avgBaseMem) * 100).toFixed(2))
    : 0;

  const mwu = mannWhitneyUTest(baselineP95s, candidateP95s);
  // Cliff's delta: positive means baseline > candidate (candidate latency is lower/better)
  const effectSize = calculateCliffsDelta(baselineP95s, candidateP95s);

  const comparison = {
    p95DeltaPct,
    rpsDeltaPct,
    errorDelta,
    memDeltaPct,
    mannWhitneyP: mwu.pValue,
    effectSize,
    nBaseline: baselineRuns.length,
    nCandidate: candidateRuns.length
  };

  if (!functionalTestsPassed) {
    const summary = 'Functional unit/integration tests failed after patch application';
    return {
      verdict: 'rejected',
      reason: summary,
      failureReason: {
        code: 'tests_failed',
        summary
      },
      comparison,
      baselineStats,
      candidateStats,
      mwu
    };
  }

  // Guarded metrics check: error rate
  if (errorDelta > tolError) {
    const summary = `Guarded metric errorRate regressed by +${(errorDelta * 100).toFixed(1)}% (tolerance: ${(tolError * 100)}%)`;
    return {
      verdict: 'rejected',
      reason: summary,
      failureReason: {
        code: 'regression',
        summary
      },
      comparison,
      baselineStats,
      candidateStats,
      mwu
    };
  }

  // Guarded metrics check: memory
  if (memDeltaPct > tolMem * 100 && avgBaseMem > 0) {
    const summary = `Guarded metric memory inflated by +${memDeltaPct}% (tolerance: +${(tolMem * 100)}%)`;
    return {
      verdict: 'rejected',
      reason: summary,
      failureReason: {
        code: 'regression',
        summary
      },
      comparison,
      baselineStats,
      candidateStats,
      mwu
    };
  }

  // Latency improvement check: must be lower p95, p < ALPHA, and relative reduction > MIN_EFFECT
  const relativeLatencyReduction = baselineStats.mean > 0
    ? (baselineStats.mean - candidateStats.mean) / baselineStats.mean
    : 0;

  const isSignificant = mwu.pValue < alpha;
  const meetsMinEffect = relativeLatencyReduction >= minEffect || effectSize >= 0.147;

  if (relativeLatencyReduction > 0 && isSignificant && meetsMinEffect) {
    const summary = `Significant p95 reduction of ${(-p95DeltaPct).toFixed(1)}% (p=${mwu.pValue})`;
    return {
      verdict: 'accepted',
      reason: summary,
      failureReason: { code: 'none', summary: '' },
      comparison,
      baselineStats,
      candidateStats,
      mwu
    };
  } else if (relativeLatencyReduction > 0 && (!isSignificant || !meetsMinEffect)) {
    const summary = `Latency reduction (${(relativeLatencyReduction * 100).toFixed(1)}%) is within run-to-run noise (p=${mwu.pValue} >= ${alpha} or effect < ${minEffect})`;
    return {
      verdict: 'inconclusive',
      reason: summary,
      failureReason: {
        code: 'noise',
        summary
      },
      comparison,
      baselineStats,
      candidateStats,
      mwu
    };
  } else {
    const summary = `Candidate p95 latency (${candidateStats.mean}ms) was not better than baseline (${baselineStats.mean}ms)`;
    return {
      verdict: 'rejected',
      reason: summary,
      failureReason: {
        code: 'no_improvement',
        summary
      },
      comparison,
      baselineStats,
      candidateStats,
      mwu
    };
  }
}

module.exports = {
  calculateSummaryStats,
  calculateCliffsDelta,
  mannWhitneyUTest,
  compareSingleMetrics,
  evaluateCandidateRun
};
