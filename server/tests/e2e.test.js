const path = require('path');
const { SandboxRunner } = require('../src/services/sandboxRunner');
const { LoadTester } = require('../src/services/loadTester');
const { detectProjectRoutes } = require('../src/services/routeDetector');

describe('End-to-End Pipeline Acceptance Test', () => {
  const sampleDir = path.resolve(__dirname, '../../samples/buggy-express-app');
  let runner;
  let tester;
  let runId;
  let sandboxInfo;

  beforeAll(() => {
    runner = new SandboxRunner({ timeoutMs: 30000 });
    tester = new LoadTester();
    runId = `e2e-test-${Date.now()}`;
  });

  afterAll(async () => {
    if (runId && runner) {
      await runner.stopSandbox(runId);
    }
  });

  test('Step 1: Route discovery parses all routes from sample app', () => {
    const routes = detectProjectRoutes(sampleDir);
    expect(routes.length).toBeGreaterThanOrEqual(5);

    const routePaths = routes.map(r => r.path);
    expect(routePaths).toContain('/health');
    expect(routePaths).toContain('/api/info');
    expect(routePaths).toContain('/api/users');
    expect(routePaths).toContain('/api/auth/login');
    expect(routePaths).toContain('/api/analytics/events');
    expect(routePaths).toContain('/api/items/search');
  });

  test('Step 2: Sandbox launches app, binds unprivileged port, and passes healthcheck', async () => {
    sandboxInfo = await runner.startSandbox(sampleDir, runId, 'server.js');

    expect(sandboxInfo).toBeDefined();
    expect(sandboxInfo.port).toBeGreaterThan(0);
    expect(sandboxInfo.baseUrl).toContain('http://127.0.0.1:');
    expect(sandboxInfo.health.healthy).toBe(true);
    expect(sandboxInfo.health.endpoint).toBe('/health');
    expect(sandboxInfo.health.statusCode).toBe(200);
  });

  test('Step 3: LoadTester executes synthetic load and collects complete metrics', async () => {
    const routes = detectProjectRoutes(sampleDir);

    const { metrics } = await tester.executeLoadTest(
      runId,
      sandboxInfo.baseUrl,
      routes,
      'test' // Fast 5-second verification profile
    );

    expect(metrics).toBeDefined();
    expect(metrics.totalRequests).toBeGreaterThan(0);
    expect(metrics.rps).toBeGreaterThan(0);
    expect(metrics.p50).toBeGreaterThanOrEqual(0);
    expect(metrics.p95).toBeGreaterThanOrEqual(metrics.p50);
    expect(metrics.p99).toBeGreaterThanOrEqual(metrics.p95);
    expect(metrics.errorRate).toBeDefined();
    expect(metrics.memoryAvgMb).toBeGreaterThan(0);
    expect(metrics.eventLoopLagP95Ms).toBeDefined();

    console.log(`[E2E Acceptance] Collected Metrics: p50=${metrics.p50}ms, p95=${metrics.p95}ms, p99=${metrics.p99}ms, RPS=${metrics.rps}, TotalHits=${metrics.totalRequests}`);
  }, 25000);

  test('Step 4: Sandbox stops and cleans up all resources without residual processes', async () => {
    await runner.stopSandbox(runId);
    expect(runner.activeContainers.has(runId)).toBe(false);
    expect(runner.activeChildProcesses.has(runId)).toBe(false);
  });
});
