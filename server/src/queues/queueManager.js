const { Queue } = require('bullmq');
const { createRedisConnection } = require('../config/redis');

let sandboxQueue = null;
let loadtestQueue = null;
let sharedRedis = null;
let isRedisConnected = false;

function getQueues() {
  if (sandboxQueue && loadtestQueue) {
    return { sandboxQueue, loadtestQueue };
  }

  try {
    sharedRedis = createRedisConnection();

    sharedRedis.on('ready', () => {
      isRedisConnected = true;
    });

    sharedRedis.on('error', () => {
      isRedisConnected = false;
    });

    const defaultJobOptions = {
      attempts: 2,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 3600 * 24, count: 500 },
      removeOnFail: { age: 3600 * 48 }
    };

    sandboxQueue = new Queue('sandbox-queue', { connection: sharedRedis, defaultJobOptions });
    loadtestQueue = new Queue('loadtest-queue', { connection: sharedRedis, defaultJobOptions });
  } catch (e) {
    isRedisConnected = false;
  }

  return { sandboxQueue, loadtestQueue };
}

async function enqueueSandboxJob(jobData) {
  if (isRedisConnected) {
    try {
      const { sandboxQueue } = getQueues();
      return await sandboxQueue.add('build-and-run', jobData, {
        jobId: `sandbox-${jobData.runId}`
      });
    } catch (e) {
      // Fall through to in-process execution
    }
  }

  // Standalone local execution fallback
  setImmediate(async () => {
    try {
      const { processSandboxJob } = require('../workers/sandboxWorker');
      await processSandboxJob(jobData);
    } catch (err) {
      console.error('[QueueManager] Fallback sandbox job failed:', err);
    }
  });

  return { id: `local-job-${jobData.runId}` };
}

async function enqueueLoadtestJob(jobData) {
  if (isRedisConnected) {
    try {
      const { loadtestQueue } = getQueues();
      return await loadtestQueue.add('run-loadtest', jobData, {
        jobId: `loadtest-${jobData.runId}`
      });
    } catch (e) {
      // Fall through to in-process execution
    }
  }

  setImmediate(async () => {
    try {
      const { processLoadtestJob } = require('../workers/loadtestWorker');
      await processLoadtestJob(jobData);
    } catch (err) {
      console.error('[QueueManager] Fallback loadtest job failed:', err);
    }
  });

  return { id: `local-job-${jobData.runId}` };
}

async function closeQueues() {
  if (sandboxQueue) { try { await sandboxQueue.close(); } catch (e) {} }
  if (loadtestQueue) { try { await loadtestQueue.close(); } catch (e) {} }
  if (sharedRedis) { try { await sharedRedis.quit(); } catch (e) {} }
}

module.exports = {
  getQueues,
  enqueueSandboxJob,
  enqueueLoadtestJob,
  closeQueues
};
