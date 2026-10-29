const { Worker } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const { LoadTester } = require('../services/loadTester');
const { runner } = require('./sandboxWorker');
const Run = require('../models/Run');
const Project = require('../models/Project');

let loadtestWorkerInstance = null;
const tester = new LoadTester();

async function processLoadtestJob(jobData) {
  const { runId, projectId, baseUrl, routes, profile = 'load', executionMode = 'sandboxed_container' } = jobData;
  console.log(`[LoadtestWorker] Starting load test for Run ${runId} at ${baseUrl} (Profile: ${profile}, Mode: ${executionMode})`);

  try {
    await Run.findByIdAndUpdate(runId, { status: 'loadtesting' });

    const result = await tester.executeLoadTest(
      runId,
      baseUrl,
      routes,
      profile
    );

    if (executionMode !== 'direct_live_deployment') {
      const resourceStats = await runner.getResourceUsage(runId);
      if (resourceStats.cpuPercent > 0) {
        result.metrics.cpuAvgPercent = resourceStats.cpuPercent;
      }
      if (resourceStats.memoryMb > 0) {
        result.metrics.memoryMaxMb = resourceStats.memoryMb;
      }
    }

    const updatedRun = await Run.findByIdAndUpdate(runId, {
      status: 'completed',
      metrics: result.metrics,
      capacity: result.capacity,
      nfrScorecard: result.nfrScorecard,
      rawMetrics: {
        scriptPath: result.scriptPath,
        executedAt: new Date()
      }
    }, { new: true });

    const project = await Project.findById(projectId);
    if (project) {
      if (!project.baselineRunId || updatedRun.type === 'baseline') {
        project.baselineRunId = updatedRun._id;
      }
      project.status = 'ready';
      await project.save();
    }

    console.log(`[LoadtestWorker] Completed load test for Run ${runId}.`);
    console.log(`[LoadtestWorker] Capacity: MaxPeak=${result.capacity.maxPeakRps} RPS, Steady=${result.capacity.mediumSteadyRps} RPS, BreakingPoint=${result.capacity.breakingPointVus} VUs, Score=${result.nfrScorecard.overallScore}/100`);

    return {
      success: true,
      runId,
      metrics: result.metrics,
      capacity: result.capacity,
      nfrScorecard: result.nfrScorecard
    };
  } catch (err) {
    console.error(`[LoadtestWorker] Error during loadtest for run ${runId}:`, err);
    await Run.findByIdAndUpdate(runId, {
      status: 'failed',
      error: err.message
    });
    if (executionMode !== 'direct_live_deployment') {
      await runner.stopSandbox(runId);
    }
    throw err;
  } finally {
    if (executionMode !== 'direct_live_deployment') {
      // Keep sandbox alive for 3 minutes to allow user interactive virtual requests on dashboard
      setTimeout(async () => {
        try {
          console.log(`[LoadtestWorker] Post-benchmark idle cleanup: tearing down sandbox for Run ${runId}`);
          await runner.stopSandbox(runId);
        } catch (e) {}
      }, 3 * 60 * 1000);
    }
  }
}

function startLoadtestWorker() {
  if (loadtestWorkerInstance) return loadtestWorkerInstance;

  try {
    const connection = createRedisConnection();

    loadtestWorkerInstance = new Worker('loadtest-queue', async (job) => {
      return processLoadtestJob(job.data);
    }, {
      connection,
      concurrency: 1
    });

    loadtestWorkerInstance.on('completed', (job) => {
      console.log(`[LoadtestWorker] Job ${job.id} completed successfully`);
    });

    loadtestWorkerInstance.on('failed', (job, err) => {
      console.error(`[LoadtestWorker] Job ${job?.id} failed:`, err.message);
    });
  } catch (err) {
    console.warn('[LoadtestWorker] BullMQ worker startup warning:', err.message);
  }

  return loadtestWorkerInstance;
}

module.exports = {
  startLoadtestWorker,
  processLoadtestJob
};
