const fs = require('fs');
const path = require('path');
const { calculateReward, calculateMedian } = require('../src/services/reward');

describe('EVOLVE Reward Engine Unit Tests', () => {
  test('matches shared reward test vectors with exact precision', () => {
    const vectorsPath = path.resolve(__dirname, '../../shared/reward_test_vectors.json');
    const vectors = JSON.parse(fs.readFileSync(vectorsPath, 'utf8'));

    for (const item of vectors) {
      const result = calculateReward(item.inputs, item.weights);
      expect(result.reward).toBeCloseTo(item.expectedReward, 3);
      expect(result.excludeFromPolicy).toBe(item.expectedExclude);
    }
  });

  test('calculates correct median for odd and even number arrays', () => {
    expect(calculateMedian([10, 20, 30])).toBe(20);
    expect(calculateMedian([10, 20, 30, 40])).toBe(25);
    expect(calculateMedian([50])).toBe(50);
    expect(calculateMedian([])).toBe(0);
  });

  test('enforces zero reward and exclusion for inconclusive or errored verdicts', () => {
    const inconclusiveRes = calculateReward({
      baselineLatency: 100,
      candidateLatency: 95,
      verdict: 'inconclusive'
    });
    expect(inconclusiveRes.reward).toBe(0.0);
    expect(inconclusiveRes.excludeFromPolicy).toBe(true);

    const erroredRes = calculateReward({
      baselineLatency: 100,
      candidateLatency: 0,
      verdict: 'errored'
    });
    expect(erroredRes.reward).toBe(0.0);
    expect(erroredRes.excludeFromPolicy).toBe(true);
  });

  test('clips reward strictly to [-1.0, 1.0] range', () => {
    const extremeGood = calculateReward({
      baselineLatency: 1000,
      candidateLatency: 1,
      baselineError: 0,
      candidateError: 0,
      testsPassed: true,
      verdict: 'accepted'
    }, { w1: 5.0 });
    expect(extremeGood.reward).toBe(1.0);

    const extremeBad = calculateReward({
      baselineLatency: 10,
      candidateLatency: 1000,
      baselineError: 0,
      candidateError: 1.0,
      testsPassed: false,
      verdict: 'rejected'
    }, { w2: 5.0, w4: 5.0 });
    expect(extremeBad.reward).toBe(-1.0);
  });
});
