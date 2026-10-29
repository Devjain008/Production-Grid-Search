const path = require('path');
const fs = require('fs');
const os = require('os');
const { findExpressServiceDir } = require('../src/controllers/projectController');

describe('Monorepo & Multi-Folder Resolution Tests', () => {
  let tempBaseDir;

  beforeEach(() => {
    tempBaseDir = path.join(os.tmpdir(), `evolve-monorepo-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    fs.mkdirSync(tempBaseDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(tempBaseDir, { recursive: true, force: true });
    } catch (e) {}
  });

  test('locates nested backend folder containing package.json with express dependency', () => {
    // Create nested frontend/ and backend/ directories
    const frontendDir = path.join(tempBaseDir, 'frontend');
    const backendDir = path.join(tempBaseDir, 'backend');

    fs.mkdirSync(frontendDir, { recursive: true });
    fs.mkdirSync(backendDir, { recursive: true });

    // Frontend has React package.json
    fs.writeFileSync(path.join(frontendDir, 'package.json'), JSON.stringify({
      name: 'client-ui',
      dependencies: { react: '^18.0.0' }
    }));

    // Backend has Express package.json
    fs.writeFileSync(path.join(backendDir, 'package.json'), JSON.stringify({
      name: 'api-server',
      dependencies: { express: '^4.19.0', cors: '^2.8.5' }
    }));

    const resolvedDir = findExpressServiceDir(tempBaseDir);
    expect(resolvedDir).toBe(backendDir);
  });

  test('falls back gracefully to root directory if express package.json is at root', () => {
    fs.writeFileSync(path.join(tempBaseDir, 'package.json'), JSON.stringify({
      name: 'root-express-app',
      dependencies: { express: '^4.19.0' }
    }));

    const resolvedDir = findExpressServiceDir(tempBaseDir);
    expect(resolvedDir).toBe(tempBaseDir);
  });
});
