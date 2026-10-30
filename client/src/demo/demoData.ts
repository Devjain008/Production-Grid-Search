/**
 * Comprehensive Production Demo Data Fixtures for EVOLVE
 * Realistic Node/Express app (buggy-shop) with complete multi-signal defect reports,
 * raw latency distributions, empirical confidence intervals, and LangGraph agent logs.
 */

export const DEMO_PROJECT = {
  _id: 'demo-buggy-shop-001',
  name: 'buggy-shop (E-Commerce API)',
  status: 'optimizing',
  type: 'archive',
  createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  lastActivity: new Date().toISOString(),
  headlineResult: 'p95 latency reduced from 440ms to 148ms (-66%) • 3 fixes accepted',
  meta: {
    framework: 'express',
    entryPoint: 'server.js',
    startCommand: 'node server.js',
    port: 3000,
    services: ['mongodb'],
    dependencies: {
      express: '^4.19.2',
      mongoose: '^8.3.2',
      bcryptjs: '^2.4.3',
      jsonwebtoken: '^9.0.2',
      cors: '^2.8.5'
    }
  },
  routes: [
    { method: 'GET', path: '/api/orders', handler: 'getOrdersWithDetails', file: 'controllers/orderController.js', line: 42 },
    { method: 'GET', path: '/api/products', handler: 'listProducts', file: 'controllers/productController.js', line: 18 },
    { method: 'POST', path: '/api/auth/login', handler: 'login', file: 'controllers/authController.js', line: 31 },
    { method: 'GET', path: '/api/reviews', handler: 'getReviews', file: 'controllers/reviewController.js', line: 12 },
    { method: 'GET', path: '/health', handler: 'healthCheck', file: 'server.js', line: 55 }
  ]
};

export const DEMO_BASELINE = {
  runId: 'baseline-run-001',
  projectId: 'demo-buggy-shop-001',
  timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
  hardware: 'Sandbox Container (2 vCPU, 2GB RAM, Node.js 20.12 LTS)',
  loadProfile: 'standard_load',
  rawLatencyRuns: [432, 448, 439, 445, 436], // Raw runs for boxplot
  summary: {
    p50: 18.5,
    p90: 215.0,
    p95: 440.0,
    p99: 468.0,
    throughput: 56.4,
    errorRate: 0.0,
    peakMemoryMb: 94.2,
    eventLoopLagP95: 14.8,
    n: 5,
    confidenceIntervalP95: [432, 448]
  },
  routes: [
    {
      route: 'GET /api/orders',
      p50: 38.0,
      p95: 440.0,
      p99: 472.0,
      rps: 24.2,
      errorRate: 0.0,
      status: 'critical_bottleneck',
      flamegraphHotness: 68.4
    },
    {
      route: 'GET /api/products',
      p50: 12.0,
      p95: 165.0,
      p99: 185.0,
      rps: 38.5,
      errorRate: 0.0,
      status: 'warning',
      flamegraphHotness: 21.0
    },
    {
      route: 'POST /api/auth/login',
      p50: 180.0,
      p95: 285.0,
      p99: 310.0,
      rps: 14.2,
      errorRate: 0.0,
      status: 'warning',
      flamegraphHotness: 34.5
    },
    {
      route: 'GET /api/reviews',
      p50: 8.5,
      p95: 45.0,
      p99: 60.0,
      rps: 46.0,
      errorRate: 0.0,
      status: 'healthy',
      flamegraphHotness: 4.2
    },
    {
      route: 'GET /health',
      p50: 2.1,
      p95: 4.8,
      p99: 6.2,
      rps: 120.0,
      errorRate: 0.0,
      status: 'healthy',
      flamegraphHotness: 0.8
    }
  ],
  profiles: {
    load: { rps: 56.4, p95: 440, memory: 94.2, lag: 14.8, duration: '60s' },
    stress: { breakingPointRps: 182, breakingPointUsers: 145, maxP95: 1840, duration: '90s' },
    spike: { surgeP95: 890, recoveryTimeMs: 420, droppedConnections: 0, duration: '45s' },
    soak: { duration: '10m', heapSlope: '+0.04MB/min', memoryLeakDetected: false }
  }
};

export const DEMO_DEFECTS = [
  {
    rank: 1,
    id: 'defect-001',
    file: 'controllers/orderController.js',
    line: 42,
    functionName: 'getOrdersWithDetails',
    category: 'db_n_plus_one',
    suspicionScore: 0.94,
    suggestedStrategy: 'batch',
    signals: {
      static: { present: true, severity: 0.95, rule: 'LoopQueryDetector (Mongoose find inside forEach)' },
      profiler: { present: true, hotness: 0.68, cpuTimeMs: 3840 },
      anomaly: { present: true, score: 0.88, latencySpikeRatio: 3.8 }
    },
    codeSnippet: `// controllers/orderController.js:42\nconst orders = await Order.find({ userId: req.user.id });\n// BOTTLENECK: N+1 query loop fetching customer items individually\nfor (const order of orders) {\n  order.items = await OrderItem.find({ orderId: order._id });\n}\nres.json(orders);`,
    whyItMatters: 'Every order causes an additional database network round-trip. With 50 orders, the database executes 51 separate queries sequentially, causing tail latency to skyrocket.'
  },
  {
    rank: 2,
    id: 'defect-002',
    file: 'models/Product.js',
    line: 18,
    functionName: 'listProducts',
    category: 'unindexed_query',
    suspicionScore: 0.82,
    suggestedStrategy: 'index',
    signals: {
      static: { present: true, severity: 0.85, rule: 'MissingCompoundIndex (category + inStock)' },
      profiler: { present: false, hotness: 0.21, cpuTimeMs: 820 },
      anomaly: { present: true, score: 0.76, latencySpikeRatio: 2.1 }
    },
    codeSnippet: `// models/Product.js:18\n// Unindexed compound filter causes full collection table scan\nconst products = await Product.find({ \n  category: req.query.category, \n  inStock: true \n}).sort({ price: 1 });`,
    whyItMatters: 'MongoDB performs an in-memory COLLSCAN across all inventory items, consuming high memory and delaying product catalog lookups.'
  },
  {
    rank: 3,
    id: 'defect-003',
    file: 'controllers/authController.js',
    line: 31,
    functionName: 'login',
    category: 'sync_blocking',
    suspicionScore: 0.74,
    suggestedStrategy: 'async',
    signals: {
      static: { present: true, severity: 0.80, rule: 'SyncCryptoDetector (bcrypt.compareSync on event loop)' },
      profiler: { present: true, hotness: 0.82, cpuTimeMs: 4120 },
      anomaly: { present: false, score: 0.32, latencySpikeRatio: 1.2 }
    },
    codeSnippet: `// controllers/authController.js:31\n// Synchronous password hashing freezes the Node.js event loop\nconst valid = bcrypt.compareSync(req.body.password, user.passwordHash);`,
    whyItMatters: 'Synchronous crypto execution blocks the single-threaded Node.js event loop for 180ms, stalling all other concurrent HTTP requests.'
  }
];

export const DEMO_EXPERIMENTS = [
  {
    _id: 'exp-001',
    experimentId: 'exp-001',
    defectRank: 1,
    hotspot: {
      file: 'controllers/orderController.js',
      line: 42,
      function: 'getOrdersWithDetails',
      category: 'db_n_plus_one'
    },
    strategy: 'batch',
    status: 'completed',
    verdict: 'accepted',
    reward: 0.88,
    metricsBefore: { p95: 440.0, rps: 24.2, errorRate: 0.0, memory: 94.2 },
    metricsAfter: { p95: 148.0, rps: 58.6, errorRate: 0.0, memory: 88.5 },
    rawCandidateRuns: [142, 151, 146, 155, 148],
    rawBaselineRuns: [432, 448, 439, 445, 436],
    stats: {
      deltaPct: -66.4,
      ci: [-72.1, -59.3],
      pValue: 0.0079,
      effectSize: 2.84,
      nBefore: 5,
      nAfter: 5,
      verdictReason: 'Accepted: p95 improved by 66.4% (p=0.008 < 0.05). Functional tests passed with 0 error rate regressions.'
    },
    diff: `--- a/controllers/orderController.js
+++ b/controllers/orderController.js
@@ -42,5 +42,9 @@
-for (const order of orders) {
-  order.items = await OrderItem.find({ orderId: order._id });
-}
+const orderIds = orders.map(o => o._id);
+const allItems = await OrderItem.find({ orderId: { $in: orderIds } }).lean();
+const itemsByOrder = allItems.reduce((acc, item) => {
+  (acc[item.orderId] = acc[item.orderId] || []).push(item);
+  return acc;
+}, {});
+orders.forEach(o => { o.items = itemsByOrder[o._id] || []; });`,
    diffStats: { additions: 7, deletions: 3 },
    critic: {
      passed: true,
      score: 0.95,
      reason: 'Surgical single-query batch retrieval via $in operator. Functional tests pass, no semantic divergence.'
    },
    humanReview: {
      approved: true,
      reviewedBy: 'Lead Performance Architect',
      timestamp: new Date().toISOString()
    }
  },
  {
    _id: 'exp-002',
    experimentId: 'exp-002',
    defectRank: 2,
    hotspot: {
      file: 'models/Product.js',
      line: 18,
      function: 'listProducts',
      category: 'unindexed_query'
    },
    strategy: 'index',
    status: 'completed',
    verdict: 'accepted',
    reward: 0.74,
    metricsBefore: { p95: 165.0, rps: 38.5, errorRate: 0.0, memory: 94.2 },
    metricsAfter: { p95: 42.0, rps: 82.0, errorRate: 0.0, memory: 95.1 },
    rawCandidateRuns: [40, 44, 41, 43, 42],
    rawBaselineRuns: [160, 168, 164, 170, 165],
    stats: {
      deltaPct: -74.5,
      ci: [-80.2, -68.4],
      pValue: 0.0079,
      effectSize: 3.12,
      nBefore: 5,
      nAfter: 5,
      verdictReason: 'Accepted: Compound index added for category and inStock. Table scan eliminated.'
    },
    diff: `--- a/models/Product.js
+++ b/models/Product.js
@@ -18,1 +18,2 @@
+// Compound index to optimize catalog search & filtering
+productSchema.index({ category: 1, inStock: 1, price: 1 });`,
    diffStats: { additions: 2, deletions: 0 },
    critic: {
      passed: true,
      score: 0.98,
      reason: 'Safe index creation matching query predicate. Functional tests pass.'
    },
    humanReview: {
      approved: true,
      reviewedBy: 'Database Administrator',
      timestamp: new Date().toISOString()
    }
  },
  {
    _id: 'exp-003',
    experimentId: 'exp-003',
    defectRank: 1,
    hotspot: {
      file: 'controllers/orderController.js',
      line: 42,
      function: 'getOrdersWithDetails',
      category: 'db_n_plus_one'
    },
    strategy: 'cache',
    status: 'completed',
    verdict: 'rejected_by_critic',
    reward: 0.0,
    metricsBefore: { p95: 440.0, rps: 24.2, errorRate: 0.0 },
    metricsAfter: { p95: 440.0, rps: 24.2, errorRate: 0.0 },
    stats: {
      deltaPct: 0.0,
      ci: [0, 0],
      pValue: 1.0,
      nBefore: 5,
      nAfter: 0,
      verdictReason: 'Critic Filter Rejection: Candidate patch introduced an in-memory global cache map without TTL, max size, or cache eviction, causing memory leak risks.'
    },
    diff: `--- a/controllers/orderController.js
+++ b/controllers/orderController.js
@@ -40,3 +40,5 @@
+// CRITIC FLAGGED: Unbounded memory leak
+const orderCache = {};
+if (orderCache[req.user.id]) return res.json(orderCache[req.user.id]);`,
    diffStats: { additions: 3, deletions: 0 },
    critic: {
      passed: false,
      score: 0.15,
      reason: 'Rejected by Critic Filter: Missing TTL and invalidation strategy. Leaks memory in long-running processes.'
    },
    lessonLearned: 'Caching database queries without TTL or eviction guarantees will inevitably inflate heap memory under production soak traffic.'
  },
  {
    _id: 'exp-004',
    experimentId: 'exp-004',
    defectRank: 3,
    hotspot: {
      file: 'controllers/authController.js',
      line: 31,
      function: 'login',
      category: 'sync_blocking'
    },
    strategy: 'async',
    status: 'completed',
    verdict: 'accepted',
    reward: 0.81,
    metricsBefore: { p95: 285.0, rps: 14.2, errorRate: 0.0, memory: 94.2 },
    metricsAfter: { p95: 68.0, rps: 45.1, errorRate: 0.0, memory: 96.0 },
    rawCandidateRuns: [65, 71, 67, 70, 68],
    rawBaselineRuns: [280, 292, 284, 290, 285],
    stats: {
      deltaPct: -76.1,
      ci: [-82.0, -69.5],
      pValue: 0.0079,
      effectSize: 2.95,
      nBefore: 5,
      nAfter: 5,
      verdictReason: 'Accepted: Converted bcrypt.compareSync to non-blocking async await bcrypt.compare. Event loop lag fell from 14.8ms to 1.2ms.'
    },
    diff: `--- a/controllers/authController.js
+++ b/controllers/authController.js
@@ -31,1 +31,1 @@
-const valid = bcrypt.compareSync(req.body.password, user.passwordHash);
+const valid = await bcrypt.compare(req.body.password, user.passwordHash);`,
    diffStats: { additions: 1, deletions: 1 },
    critic: {
      passed: true,
      score: 0.99,
      reason: 'Optimal asynchronous offload to libuv worker pool.'
    },
    humanReview: {
      approved: false, // Pending review
      reviewedBy: null
    }
  },
  {
    _id: 'exp-005',
    experimentId: 'exp-005',
    defectRank: 1,
    hotspot: {
      file: 'controllers/orderController.js',
      line: 42,
      function: 'getOrdersWithDetails',
      category: 'db_n_plus_one'
    },
    strategy: 'pagination',
    status: 'completed',
    verdict: 'inconclusive',
    reward: 0.0,
    metricsBefore: { p95: 440.0, rps: 24.2, errorRate: 0.0 },
    metricsAfter: { p95: 436.0, rps: 24.5, errorRate: 0.0 },
    rawCandidateRuns: [431, 442, 435, 439, 436],
    rawBaselineRuns: [432, 448, 439, 445, 436],
    stats: {
      deltaPct: -0.9,
      ci: [-3.4, +1.8],
      pValue: 0.42,
      effectSize: 0.12,
      nBefore: 5,
      nAfter: 5,
      verdictReason: 'Inconclusive: Observed 0.9% speed difference is within standard benchmark noise (p=0.42 > 0.05). No statistically significant gain detected.'
    },
    diff: `--- a/controllers/orderController.js
+++ b/controllers/orderController.js
@@ -42,1 +42,1 @@
-const orders = await Order.find({ userId: req.user.id });
+const orders = await Order.find({ userId: req.user.id }).limit(50);`,
    diffStats: { additions: 1, deletions: 1 },
    critic: {
      passed: true,
      score: 0.90,
      reason: 'Valid limit pagination, but synthetic workload requests fewer than 50 orders so no empirical impact occurred.'
    },
    lessonLearned: 'Adding query limits when test dataset sizes are smaller than the limit boundary produces no measurable latency delta.'
  }
];

export const DEMO_POLICY_STATE = {
  mode: 'shadow',
  arms: ['batch', 'cache', 'async', 'index', 'pagination', 'pool', 'compression'],
  totalDecisions: 74,
  agreementRate: 0.865, // 86.5% agreement between Rule and Learned bandit
  explorationRate: 0.15,
  categories: [
    {
      category: 'db_n_plus_one',
      recommendedArm: 'batch',
      confidence: 0.92,
      armRewards: { batch: 0.88, cache: 0.12, async: 0.22, index: 0.05, pagination: 0.35, pool: 0.18, compression: 0.02 },
      sampleSizes: { batch: 18, cache: 14, async: 6, index: 2, pagination: 5, pool: 3, compression: 1 }
    },
    {
      category: 'unindexed_query',
      recommendedArm: 'index',
      confidence: 0.96,
      armRewards: { index: 0.91, cache: 0.45, batch: 0.15, async: 0.08, pagination: 0.52, pool: 0.20, compression: 0.05 },
      sampleSizes: { index: 22, cache: 8, batch: 4, async: 1, pagination: 7, pool: 2, compression: 0 }
    },
    {
      category: 'sync_blocking',
      recommendedArm: 'async',
      confidence: 0.94,
      armRewards: { async: 0.86, pool: 0.42, batch: 0.04, cache: 0.18, index: 0.02, pagination: 0.08, compression: 0.01 },
      sampleSizes: { async: 16, pool: 9, batch: 2, cache: 5, index: 0, pagination: 1, compression: 0 }
    }
  ]
};

export const DEMO_LOG_STREAM = [
  { timestamp: new Date(Date.now() - 65000).toISOString(), level: 'INFO', agent: 'Analyzer', message: 'AST ASTParser scanned 28 files. Detected 3 primary bottleneck candidates.' },
  { timestamp: new Date(Date.now() - 58000).toISOString(), level: 'INFO', agent: 'Retriever', message: 'Qdrant vector retrieval matched 4 similar prior optimizations for category:db_n_plus_one.' },
  { timestamp: new Date(Date.now() - 48000).toISOString(), level: 'INFO', agent: 'Patcher', message: 'Synthesized surgical Mongoose $in batch query diff for controllers/orderController.js:42.' },
  { timestamp: new Date(Date.now() - 42000).toISOString(), level: 'INFO', agent: 'Critic', message: 'Critic safety inspection passed (Score: 0.95). No reward-hacks or unbounded caches found.' },
  { timestamp: new Date(Date.now() - 35000).toISOString(), level: 'INFO', agent: 'Sandbox', message: 'Patched source mounted into isolated container. Functional test suite passing (14/14 tests).' },
  { timestamp: new Date(Date.now() - 25000).toISOString(), level: 'INFO', agent: 'Benchmark', message: 'Executing empirical 5-run k6 benchmark pass. Measuring tail latency p95 and event loop lag.' },
  { timestamp: new Date(Date.now() - 12000).toISOString(), level: 'INFO', agent: 'Benchmark', message: 'Run 1: 142ms | Run 2: 151ms | Run 3: 146ms | Run 4: 155ms | Run 5: 148ms (Median: 148ms).' },
  { timestamp: new Date(Date.now() - 4000).toISOString(), level: 'INFO', agent: 'Decide', message: 'Mann-Whitney U statistical significance test p=0.0079 < 0.05. VERDICT: ACCEPTED.' },
  { timestamp: new Date().toISOString(), level: 'INFO', agent: 'Record', message: 'Experiment #exp-001 persisted into MongoDB and indexed into Qdrant vector memory.' }
];
