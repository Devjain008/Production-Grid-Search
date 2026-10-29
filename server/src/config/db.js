const mongoose = require('mongoose');
const config = require('./index');

let isConnected = false;

async function connectDB() {
  if (isConnected) return mongoose.connection;

  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });
    isConnected = true;
    console.log(`[MongoDB] Connected to database: ${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected from database');
      isConnected = false;
    });

    return conn;
  } catch (err) {
    console.error(`[MongoDB] Failed to connect to ${config.mongoUri}:`, err.message);
    throw err;
  }
}

async function disconnectDB() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log('[MongoDB] Connection closed.');
}

module.exports = {
  connectDB,
  disconnectDB,
  mongoose
};
