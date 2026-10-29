const path = require('path');
const fs = require('fs');
const { SandboxRunner, pollHealthCheck, packDirectoryToTar } = require('../src/services/sandboxRunner');

describe('SandboxRunner Unit Tests', () => {
  let runner;

  beforeEach(() => {
    runner = new SandboxRunner({
      cpuLimitNano: 1000000000,
      memoryLimitMb: 512,
      pidsLimit: 100,
      timeoutMs: 5000,
      image: 'evolve-sandbox:latest'
    });
  });

  describe('Container Security & Isolation Configuration', () => {
    test('enforces strict resource and isolation constraints', () => {
      const config = runner.getContainerConfig(3000, 3100);

      expect(config.Image).toBe('evolve-sandbox:latest');
      expect(config.User).toBe('1001:1001'); // Non-root user
      expect(config.HostConfig.NanoCPUs).toBe(1000000000); // 1 CPU limit
      expect(config.HostConfig.Memory).toBe(512 * 1024 * 1024); // 512MB RAM
      expect(config.HostConfig.MemorySwap).toBe(512 * 1024 * 1024); // No swap
      expect(config.HostConfig.PidsLimit).toBe(100); // Anti-fork bomb
      expect(config.HostConfig.Tmpfs).toHaveProperty('/tmp');
      expect(config.HostConfig.PortBindings).toHaveProperty('3000/tcp');
      expect(config.Env).toContain('EVOLVE_SANDBOX=true');
    });
  });

  describe('Tar Stream Directory Packing', () => {
    test('packs project directory into tar stream excluding node_modules', (done) => {
      const sampleDir = path.resolve(__dirname, '../../samples/buggy-express-app');
      const tarStream = packDirectoryToTar(sampleDir);

      let bytesReceived = 0;
      tarStream.on('data', chunk => {
        bytesReceived += chunk.length;
      });

      tarStream.on('end', () => {
        expect(bytesReceived).toBeGreaterThan(100);
        done();
      });

      tarStream.resume();
    });
  });

  describe('Health Check Polling', () => {
    test('correctly handles unreachable endpoints with timeout and failure', async () => {
      const result = await pollHealthCheck('http://127.0.0.1:49999', '/health', 1000, 200);
      expect(result.healthy).toBe(false);
      expect(result.statusCode).toBeNull();
    });
  });

  describe('Process Sandbox Fallback Lifecycle', () => {
    test('starts and cleanly tears down a sandbox process', async () => {
      const sampleDir = path.resolve(__dirname, '../../samples/buggy-express-app');
      const runId = `test-run-${Date.now()}`;

      const result = await runner._startLocalSandbox(sampleDir, runId, 'server.js');
      expect(result).toHaveProperty('containerId');
      expect(result).toHaveProperty('baseUrl');
      expect(result.health.healthy).toBe(true);

      // Verify stats
      const stats = await runner.getResourceUsage(runId);
      expect(stats.memoryMb).toBeGreaterThan(0);

      // Teardown
      await runner.stopSandbox(runId);
      expect(runner.activeChildProcesses.has(runId)).toBe(false);
    });
  });
});
