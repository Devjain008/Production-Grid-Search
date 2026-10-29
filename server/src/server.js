const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { connectDB, disconnectDB } = require('./config/db');
const { closeQueues } = require('./queues/queueManager');
const { startSandboxWorker } = require('./workers/sandboxWorker');
const { startLoadtestWorker } = require('./workers/loadtestWorker');
const apiRoutes = require('./routes/api');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    // 1. Connect MongoDB
    await connectDB();

    // 2. Start BullMQ background workers
    try {
      startSandboxWorker();
      startLoadtestWorker();
      console.log('[Workers] Sandbox and Loadtest BullMQ workers active.');
    } catch (workerErr) {
      console.warn('[Workers] Worker startup warning:', workerErr.message);
    }

    // 3. Start Express HTTP Server
    serverInstance = app.listen(config.port, () => {
      console.log(`===============================================`);
      console.log(` EVOLVE Benchmark Engine running on port ${config.port}`);
      console.log(` Environment: ${config.nodeEnv}`);
      console.log(` Database:    ${config.mongoUri}`);
      console.log(`===============================================`);
    });
  } catch (err) {
    console.error('[Bootstrap] Fatal startup failure:', err);
    process.exit(1);
  }
}

// Graceful shutdown
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
