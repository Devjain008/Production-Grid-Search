const { Worker } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const { SandboxRunner, pollHealthCheck } = require('../services/sandboxRunner');
const { enqueueLoadtestJob } = require('../queues/queueManager');
const Run = require('../models/Run');
const Project = require('../models/Project');

let sandboxWorkerInstance = null;
const runner = new SandboxRunner();

async function processSandboxJob(jobData) {
  const {
    runId,
    projectId,
    projectDir,
    profile = 'load',
    entryPoint = 'server.js',
    executionMode = 'sandboxed_container',
    liveUrl = null
  } = jobData;

  console.log(`[SandboxWorker] Processing job for Run ${runId} (Mode: ${executionMode})`);

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    if (executionMode === 'direct_live_deployment' && liveUrl) {
      await Run.findByIdAndUpdate(runId, {
        status: 'running',
        executionMode: 'direct_live_deployment',
        profile
      });

      console.log(`[SandboxWorker] Verifying live deployed endpoint at ${liveUrl}...`);
      const health = await pollHealthCheck(liveUrl, '/health', 10000);
      if (!health.healthy) {
        const rootCheck = await pollHealthCheck(liveUrl, '/', 5000);
        if (rootCheck.healthy) {
          health.healthy = true;
          health.endpoint = '/';
          health.responseTimeMs = rootCheck.responseTimeMs;
        }
      }

      await Run.findByIdAndUpdate(runId, {
        healthStatus: {
          healthy: health.healthy,
          responseTimeMs: health.responseTimeMs,
          endpoint: health.endpoint,
          checkedAt: new Date()
        }
      });

      await enqueueLoadtestJob({
        runId,
        projectId,
        baseUrl: liveUrl,
        routes: project.detectedRoutes || [{ method: 'GET', path: '/' }],
        profile,
        executionMode: 'direct_live_deployment'
      });

      return {
        success: true,
        runId,
        baseUrl: liveUrl,
        mode: 'direct_live_deployment'
      };
    }

    await Run.findByIdAndUpdate(runId, {
      status: 'building',
      executionMode: 'sandboxed_container',
      profile
    });

    await Run.findByIdAndUpdate(runId, { status: 'running' });
    const sandboxResult = await runner.startSandbox(projectDir, runId, entryPoint);

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

    await enqueueLoadtestJob({
      runId,
      projectId,
      baseUrl: sandboxResult.baseUrl,
      routes: project.detectedRoutes || [],
      profile,
      executionMode: 'sandboxed_container'
    });

    return {
      success: true,
      runId,
      baseUrl: sandboxResult.baseUrl,
      mode: 'sandboxed_container'
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
}

function startSandboxWorker() {
  if (sandboxWorkerInstance) return sandboxWorkerInstance;

  try {
    const connection = createRedisConnection();

    sandboxWorkerInstance = new Worker('sandbox-queue', async (job) => {
      return processSandboxJob(job.data);
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
  } catch (err) {
    console.warn('[SandboxWorker] BullMQ worker startup warning:', err.message);
  }

  return sandboxWorkerInstance;
}

module.exports = {
  startSandboxWorker,
  processSandboxJob,
  runner
};
