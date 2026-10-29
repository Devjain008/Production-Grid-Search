const express = require('express');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory dataset simulating database
const mockUsers = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `User_${i + 1}`,
  role: i % 2 === 0 ? 'engineer' : 'designer'
}));

const mockItems = Array.from({ length: 25000 }, (_, i) => ({
  id: i + 1,
  title: `Product SKU-${i + 1} with high precision attributes and specifications`,
  category: ['electronics', 'apparel', 'books', 'tools'][i % 4],
  price: (i * 1.37) % 500
}));

// BUG 4: Memory Leak Store - unbounded array retaining all analytics events in memory
const memoryLeakStore = [];

// Fast health-check endpoint (Required for sandbox readiness check)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Fast lightweight route
app.get('/api/info', (req, res) => {
  res.json({
    appName: 'Buggy Express E-Commerce Sample',
    version: '1.0.0',
    status: 'running'
  });
});

// BUG 1: N+1 Simulated Query Bug
// Instead of a single batched join, it loops through each user and performs an artificial async query delay
app.get('/api/users', async (req, res) => {
  try {
    const results = [];
    for (const user of mockUsers) {
      // Simulating sequential secondary queries (N+1 database roundtrips)
      await new Promise(resolve => setTimeout(resolve, 8)); // 8ms * 25 = 200ms lag!
      results.push({
        ...user,
        profile: {
          avatar: `https://avatar.example.com/${user.id}.png`,
          lastActive: new Date().toISOString()
        }
      });
    }
    res.json({ count: results.length, users: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// BUG 2: Synchronous CPU-Blocking Hash in Request Handler
// Blocks the single-threaded Node.js event loop completely for every login request!
app.post('/api/auth/login', (req, res) => {
  const { username = 'admin', password = 'password123' } = req.body || {};
  
  // Severe event-loop lag: sync PBKDF2 with 80,000 iterations
  const salt = 'evolve_secure_static_salt_value';
  const derivedKey = crypto.pbkdf2Sync(password, salt, 80000, 32, 'sha256');

  res.json({
    success: true,
    user: username,
    token: derivedKey.toString('hex')
  });
});

// BUG 3: Unbounded Memory Leak
// Retains all incoming event payloads in an unmanaged array, steadily growing heap
app.post('/api/analytics/events', (req, res) => {
  const event = {
    receivedAt: Date.now(),
    payload: req.body,
    payloadBuffer: Buffer.alloc(1024 * 32, 'x') // 32KB buffer per hit
  };
  
  memoryLeakStore.push(event);

  res.status(201).json({
    status: 'recorded',
    eventCount: memoryLeakStore.length,
    heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  });
});

// BUG 4: Unindexed Full Collection Scan with Regex
// Searches through 25,000 objects with an unoptimized regex search
app.get('/api/items/search', (req, res) => {
  const query = (req.query.q || 'sku-1').toLowerCase();
  const regex = new RegExp(query, 'i');
  
  const matches = mockItems.filter(item => regex.test(item.title));
  
  res.json({
    query,
    totalMatches: matches.length,
    items: matches.slice(0, 10)
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Error handler]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BuggyExpress] Server listening on port ${PORT}`);
  });
}

module.exports = app;
