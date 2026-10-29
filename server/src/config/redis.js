const IORedis = require('ioredis');
const config = require('./index');

function createRedisConnection() {
  const connection = new IORedis({
    host: config.redis.host,
    port: config.redis.port,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 2000);
      return delay;
    }
  });

  connection.on('connect', () => {
    console.log(`[Redis] Connecting to ${config.redis.host}:${config.redis.port}...`);
  });

  connection.on('ready', () => {
    console.log(`[Redis] Connection ready on ${config.redis.host}:${config.redis.port}`);
  });

  connection.on('error', (err) => {
    // BullMQ handles connection retries
    console.warn(`[Redis] Warning: ${err.message}`);
  });

  return connection;
}

module.exports = {
  createRedisConnection
};
