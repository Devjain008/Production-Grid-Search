const express = require('express');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Simulated database collections
const mockUsers = Array.from({ length: 5000 }, (_, i) => ({
  id: i + 1,
  name: `Customer_${i + 1}`,
  email: `customer${i + 1}@example.com`,
  role: i === 0 ? 'admin' : 'shopper',
  createdAt: new Date(Date.now() - i * 3600000).toISOString()
}));

const mockProducts = Array.from({ length: 10000 }, (_, i) => ({
  id: i + 1,
  title: `Shop Item #${i + 1} with premium specifications`,
  category: ['electronics', 'apparel', 'home', 'sports'][i % 4],
  price: parseFloat(((i * 7.99) % 250 + 4.99).toFixed(2)),
  inStock: i % 5 !== 0
}));

const mockOrders = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  customerId: (i % 25) + 1,
  productIds: [(i % 100) + 1, ((i + 1) % 100) + 1, ((i + 2) % 100) + 1],
  status: 'completed',
  orderDate: new Date().toISOString()
}));

const mockReviews = [];

// DEFECT 4: Unbounded In-Memory Cache (Memory Leak at module scope)
// Accumulates every search query in memory with no eviction or upper limit
const searchCache = new Map();

// Simulated asynchronous DB call with artificial latency
function simulateDbQuery(ms = 15) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Health readiness check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'buggy-shop-api',
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// DEFECT 6: No Pagination on User Listing
// Fetches and serializes entire 5,000 user collection with no limit, skip, or paging
async function getUsersHandler(req, res) {
  await simulateDbQuery(10);
  // Missing pagination: returns entire collection unbounded
  res.json({
    total: mockUsers.length,
    users: mockUsers
  });
}
app.get('/users', getUsersHandler);

// DEFECT 3: Unindexed Category Filter Scan
// Performs high-complexity unindexed full collection scan & regex matching
async function getProductsHandler(req, res) {
  const { category, minPrice } = req.query;
  await simulateDbQuery(15);

  let results = mockProducts;
  if (category) {
    // Linear unindexed scan on large dataset with regex
    const regex = new RegExp(`^${category}$`, 'i');
    results = results.filter(p => regex.test(p.category));
  }

  if (minPrice) {
    const min = parseFloat(minPrice);
    results = results.filter(p => p.price >= min);
  }

  res.json({
    count: results.length,
    products: results.slice(0, 100)
  });
}
app.get('/products', getProductsHandler);

// DEFECT 4: Unbounded In-Memory Cache on Search Handler
// Storing search queries and artificial payload blobs without TTL or max size
async function searchHandler(req, res) {
  const q = req.query.q || 'item';

  // Check unbounded cache
  if (searchCache.has(q)) {
    return res.json({ cached: true, results: searchCache.get(q) });
  }

  // Artificial CPU load and memory accumulation
  const matching = mockProducts.filter(p => p.title.toLowerCase().includes(q.toLowerCase())).slice(0, 20);
  const heavyBuffer = Buffer.alloc(1024 * 32, 'X'); // Retain 32KB per search query

  searchCache.set(q, {
    results: matching,
    payload: heavyBuffer.toString('hex').slice(0, 100),
    searchedAt: new Date()
  });

  res.json({ cached: false, count: matching.length, results: matching });
}
app.get('/search', searchHandler);

// DEFECT 1: N+1 Query in Order Retrieval
// Iterates through every order and executes separate async DB queries in a loop
async function getOrdersHandler(req, res) {
  const orders = mockOrders.slice(0, 20);
  const enrichedOrders = [];

  // N+1 Anti-Pattern: Individual async DB queries per item inside loop instead of batch query
  for (const order of orders) {
    await simulateDbQuery(20); // Query 1: Fetch customer details for order
    const customer = mockUsers.find(u => u.id === order.customerId);

    const items = [];
    for (const pid of order.productIds) {
      await simulateDbQuery(10); // Query 2..N: Individual fetch for each product
      const product = mockProducts.find(p => p.id === pid);
      if (product) items.push(product);
    }

    enrichedOrders.push({
      ...order,
      customer: customer ? { name: customer.name, email: customer.email } : null,
      items
    });
  }

  res.json({
    count: enrichedOrders.length,
    orders: enrichedOrders
  });
}
app.get('/orders', getOrdersHandler);

// DEFECT 2: Synchronous Cryptographic PBKDF2/Bcrypt Hash in Request Handler
// Blocks the Node.js event loop on every incoming login request
async function loginHandler(req, res) {
  const { username = 'admin', password = 'password123' } = req.body || {};

  // Sync PBKDF2 with 100,000 iterations blocks the single-threaded event loop for 60-120ms
  const salt = 'evolve_static_salt_fixed';
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');

  res.json({
    success: true,
    token: `jwt_token_${derivedKey.toString('hex').slice(0, 32)}`,
    username
  });
}
app.post('/login', loginHandler);

// DEFECT 5: Missing Await on Asynchronous DB Write
// Calls async DB insertion without await, causing unhandled promise rejection on failure
async function createReviewHandler(req, res) {
  const { productId = 1, rating = 5, comment = 'Great item!' } = req.body || {};

  const reviewDoc = {
    id: mockReviews.length + 1,
    productId: parseInt(productId, 10),
    rating: parseInt(rating, 10),
    comment,
    createdAt: new Date().toISOString()
  };

  // Missing await on async operation: Fire and forget without handling promises or errors
  simulateDbQuery(25).then(() => {
    mockReviews.push(reviewDoc);
  });

  res.status(201).json({
    status: 'received',
    reviewId: reviewDoc.id
  });
}
app.post('/reviews', createReviewHandler);

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BuggyShop] Server listening on port ${PORT}`);
  });
}

module.exports = app;
