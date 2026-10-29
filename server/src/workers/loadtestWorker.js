const { Worker } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const { LoadTester } = require('../services/loadTester');
const { runner } = require('./sandboxWorker');
const Run = require('../models/Run');
const Project = require('../models/Project');

let loadtestWorkerInstance = null;
const tester = new LoadTester();

function startLoadtestWorker() {
  if (loadtestWorkerInstance) return loadtestWorkerInstance;

  const connection = createRedisConnection();

  loadtestWorkerInstance = new Worker('loadtest-queue', async (job) => {
    const { runId, projectId, baseUrl, routes, profile = 'load' } = job.data;
    console.log(`[LoadtestWorker] Starting load test for Run ${runId} at ${baseUrl} (Profile: ${profile})`);

    try {
      // 1. Update status
      await Run.findByIdAndUpdate(runId, { status: 'loadtesting' });

      // 2. Execute load test
      const result = await tester.executeLoadTest(
        runId,
        baseUrl,
        routes,
        profile,
        (progressState) => {
          // Heartbeat/progress
        }
      );

      // 3. Collect final resource usage from sandbox runner
      const resourceStats = await runner.getResourceUsage(runId);
      if (resourceStats.cpuPercent > 0) {
        result.metrics.cpuAvgPercent = resourceStats.cpuPercent;
      }
      if (resourceStats.memoryMb > 0) {
        result.metrics.memoryMaxMb = resourceStats.memoryMb;
      }

      // 4. Persist completed Run metrics
      const updatedRun = await Run.findByIdAndUpdate(runId, {
        status: 'completed',
        metrics: result.metrics,
        rawMetrics: {
          scriptPath: result.scriptPath,
          executedAt: new Date()
        }
      }, { new: true });

      // 5. Update Project status
      const project = await Project.findById(projectId);
      if (project) {
        if (!project.baselineRunId || updatedRun.type === 'baseline') {
          project.baselineRunId = updatedRun._id;
        }
        project.status = 'ready';
        await project.save();
      }

      console.log(`[LoadtestWorker] Completed load test for Run ${runId}. p95=${result.metrics.p95}ms, RPS=${result.metrics.rps}, ErrorRate=${(result.metrics.errorRate * 100).toFixed(1)}%`);

      return {
        success: true,
        runId,
        metrics: result.metrics
      };
    } catch (err) {
      console.error(`[LoadtestWorker] Error during loadtest for run ${runId}:`, err);
      await Run.findByIdAndUpdate(runId, {
        status: 'failed',
        error: err.message
      });
      throw err;
    } finally {
      // Clean up sandbox container/process after test run
      console.log(`[LoadtestWorker] Tearing down sandbox for Run ${runId}`);
      await runner.stopSandbox(runId);
    }
  }, {
    connection,
    concurrency: 1 // Sequential benchmark runs to prevent noisy-neighbor interference
  });

  loadtestWorkerInstance.on('completed', (job) => {
    console.log(`[LoadtestWorker] Job ${job.id} completed successfully`);
  });

  loadtestWorkerInstance.on('failed', (job, err) => {
    console.error(`[LoadtestWorker] Job ${job?.id} failed:`, err.message);
  });

  return loadtestWorkerInstance;
}

module.exports = {
  startLoadtestWorker
};
