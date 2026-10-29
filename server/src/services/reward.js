/**
 * EVOLVE Reward Function (Node.js)
 * Formula:
 * r = w1*(L_base - L_cand)/L_base - w2*max(0, E_cand - E_base) - w3*max(0, Mem_cand - Mem_base)/Mem_base - w4*[tests fail]
 */

function calculateMedian(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateReward(params, customWeights = {}) {
  const {
    baselineLatency,
    candidateLatency,
    baselineError = 0,
    candidateError = 0,
    baselineMemory = 1,
    candidateMemory = 1,
    testsPassed = true,
    verdict = 'accepted'
  } = params;

  const weights = {
    w1: customWeights.w1 !== undefined ? customWeights.w1 : (parseFloat(process.env.REWARD_W_LATENCY) || 0.5),
    w2: customWeights.w2 !== undefined ? customWeights.w2 : (parseFloat(process.env.REWARD_W_ERROR) || 0.3),
    w3: customWeights.w3 !== undefined ? customWeights.w3 : (parseFloat(process.env.REWARD_W_MEMORY) || 0.1),
    w4: customWeights.w4 !== undefined ? customWeights.w4 : (parseFloat(process.env.REWARD_W_TESTS) || 0.5)
  };

  // If verdict is inconclusive or errored, reward = 0 and excludeFromPolicy = true
  if (verdict === 'inconclusive' || verdict === 'errored') {
    return {
      reward: 0.0,
      rewardBreakdown: {
        latency: 0.0,
        errorPenalty: 0.0,
        memPenalty: 0.0,
        testPenalty: 0.0
      },
      excludeFromPolicy: true
    };
  }

  // Calculate median values if arrays were provided
  const lBase = Array.isArray(baselineLatency) ? calculateMedian(baselineLatency) : Number(baselineLatency);
  const lCand = Array.isArray(candidateLatency) ? calculateMedian(candidateLatency) : Number(candidateLatency);
  const eBase = Array.isArray(baselineError) ? calculateMedian(baselineError) : Number(baselineError);
  const eCand = Array.isArray(candidateError) ? calculateMedian(candidateError) : Number(candidateError);
  const mBase = Array.isArray(baselineMemory) ? calculateMedian(baselineMemory) : Number(baselineMemory);
  const mCand = Array.isArray(candidateMemory) ? calculateMedian(candidateMemory) : Number(candidateMemory);

  const safeLBase = lBase > 0 ? lBase : 1.0;
  const safeMBase = mBase > 0 ? mBase : 1.0;

  const latencyReward = weights.w1 * ((safeLBase - lCand) / safeLBase);
  const errorPenalty = weights.w2 * Math.max(0, eCand - eBase);
  const memPenalty = weights.w3 * (Math.max(0, mCand - safeMBase) / safeMBase);
  const testPenalty = testsPassed ? 0.0 : weights.w4;

  const rawReward = latencyReward - errorPenalty - memPenalty - testPenalty;
  const clippedReward = Math.max(-1.0, Math.min(1.0, rawReward));
  const roundedReward = parseFloat(clippedReward.toFixed(4));

  return {
    reward: roundedReward,
    rewardBreakdown: {
      latency: parseFloat(latencyReward.toFixed(4)),
      errorPenalty: parseFloat(errorPenalty.toFixed(4)),
      memPenalty: parseFloat(memPenalty.toFixed(4)),
      testPenalty: parseFloat(testPenalty.toFixed(4))
    },
    excludeFromPolicy: false
  };
}

module.exports = {
  calculateReward,
  calculateMedian
};
