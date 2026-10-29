const {
  calculateSummaryStats,
  mannWhitneyUTest,
  compareSingleMetrics,
  evaluateCandidateRun
} = require('../src/services/metricsCompare');

describe('MetricsCompare Unit Tests', () => {
  describe('Summary Statistics', () => {
    test('calculates accurate mean, variance, and standard deviation', () => {
      const data = [100, 110, 105, 95, 90];
      const stats = calculateSummaryStats(data);

      expect(stats.count).toBe(5);
      expect(stats.mean).toBe(100);
      expect(stats.min).toBe(90);
      expect(stats.max).toBe(110);
      expect(stats.variance).toBeGreaterThan(0);
      expect(stats.stdDev).toBeGreaterThan(0);
    });

    test('handles empty or single-element arrays gracefully', () => {
      const empty = calculateSummaryStats([]);
      expect(empty.count).toBe(0);
      expect(empty.mean).toBe(0);

      const single = calculateSummaryStats([42]);
      expect(single.count).toBe(1);
      expect(single.mean).toBe(42);
    });
  });

  describe('Mann-Whitney U Significance Test', () => {
    test('detects significant difference between distinctly separated distributions', () => {
      // Baseline latency p95: 5 runs around 300ms
      const baseline = [295, 305, 310, 290, 315];
      // Candidate latency p95: 5 runs around 120ms
      const candidate = [115, 125, 120, 110, 130];

      const result = mannWhitneyUTest(baseline, candidate);
      expect(result.isSignificant).toBe(true);
      expect(result.pValue).toBeLessThan(0.05);
      expect(result.uStatistic).toBe(0); // Perfect separation
    });

    test('identifies overlapping distributions as statistically non-significant (noise)', () => {
      const sampleA = [200, 205, 210, 202, 208];
      const sampleB = [201, 204, 209, 203, 207];

      const result = mannWhitneyUTest(sampleA, sampleB);
      expect(result.isSignificant).toBe(false);
      expect(result.pValue).toBeGreaterThan(0.05);
    });
  });

  describe('Single Run Metrics Comparison', () => {
    test('calculates percentage changes and improvement indicators', () => {
      const baseline = { p95: 250, rps: 100, errorRate: 0.05, memoryMaxMb: 120 };
      const candidate = { p95: 125, rps: 200, errorRate: 0.01, memoryMaxMb: 110 };

      const comparison = compareSingleMetrics(baseline, candidate);

      // p95 latency reduced by 50%
      expect(comparison.p95.percent).toBe(-50);
      expect(comparison.p95.improved).toBe(true);

      // RPS doubled
      expect(comparison.rps.percent).toBe(100);
      expect(comparison.rps.improved).toBe(true);

      // Error rate reduced
      expect(comparison.errorRate.improved).toBe(true);
    });
  });

  describe('Candidate Patch Quality Evaluation (>= 5 runs + Guarded Metrics)', () => {
    const createRuns = (p95Values, errorRate = 0.0, memMb = 100) => {
      return p95Values.map(p95 => ({
        metrics: { p95, errorRate, memoryMaxMb: memMb }
      }));
    };

    test('accepts patch when functional tests pass and p95 improves significantly', () => {
      const baselineRuns = createRuns([280, 290, 300, 310, 295]);
      const candidateRuns = createRuns([120, 125, 130, 115, 122]);

      const evaluation = evaluateCandidateRun(baselineRuns, candidateRuns, true);
      expect(evaluation.verdict).toBe('accepted');
      expect(evaluation.reason).toContain('Significant p95 reduction');
    });

    test('rejects patch immediately if functional tests fail', () => {
      const baselineRuns = createRuns([300, 310, 290, 305, 295]);
      const candidateRuns = createRuns([50, 50, 50, 50, 50]); // Suspiciously fast because code was skipped!

      const evaluation = evaluateCandidateRun(baselineRuns, candidateRuns, false);
      expect(evaluation.verdict).toBe('rejected');
      expect(evaluation.reason).toContain('Functional unit/integration tests failed');
    });

    test('rejects patch if guarded metric errorRate regresses', () => {
      const baselineRuns = createRuns([300, 310, 290, 305, 295], 0.0);
      const candidateRuns = createRuns([100, 105, 95, 110, 102], 0.15); // Fast but 15% error rate!

      const evaluation = evaluateCandidateRun(baselineRuns, candidateRuns, true);
      expect(evaluation.verdict).toBe('rejected');
      expect(evaluation.reason).toContain('Guarded metric errorRate regressed');
    });

    test('rejects patch if guarded metric memory inflates beyond 50%', () => {
      const baselineRuns = createRuns([300, 310, 290, 305, 295], 0.0, 100);
      const candidateRuns = createRuns([150, 155, 160, 145, 150], 0.0, 250); // Severe memory leak

      const evaluation = evaluateCandidateRun(baselineRuns, candidateRuns, true);
      expect(evaluation.verdict).toBe('rejected');
      expect(evaluation.reason).toContain('Guarded metric memory inflated');
    });

    test('labels inconclusive when improvement is within run-to-run noise', () => {
      const baselineRuns = createRuns([200, 205, 210, 202, 208]);
      const candidateRuns = createRuns([198, 202, 207, 200, 206]);

      const evaluation = evaluateCandidateRun(baselineRuns, candidateRuns, true);
      expect(evaluation.verdict).toBe('inconclusive');
    });
  });
});
