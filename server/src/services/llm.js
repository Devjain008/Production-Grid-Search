const crypto = require('crypto');
const axios = require('axios');

/**
 * Scripted Mock Diff Templates for Deterministic CI/CD Testing
 */
const SCRIPTED_DIFFS = {
  // Scenario a: Correct N+1 Batch Fix (enrich orders in batch with Map lookup)
  batch_orders_correct: `--- a/server.js
+++ b/server.js
@@ -120,18 +120,24 @@
 async function getOrdersHandler(req, res) {
   const orders = mockOrders.slice(0, 20);
-  const enrichedOrders = [];
-
-  // N+1 Anti-Pattern: Individual async DB queries per item inside loop instead of batch query
-  for (const order of orders) {
-    await simulateDbQuery(20); // Query 1: Fetch customer details for order
-    const customer = mockUsers.find(u => u.id === order.customerId);
-
-    const items = [];
-    for (const pid of order.productIds) {
-      await simulateDbQuery(10); // Query 2..N: Individual fetch for each product
-      const product = mockProducts.find(p => p.id === pid);
-      if (product) items.push(product);
-    }
-
-    enrichedOrders.push({
-      ...order,
-      customer: customer ? { name: customer.name, email: customer.email } : null,
-      items
-    });
-  }
+  // Optimized Batch Query: 1 single async lookup instead of 20+ loop queries
+  await simulateDbQuery(25);
+  const customerMap = new Map(mockUsers.map(u => [u.id, { name: u.name, email: u.email }]));
+  const productMap = new Map(mockProducts.map(p => [p.id, p]));
+  
+  const enrichedOrders = orders.map(order => ({
+    ...order,
+    customer: customerMap.get(order.customerId) || null,
+    items: order.productIds.map(pid => productMap.get(pid)).filter(Boolean)
+  }));
 
   res.json({
`,

  // Scenario b: Cache fix with NO TTL or invalidation (semantic risk)
  cache_no_invalidation: `--- a/server.js
+++ b/server.js
@@ -105,6 +105,10 @@
 async function searchHandler(req, res) {
+  // Flawed Cache: permanently retains search query with no eviction or TTL
+  if (searchCache.has(req.query.q)) {
+    return res.json({ cached: true, results: searchCache.get(req.query.q) });
+  }
   const q = req.query.q || 'item';
`,

  // Scenario c: "Fix" that returns early or empties responses (reward-hack)
  early_return_hack: `--- a/server.js
+++ b/server.js
@@ -120,10 +120,4 @@
 async function getOrdersHandler(req, res) {
-  const orders = mockOrders.slice(0, 20);
-  const enrichedOrders = [];
-  for (const order of orders) { ... }
-  res.json({ count: enrichedOrders.length, orders: enrichedOrders });
+  return res.json({ count: 0, orders: [] });
 }
`,

  // Scenario d: Diff that doesn't apply (syntax/build error)
  broken_unapplyable_diff: `--- a/server.js
+++ b/server.js
@@ -999,6 +999,6 @@
-This line does not exist in server.js at line 999
+Broken invalid patch syntax
`,

  // Scenario e: No-op diff with noise (adds whitespace or comment)
  noop_diff: `--- a/server.js
+++ b/server.js
@@ -38,3 +38,4 @@
 // Fast health-check endpoint
+// Added passive benchmark commentary
 app.get('/health', (req, res) => {
`,

  // Scenario f: Async crypto fix for loginHandler
  async_login_fix: `--- a/server.js
+++ b/server.js
@@ -155,7 +155,10 @@
 async function loginHandler(req, res) {
   const { username = 'admin', password = 'password123' } = req.body || {};
 
-  // Sync PBKDF2 with 100,000 iterations blocks the single-threaded event loop for 60-120ms
   const salt = 'evolve_static_salt_fixed';
-  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
+  // Optimized: Non-blocking asynchronous PBKDF2 offloaded to libuv threadpool
+  const derivedKey = await new Promise((resolve, reject) => {
+    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, key) => err ? reject(err) : resolve(key));
+  });
 
   res.json({
`
};

class LLMService {
  constructor(options = {}) {
    this.provider = options.provider || process.env.LLM_PROVIDER || 'mock';
    this.model = options.model || process.env.LLM_MODEL || 'mock-patcher-v1';
    this.temperature = options.temperature !== undefined ? options.temperature : 0.1;
    this.seed = options.seed || 42;
    this.mockScenario = options.mockScenario || 'batch_orders_correct';
  }

  setMockScenario(scenario) {
    this.mockScenario = scenario;
  }

  async generatePatch({ prompt, systemPrompt, context = {} }) {
    const promptText = `${systemPrompt}\n\n${prompt}`;
    const promptHash = crypto.createHash('sha256').update(promptText).digest('hex').slice(0, 16);

    // If mock provider or no external keys configured, return deterministic scripted diff
    if (this.provider === 'mock' || (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY)) {
      const diffContent = SCRIPTED_DIFFS[this.mockScenario] || SCRIPTED_DIFFS.batch_orders_correct;
      return {
        diff: diffContent,
        model: 'mock-patcher-v1',
        promptHash,
        tokensUsed: { prompt: 650, completion: 220, total: 870 },
        provider: 'mock'
      };
    }

    // OpenAI provider integration
    if (this.provider === 'openai' && process.env.OPENAI_API_KEY) {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: this.temperature,
        seed: this.seed
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const completion = response.data.choices[0]?.message?.content || '';
      return {
        diff: completion,
        model: this.model,
        promptHash,
        tokensUsed: {
          prompt: response.data.usage?.prompt_tokens || 0,
          completion: response.data.usage?.completion_tokens || 0,
          total: response.data.usage?.total_tokens || 0
        },
        provider: 'openai'
      };
    }

    // Default fallback
    return {
      diff: SCRIPTED_DIFFS[this.mockScenario] || SCRIPTED_DIFFS.batch_orders_correct,
      model: this.model,
      promptHash,
      tokensUsed: { prompt: 500, completion: 150, total: 650 },
      provider: 'mock'
    };
  }
}

module.exports = {
  LLMService,
  SCRIPTED_DIFFS
};
