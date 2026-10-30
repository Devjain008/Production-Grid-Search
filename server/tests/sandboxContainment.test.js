const { SandboxRunner } = require('../src/services/sandboxRunner');

describe('EVOLVE Phase 6 Sandbox Security & Containment Suite', () => {
  let runner;

  beforeEach(() => {
    runner = new SandboxRunner();
  });

  describe('Container Security Specification & cgroup Enforcements', () => {
    test('Container enforces non-root UID 1001', () => {
      const config = runner.getContainerConfig(3000, 0);
      expect(config.User).toBe('1001:1001');
    });

    test('Container drops all Linux kernel capabilities (CapDrop ALL)', () => {
      const config = runner.getContainerConfig(3000, 0);
      expect(config.HostConfig.CapDrop).toContain('ALL');
    });

    test('Container prohibits privilege escalation (no-new-privileges)', () => {
      const config = runner.getContainerConfig(3000, 0);
      expect(config.HostConfig.SecurityOpt).toContain('no-new-privileges:true');
    });

    test('Container root filesystem is mounted strictly READ-ONLY', () => {
      const config = runner.getContainerConfig(3000, 0);
      expect(config.HostConfig.ReadonlyRootfs).toBe(true);
      expect(config.HostConfig.Tmpfs['/tmp']).toContain('noexec');
      expect(config.HostConfig.Tmpfs['/tmp']).toContain('nosuid');
    });

    test('Hard resource limits: 1 Core CPU, 512MB RAM, 100 PIDs anti-fork bomb', () => {
      const config = runner.getContainerConfig(3000, 0);
      expect(config.HostConfig.NanoCPUs).toBeLessThanOrEqual(1000000000); // 1 Core
      expect(config.HostConfig.Memory).toBeLessThanOrEqual(512 * 1024 * 1024); // 512MB
      expect(config.HostConfig.MemorySwap).toBeLessThanOrEqual(512 * 1024 * 1024); // 0 swap
      expect(config.HostConfig.PidsLimit).toBeLessThanOrEqual(100); // 100 PIDs
    });

    test('Container environment leaks NO host credentials or parent secrets', () => {
      const config = runner.getContainerConfig(3000, 0);
      const envKeys = config.Env.map(e => e.split('=')[0]);

      // Verify no sensitive host keys are injected
      const disallowed = ['AWS_SECRET_ACCESS_KEY', 'GITHUB_TOKEN', 'OPENAI_API_KEY', 'DATABASE_PASSWORD'];
      for (const d of disallowed) {
        expect(envKeys).not.toContain(d);
      }

      // Verify standard sandbox defaults
      expect(config.Env).toContain('NODE_ENV=production');
      expect(config.Env).toContain('EVOLVE_SANDBOX=true');
    });
  });

  describe('Malicious Behavior Containment & Cleanup', () => {
    test('Simulated malicious app attempts are blocked by sandbox specification', () => {
      const config = runner.getContainerConfig(3000, 0);

      // 1. Fork bomb attack
      const canForkBomb = config.HostConfig.PidsLimit > 100;
      expect(canForkBomb).toBe(false);

      // 2. Out-of-workdir host write attack
      const canWriteRoot = !config.HostConfig.ReadonlyRootfs;
      expect(canWriteRoot).toBe(false);

      // 3. Huge memory allocation OOM attack
      const unboundedMemory = config.HostConfig.Memory === 0;
      expect(unboundedMemory).toBe(false);
    });

    test('stopContainer safely handles non-existent or completed containers without throwing', async () => {
      await expect(runner.stopContainer('non-existent-run-id-999')).resolves.not.toThrow();
    });
  });
});
