const mongoose = require('mongoose');

const RouteMetricSchema = new mongoose.Schema({
  route: String,
  method: String,
  p50: Number,
  p95: Number,
  p99: Number,
  rps: Number,
  errorRate: Number,
  totalHits: Number
}, { _id: false });

const RunSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['baseline', 'candidate'],
    default: 'baseline',
    index: true
  },
  status: {
    type: String,
    enum: ['queued', 'building', 'running', 'loadtesting', 'completed', 'failed'],
    default: 'queued',
    index: true
  },
  profile: {
    type: String,
    enum: ['load', 'stress', 'spike', 'soak'],
    default: 'load'
  },
  containerInfo: {
    containerId: String,
    port: Number,
    ipAddress: String,
    buildLogs: [String],
    runtimeLogs: [String],
    exitCode: Number
  },
  healthStatus: {
    healthy: { type: Boolean, default: false },
    responseTimeMs: Number,
    endpoint: String,
    checkedAt: Date
  },
  metrics: {
    p50: { type: Number, default: 0 },
    p95: { type: Number, default: 0 },
    p99: { type: Number, default: 0 },
    mean: { type: Number, default: 0 },
    rps: { type: Number, default: 0 },
    totalRequests: { type: Number, default: 0 },
    errorRate: { type: Number, default: 0 },
    cpuAvgPercent: { type: Number, default: 0 },
    cpuMaxPercent: { type: Number, default: 0 },
    memoryAvgMb: { type: Number, default: 0 },
    memoryMaxMb: { type: Number, default: 0 },
    eventLoopLagP95Ms: { type: Number, default: 0 },
    eventLoopLagP99Ms: { type: Number, default: 0 },
    latencySamples: [{
      timestamp: Number,
      latency: Number,
      cpu: Number,
      memory: Number
    }],
    routeMetrics: [RouteMetricSchema]
  },
  rawMetrics: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  error: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Run', RunSchema);
