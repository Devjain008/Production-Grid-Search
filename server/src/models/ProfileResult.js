const mongoose = require('mongoose');

const ProfileResultSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  runId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Run'
  },
  topHotFunctions: [
    {
      functionName: String,
      file: String,
      line: Number,
      selfTimePercent: Number,
      hits: Number
    }
  ],
  eventLoopLagP95: Number,
  gcPauseTotalMs: Number,
  heapGrowthSlopeMbPerMin: Number,
  dbTimeSharePercent: Number,
  flamegraphPath: String,
  flamegraphUrl: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('ProfileResult', ProfileResultSchema);
