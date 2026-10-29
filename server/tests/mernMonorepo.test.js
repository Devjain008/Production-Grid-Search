const path = require('path');
const fs = require('fs');
const os = require('os');
const AdmZip = require('adm-zip');
const { findExpressServiceDir } = require('../src/controllers/projectController');
const { detectProjectRoutes } = require('../src/services/routeDetector');
const { SandboxRunner } = require('../src/services/sandboxRunner');

describe('MERN Monorepo & Zip Extraction Tests', () => {
  let extractDir;
  let runner;
  let runId;

  beforeAll(() => {
    runner = new SandboxRunner({ timeoutMs: 25000 });
    runId = `mern-test-${Date.now()}`;
  });

  afterAll(async () => {
    if (runId && runner) {
      await runner.stopSandbox(runId);
    }
    if (extractDir) {
      try { fs.rmSync(extractDir, { recursive: true, force: true }); } catch (e) {}
    }
  });

  test('extracts mern-fullstack-app.zip and automatically identifies Express backend service folder', () => {
    const zipPath = path.resolve(__dirname, '../../samples/mern-fullstack-app.zip');
    expect(fs.existsSync(zipPath)).toBe(true);

    extractDir = path.join(os.tmpdir(), `evolve-mern-extract-${Date.now()}`);
    fs.mkdirSync(extractDir, { recursive: true });

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractDir, true);

    // Verify smart detection resolves the backend folder
    const effectiveDir = findExpressServiceDir(extractDir);
    expect(effectiveDir).toBeDefined();
    expect(effectiveDir).toContain('backend');
    expect(fs.existsSync(path.join(effectiveDir, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(effectiveDir, 'server.js'))).toBe(true);
  });

  test('discovers all MERN API routes from extracted backend', () => {
    const effectiveDir = findExpressServiceDir(extractDir);
    const routes = detectProjectRoutes(effectiveDir);

    expect(routes.length).toBeGreaterThanOrEqual(4);
    const paths = routes.map(r => r.path);
    expect(paths).toContain('/health');
    expect(paths).toContain('/api/users');
    expect(paths).toContain('/api/auth/login');
    expect(paths).toContain('/api/posts');
  });

  test('boots extracted MERN service in sandbox and passes health readiness check', async () => {
    const effectiveDir = findExpressServiceDir(extractDir);
    const sandboxResult = await runner.startSandbox(effectiveDir, runId, 'server.js');

    expect(sandboxResult).toBeDefined();
    expect(sandboxResult.port).toBeGreaterThan(0);
    expect(sandboxResult.health.healthy).toBe(true);
    expect(sandboxResult.health.endpoint).toBe('/health');
    expect(sandboxResult.health.statusCode).toBe(200);
  });
});
