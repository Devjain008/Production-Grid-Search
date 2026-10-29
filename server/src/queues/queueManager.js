const { Queue } = require('bullmq');
const { createRedisConnection } = require('../config/redis');

let sandboxQueue = null;
let loadtestQueue = null;
let sharedRedis = null;

function getQueues() {
  if (sandboxQueue && loadtestQueue) {
    return { sandboxQueue, loadtestQueue };
  }

  sharedRedis = createRedisConnection();

  const defaultJobOptions = {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 3600 * 24, // Keep jobs for 24h
      count: 500
    },
    removeOnFail: {
      age: 3600 * 48
    }
  };

  sandboxQueue = new Queue('sandbox-queue', {
    connection: sharedRedis,
    defaultJobOptions
  });

  loadtestQueue = new Queue('loadtest-queue', {
    connection: sharedRedis,
    defaultJobOptions
  });

  return { sandboxQueue, loadtestQueue };
}

async function enqueueSandboxJob(jobData) {
  const { sandboxQueue } = getQueues();
  const job = await sandboxQueue.add('build-and-run', jobData, {
    jobId: `sandbox-${jobData.runId}`
  });
  return job;
}

async function enqueueLoadtestJob(jobData) {
  const { loadtestQueue } = getQueues();
  const job = await loadtestQueue.add('run-loadtest', jobData, {
    jobId: `loadtest-${jobData.runId}`
  });
  return job;
}

async function closeQueues() {
  if (sandboxQueue) await sandboxQueue.close();
  if (loadtestQueue) await loadtestQueue.close();
  if (sharedRedis) await sharedRedis.quit();
}

module.exports = {
  getQueues,
  enqueueSandboxJob,
  enqueueLoadtestJob,
  closeQueues
};
