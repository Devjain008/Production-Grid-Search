const http = require('http');
const app = require('../server');

let server;
const PORT = 4599;

beforeAll((done) => {
  server = app.listen(PORT, done);
});

afterAll((done) => {
  if (server) server.close(done);
  else done();
});

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${PORT}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    }).on('error', reject);
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(`http://127.0.0.1:${PORT}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

describe('Buggy Shop Sample App Functional Tests', () => {
  test('GET /health returns healthy status', async () => {
    const res = await get('/health');
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('ok');
  });

  test('GET /users returns users list', async () => {
    const res = await get('/users');
    expect(res.status).toBe(200);
    expect(res.data.users.length).toBeGreaterThan(0);
  });

  test('GET /products filters by category', async () => {
    const res = await get('/products?category=electronics');
    expect(res.status).toBe(200);
    expect(res.data.products.length).toBeGreaterThan(0);
  });

  test('GET /search returns matching products', async () => {
    const res = await get('/search?q=item');
    expect(res.status).toBe(200);
    expect(res.data.results).toBeDefined();
  });

  test('POST /login verifies credentials and returns token', async () => {
    const res = await post('/login', { username: 'admin', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.data.token).toBeDefined();
  });

  test('POST /reviews registers review', async () => {
    const res = await post('/reviews', { productId: 1, rating: 5, comment: 'Nice product' });
    expect(res.status).toBe(201);
    expect(res.data.reviewId).toBeDefined();
  });
});
