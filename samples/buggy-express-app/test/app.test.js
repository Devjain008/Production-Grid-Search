const assert = require('assert');
const http = require('http');
const app = require('../server');

async function runTests() {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Running functional tests against test server on port ${port}...`);

  try {
    // 1. Health check test
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.strictEqual(healthRes.status, 200, 'Health check must return 200');
    const healthData = await healthRes.json();
    assert.strictEqual(healthData.status, 'ok', 'Health response status must be ok');
    console.log('✓ Health check passed');

    // 2. Info route test
    const infoRes = await fetch(`${baseUrl}/api/info`);
    assert.strictEqual(infoRes.status, 200, 'Info route must return 200');
    console.log('✓ Info route passed');

    // 3. Users route test
    const usersRes = await fetch(`${baseUrl}/api/users`);
    assert.strictEqual(usersRes.status, 200, 'Users route must return 200');
    const usersData = await usersRes.json();
    assert.strictEqual(usersData.count, 25, 'Users count must be 25');
    console.log('✓ Users route passed');

    // 4. Auth login test
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'tester', password: 'secretpassword' })
    });
    assert.strictEqual(loginRes.status, 200, 'Login must return 200');
    const loginData = await loginRes.json();
    assert.strictEqual(loginData.success, true, 'Login should succeed');
    console.log('✓ Login route passed');

    // 5. Search test
    const searchRes = await fetch(`${baseUrl}/api/items/search?q=SKU-10`);
    assert.strictEqual(searchRes.status, 200, 'Search route must return 200');
    console.log('✓ Search route passed');

    console.log('\nAll functional tests passed successfully!');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
