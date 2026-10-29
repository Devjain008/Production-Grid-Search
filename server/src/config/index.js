const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/evolve',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    maxRetriesPerRequest: null
  },
  dockerSocketPath: process.env.DOCKER_SOCKET_PATH || (process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock'),
  uploadDir: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads')),
  maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB, 10) || 50,
  sandbox: {
    cpuLimitNano: parseInt(process.env.SANDBOX_CPU_LIMIT, 10) || 1000000000, // 1 CPU core
    memoryLimitMb: parseInt(process.env.SANDBOX_MEMORY_LIMIT_MB, 10) || 512,
    pidsLimit: parseInt(process.env.SANDBOX_PIDS_LIMIT, 10) || 100,
    timeoutMs: parseInt(process.env.SANDBOX_TIMEOUT_MS, 10) || 60000
  },
  loadTest: {
    k6Bin: process.env.K6_BIN_PATH || 'k6',
    defaultProfile: process.env.DEFAULT_LOAD_PROFILE || 'load'
  }
};
