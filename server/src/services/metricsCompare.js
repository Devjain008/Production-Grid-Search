/**
 * Statistical Metrics Comparator & Significance Testing
 * Implements run-to-run variance analysis, Mann-Whitney U testing, and guarded metric regression detection.
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
 * Mann-Whitney U test (Wilcoxon rank-sum test)
 * Non-parametric statistical test to determine whether candidate distribution
 * is stochastically smaller (lower latency) than baseline distribution.
 * 
 * @param {Array<number>} sampleA - e.g. baseline p95 values
 * @param {Array<number>} sampleB - e.g. candidate p95 values
 * @returns {{ uStatistic: number, zScore: number, pValue: number, isSignificant: boolean }}
 */
function mannWhitneyUTest(sampleA, sampleB) {
  const n1 = sampleA.length;
  const n2 = sampleB.length;

  if (n1 === 0 || n2 === 0) {
    return { uStatistic: 0, zScore: 0, pValue: 1, isSignificant: false };
  }

  // Combine and rank all observations
  const combined = [
    ...sampleA.map(val => ({ val, group: 'A' })),
    ...sampleB.map(val => ({ val, group: 'B' }))
  ].sort((a, b) => a.val - b.val);

  // Assign average ranks for ties
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

  // Sum of ranks for sample A
  let r1 = 0;
  for (let k = 0; k < combined.length; k++) {
    if (combined[k].group === 'A') {
      r1 += ranks[k];
    }
  }

  // Calculate U1 and U2
  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u2 = n1 * n2 - u1;
  const u = Math.min(u1, u2);

  // Normal approximation for z-score (standard for n1, n2 >= 4)
  const meanU = (n1 * n2) / 2;
  const stdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const zScore = stdU > 0 ? (u - meanU) / stdU : 0;

  // Approximate two-tailed p-value using complementary error function approximation
  const pValue = parseFloat((2 * (1 - normalCdf(Math.abs(zScore)))).toFixed(4));
  const isSignificant = pValue < 0.05;

  return {
    uStatistic: u,
    zScore: parseFloat(zScore.toFixed(3)),
    pValue,
    isSignificant
  };
}

/**
 * Standard Normal Cumulative Distribution Function (CDF) approximation
 */
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

/**
 * Compares two individual metric runs
 */
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
  if (!functionalTestsPassed) {
    return {
      verdict: 'rejected',
      reason: 'Functional unit/integration tests failed after patch application'
    };
  }

  const baselineP95s = baselineRuns.map(r => r.metrics ? r.metrics.p95 : r.p95);
  const candidateP95s = candidateRuns.map(r => r.metrics ? r.metrics.p95 : r.p95);

  const baselineStats = calculateSummaryStats(baselineP95s);
  const candidateStats = calculateSummaryStats(candidateP95s);

  const mwu = mannWhitneyUTest(baselineP95s, candidateP95s);

  // Guarded metrics check: error rate must not regress
  const baselineErrorRates = baselineRuns.map(r => r.metrics ? r.metrics.errorRate : r.errorRate || 0);
  const candidateErrorRates = candidateRuns.map(r => r.metrics ? r.metrics.errorRate : r.errorRate || 0);
  const avgBaselineErr = baselineErrorRates.reduce((a, b) => a + b, 0) / (baselineErrorRates.length || 1);
  const avgCandidateErr = candidateErrorRates.reduce((a, b) => a + b, 0) / (candidateErrorRates.length || 1);

  if (avgCandidateErr > avgBaselineErr + 0.02) {
    return {
      verdict: 'rejected',
      reason: `Guarded metric errorRate regressed from ${(avgBaselineErr * 100).toFixed(1)}% to ${(avgCandidateErr * 100).toFixed(1)}%`,
      baselineStats,
      candidateStats,
      mwu
    };
  }

  // Guarded metrics check: memory must not inflate beyond 50%
  const baselineMem = baselineRuns.map(r => r.metrics ? r.metrics.memoryMaxMb : r.memoryMaxMb || 0);
  const candidateMem = candidateRuns.map(r => r.metrics ? r.metrics.memoryMaxMb : r.memoryMaxMb || 0);
  const avgBaseMem = baselineMem.reduce((a, b) => a + b, 0) / (baselineMem.length || 1);
  const avgCandMem = candidateMem.reduce((a, b) => a + b, 0) / (candidateMem.length || 1);

  if (avgCandMem > avgBaseMem * 1.5 && avgBaseMem > 0) {
    return {
      verdict: 'rejected',
      reason: `Guarded metric memory inflated from ${avgBaseMem.toFixed(1)}MB to ${avgCandMem.toFixed(1)}MB`,
      baselineStats,
      candidateStats,
      mwu
    };
  }

  // Latency check: candidate mean should be lower than baseline mean
  const latencyImproved = candidateStats.mean < baselineStats.mean;

  if (latencyImproved && mwu.isSignificant) {
    return {
      verdict: 'accepted',
      reason: `Significant p95 reduction from ${baselineStats.mean}ms to ${candidateStats.mean}ms (p=${mwu.pValue})`,
      baselineStats,
      candidateStats,
      mwu
    };
  } else if (latencyImproved && !mwu.isSignificant) {
    return {
      verdict: 'inconclusive',
      reason: `Latency improved from ${baselineStats.mean}ms to ${candidateStats.mean}ms, but difference is within run-to-run noise (p=${mwu.pValue} >= 0.05)`,
      baselineStats,
      candidateStats,
      mwu
    };
  } else {
    return {
      verdict: 'rejected',
      reason: `Candidate p95 latency (${candidateStats.mean}ms) was not better than baseline (${baselineStats.mean}ms)`,
      baselineStats,
      candidateStats,
      mwu
    };
  }
}

module.exports = {
  calculateSummaryStats,
  mannWhitneyUTest,
  compareSingleMetrics,
  evaluateCandidateRun
};
