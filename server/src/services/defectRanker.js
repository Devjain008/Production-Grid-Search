/**
 * Defect Fusion and Ranking Engine
 * Formula:
 * suspicion(function) = w_static * static_severity_norm + w_profile * profile_hotness_norm + w_anomaly * anomaly_score_of_its_route
 *
 * Joins static analysis findings, profiler hot functions, and per-route anomaly scores.
 * Maps defects to concrete optimization strategies (batch, async, pagination, index, cache, pool, compression).
 */

const STRATEGY_RULE_MAP = {
  'n-plus-one-query': 'batch',
  'sync-calls-in-handlers': 'async',
  'unhandled-promise-rejection': 'async',
  'missing-pagination': 'pagination',
  'unindexed-filter': 'index',
  'unbounded-cache': 'cache',
  'missing-timeouts': 'pool',
  'missing-connection-pool': 'pool',
  'oversized-payload': 'compression',
  'high-cyclomatic-complexity': 'async'
};

function inferStrategy(staticFindings = [], anomalyData = null, profileData = null) {
  for (const f of staticFindings) {
    if (STRATEGY_RULE_MAP[f.ruleId]) {
      return STRATEGY_RULE_MAP[f.ruleId];
    }
  }

  if (anomalyData && anomalyData.topContributingMetric === 'memoryMb') {
    return 'cache';
  }

  if (profileData && profileData.selfTimePercent > 25) {
    return 'async';
  }

  return 'none';
}

function fuseAndRankDefects(staticFindings = [], profileResults = {}, anomalyResults = [], customWeights = {}) {
  const wStatic = customWeights.wStatic !== undefined ? customWeights.wStatic : (parseFloat(process.env.DEFECT_WEIGHT_STATIC) || 0.4);
  const wProfile = customWeights.wProfile !== undefined ? customWeights.wProfile : (parseFloat(process.env.DEFECT_WEIGHT_PROFILE) || 0.4);
  const wAnomaly = customWeights.wAnomaly !== undefined ? customWeights.wAnomaly : (parseFloat(process.env.DEFECT_WEIGHT_ANOMALY) || 0.2);

  // Normalize weight sum
  const sumWeights = wStatic + wProfile + wAnomaly || 1.0;
  const nwStatic = wStatic / sumWeights;
  const nwProfile = wProfile / sumWeights;
  const nwAnomaly = wAnomaly / sumWeights;

  const hotFunctions = profileResults.topHotFunctions || [];
  const anomalyList = Array.isArray(anomalyResults) ? anomalyResults : (anomalyResults.anomalies || []);

  // Map of unified hotspots: key -> { file, line, functionName, static: [], profile: null, anomaly: null }
  const hotspots = new Map();

  function getKey(file, func) {
    const cleanFile = (file || 'server.js').split(/[\/\\]/).pop();
    const cleanFunc = func || 'anonymous';
    return `${cleanFile}:${cleanFunc}`;
  }

  // 1. Ingest Static Findings
  for (const sf of staticFindings) {
    const key = getKey(sf.file, sf.functionName);
    if (!hotspots.has(key)) {
      hotspots.set(key, {
        file: sf.file,
        line: sf.line,
        function: sf.functionName,
        static: [],
        profile: null,
        anomaly: null
      });
    }
    hotspots.get(key).static.push(sf);
    // Keep lowest line number if multiple
    if (sf.line && sf.line < hotspots.get(key).line) {
      hotspots.get(key).line = sf.line;
    }
  }

  // 2. Ingest Profiler Hot Functions
  for (const hf of hotFunctions) {
    const key = getKey(hf.file, hf.functionName);
    if (!hotspots.has(key)) {
      hotspots.set(key, {
        file: hf.file,
        line: hf.line,
        function: hf.functionName,
        static: [],
        profile: null,
        anomaly: null
      });
    }
    hotspots.get(key).profile = hf;
    if (hf.line && (!hotspots.get(key).line || hotspots.get(key).line === 1)) {
      hotspots.get(key).line = hf.line;
    }
  }

  // 3. Associate Anomaly Signals with Hotspots
  for (const anom of anomalyList) {
    const routeLower = (anom.route || '').toLowerCase();
    for (const [key, hs] of hotspots.entries()) {
      const funcLower = hs.function.toLowerCase();
      // Match function name to route token (e.g. loginHandler matches /login, getOrdersHandler matches /orders)
      const token = funcLower.replace(/handler|get|post|put|delete|api/gi, '');
      if (token && routeLower.includes(token)) {
        if (!hs.anomaly || hs.anomaly.anomalyScore < anom.anomalyScore) {
          hs.anomaly = anom;
        }
      }
    }
  }

  // 4. Score and Rank Hotspots
  const ranked = [];
  for (const [key, hs] of hotspots.entries()) {
    // Static severity normalized (1-5 -> 0.2 - 1.0)
    let staticNorm = 0.0;
    if (hs.static.length > 0) {
      const maxSev = Math.max(...hs.static.map(s => s.severity || 1));
      staticNorm = maxSev / 5.0;
    }

    // Profile hotness normalized (selfTimePercent 0-100% -> 0.0 - 1.0)
    let profileNorm = 0.0;
    if (hs.profile && hs.profile.selfTimePercent) {
      profileNorm = Math.min(1.0, hs.profile.selfTimePercent / 50.0);
    }

    // Anomaly score (0.0 - 1.0)
    let anomalyScore = 0.0;
    if (hs.anomaly && hs.anomaly.anomalyScore) {
      anomalyScore = hs.anomaly.anomalyScore;
    }

    // Count how many independent signals are present
    let signalCount = 0;
    if (hs.static.length > 0) signalCount++;
    if (hs.profile) signalCount++;
    if (hs.anomaly) signalCount++;

    const isSingleSignal = signalCount <= 1;

    // Defect suspicion score
    const score = parseFloat((nwStatic * staticNorm + nwProfile * profileNorm + nwAnomaly * anomalyScore).toFixed(4));
    const strategy = inferStrategy(hs.static, hs.anomaly, hs.profile);

    ranked.push({
      file: hs.file,
      line: hs.line,
      function: hs.function,
      score,
      isSingleSignal,
      signalCount,
      evidence: {
        static: hs.static,
        profile: hs.profile,
        anomaly: hs.anomaly
      },
      suggestedStrategy: strategy
    });
  }

  // Sort descending by suspicion score
  ranked.sort((a, b) => b.score - a.score);

  // Assign 1-indexed ranks and return top 20
  const top20 = ranked.slice(0, 20).map((defect, index) => ({
    rank: index + 1,
    ...defect
  }));

  return {
    totalDefectsFound: ranked.length,
    rankedDefects: top20,
    weights: {
      wStatic: nwStatic,
      wProfile: nwProfile,
      wAnomaly: nwAnomaly
    }
  };
}

module.exports = {
  fuseAndRankDefects,
  inferStrategy
};
