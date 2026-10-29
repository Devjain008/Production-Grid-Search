const { Worker } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const { SandboxRunner } = require('../services/sandboxRunner');
const { enqueueLoadtestJob } = require('../queues/queueManager');
const Run = require('../models/Run');
const Project = require('../models/Project');

let sandboxWorkerInstance = null;
const runner = new SandboxRunner();

function startSandboxWorker() {
  if (sandboxWorkerInstance) return sandboxWorkerInstance;

  const connection = createRedisConnection();

  sandboxWorkerInstance = new Worker('sandbox-queue', async (job) => {
    const { runId, projectId, projectDir, profile = 'load', entryPoint = 'server.js' } = job.data;
    console.log(`[SandboxWorker] Processing job for Run ${runId} (Project ${projectId})`);

    try {
      // 1. Update run to building
      await Run.findByIdAndUpdate(runId, {
        status: 'building',
        profile
      });

      // 2. Fetch project routes
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // 3. Start Sandbox Container
      await Run.findByIdAndUpdate(runId, { status: 'running' });
      const sandboxResult = await runner.startSandbox(projectDir, runId, entryPoint);

      // 4. Update Run record
      await Run.findByIdAndUpdate(runId, {
        containerInfo: {
          containerId: sandboxResult.containerId,
          port: sandboxResult.port,
          runtimeLogs: sandboxResult.runtimeLogs || []
        },
        healthStatus: {
          healthy: sandboxResult.health.healthy,
          responseTimeMs: sandboxResult.health.responseTimeMs,
          endpoint: sandboxResult.health.endpoint,
          checkedAt: new Date()
        }
      });

      console.log(`[SandboxWorker] Sandbox started at ${sandboxResult.baseUrl}. Health:`, sandboxResult.health);

      if (!sandboxResult.health.healthy) {
        console.warn(`[SandboxWorker] App failed healthcheck at ${sandboxResult.baseUrl}`);
      }

      // 5. Enqueue Loadtest job
      await enqueueLoadtestJob({
        runId,
        projectId,
        baseUrl: sandboxResult.baseUrl,
        routes: project.detectedRoutes || [],
        profile
      });

      return {
        success: true,
        runId,
        baseUrl: sandboxResult.baseUrl
      };
    } catch (err) {
      console.error(`[SandboxWorker] Error processing run ${runId}:`, err);
      await Run.findByIdAndUpdate(runId, {
        status: 'failed',
        error: err.message
      });
      await runner.stopSandbox(runId);
      throw err;
    }
  }, {
    connection,
    concurrency: 2
  });

  sandboxWorkerInstance.on('completed', (job) => {
    console.log(`[SandboxWorker] Job ${job.id} completed successfully`);
  });

  sandboxWorkerInstance.on('failed', (job, err) => {
    console.error(`[SandboxWorker] Job ${job?.id} failed:`, err.message);
  });

  return sandboxWorkerInstance;
}

module.exports = {
  startSandboxWorker,
  runner
};
