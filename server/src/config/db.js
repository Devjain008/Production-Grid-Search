const mongoose = require('mongoose');
const config = require('./index');

let isConnected = false;

async function connectDB() {
  if (isConnected) return mongoose.connection;

  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 2000,
      autoIndex: true
    });
    isConnected = true;
    console.log(`[MongoDB] Connected to database: ${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      // Handled silently
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
    });

    return conn;
  } catch (err) {
    console.warn(`[MongoDB] Notice: Standalone local execution without active MongoDB at ${config.mongoUri}. (Use 'docker-compose up' for full DB persistence).`);
    return null;
  }
}

async function disconnectDB() {
  if (!isConnected) return;
  try {
    await mongoose.disconnect();
  } catch (e) {}
  isConnected = false;
  console.log('[MongoDB] Connection closed.');
}

module.exports = {
  connectDB,
  connectDb: connectDB,
  disconnectDB,
  disconnectDb: disconnectDB,
  mongoose
};
