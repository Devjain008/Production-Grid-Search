const Docker = require('dockerode');

let docker = null;
try {
  docker = new Docker();
} catch (e) {
  // Docker not available in current environment
}

/**
 * Reaps orphaned EVOLVE sandbox containers older than maxAgeMs
 */
async function reapOrphanContainers(maxAgeMs = 10 * 60 * 1000) {
  if (!docker) return { reapedCount: 0 };

  let reapedCount = 0;
  try {
    const containers = await docker.listContainers({ all: true });
    const now = Date.now();

    for (const info of containers) {
      const names = info.Names || [];
      const isEvolveSandbox = names.some(n => n.includes('evolve-sandbox-') || n.includes('evolve-k6-'));

      if (isEvolveSandbox) {
        const createdMs = info.Created * 1000;
        const ageMs = now - createdMs;

        if (ageMs > maxAgeMs || info.State === 'exited' || info.State === 'dead') {
          try {
            const container = docker.getContainer(info.Id);
            if (info.State === 'running') {
              await container.stop({ t: 2 }).catch(() => {});
            }
            await container.remove({ force: true }).catch(() => {});
            reapedCount++;
            console.log(`[Reaper] Reaped orphaned container ${info.Id.substring(0, 12)} (${names.join(', ')})`);
          } catch (delErr) {
            // Container may have been cleaned up concurrently
          }
        }
      }
    }
  } catch (err) {
    // Docker daemon not running or socket unavailable
  }

  return { reapedCount };
}

module.exports = {
  reapOrphanContainers
};
