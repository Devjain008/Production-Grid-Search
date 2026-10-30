const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const config = require('./config');
const { connectDB, disconnectDB } = require('./config/db');
const { closeQueues } = require('./queues/queueManager');
const { startSandboxWorker } = require('./workers/sandboxWorker');
const { startLoadtestWorker } = require('./workers/loadtestWorker');
const { helmetSecurityHeaders, createRateLimiter } = require('./middleware/security');
const { reapOrphanContainers } = require('./services/reaper');
const apiRoutes = require('./routes/api');

const app = express();

app.set('etag', 'strong');
app.use(helmetSecurityHeaders);
app.use(cors());

// Enable Gzip/Deflate compression for all responses > 1KB
app.use(compression({
  threshold: 1024,
  level: 6
}));

app.use(createRateLimiter({ max: 300, windowMs: 60 * 1000 }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount API routes
app.use('/api', apiRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(err.status || 500).json({
    error: err.name || 'InternalServerError',
    message: err.message
  });
});

let serverInstance = null;

async function bootstrap() {
  try {
    // 1. Connect MongoDB (non-blocking in local standalone mode)
    try {
      await connectDB();
    } catch (dbErr) {
      console.warn('[MongoDB] Running in standalone local mode.');
    }

    // 2. Start BullMQ background workers (or in-process fallback)
    try {
      startSandboxWorker();
      startLoadtestWorker();
      console.log('[Workers] Sandbox and Loadtest BullMQ workers active.');
    } catch (workerErr) {
      console.warn('[Workers] Worker startup notice:', workerErr.message);
    }

    // 2b. Reap orphaned containers from previous crashes
    reapOrphanContainers().then(res => {
      if (res.reapedCount > 0) console.log(`[Reaper] Cleaned up ${res.reapedCount} orphaned containers.`);
    }).catch(() => {});

    // 3. Start Express HTTP Server
    serverInstance = app.listen(config.port, () => {
      console.log(`===============================================`);
      console.log(` EVOLVE Benchmark Engine running on port ${config.port}`);
      console.log(` Environment: ${config.nodeEnv}`);
      console.log(` Database:    ${config.mongoUri}`);
      console.log(` Ready for MERN Zips, Repos, and Live Websites!`);
      console.log(`===============================================`);
    });

    return serverInstance;
  } catch (err) {
    console.error('[Bootstrap] Fatal startup failure:', err);
    process.exit(1);
  }
}

async function gracefulShutdown(signal) {
  console.log(`\n[Shutdown] Received ${signal}. Shutting down gracefully...`);
  if (serverInstance) {
    serverInstance.close(() => console.log('[Server] HTTP listener closed.'));
  }
  await closeQueues();
  await disconnectDB();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (require.main === module) {
  bootstrap();
}

module.exports = { app, bootstrap };
