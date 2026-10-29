const mongoose = require('mongoose');

const DetectedRouteSchema = new mongoose.Schema({
  method: {
    type: String,
    required: true,
    uppercase: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL', 'USE']
  },
  path: {
    type: String,
    required: true
  },
  params: [String],
  filePath: String,
  line: Number
}, { _id: false });

const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  sourceType: {
    type: String,
    enum: ['zip', 'github', 'live_url'],
    required: true
  },
  sourceUrl: {
    type: String,
    default: null
  },
  liveUrl: {
    type: String,
    default: null
  },
  sourcePath: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['uploaded', 'analyzing', 'ready', 'failed'],
    default: 'uploaded'
  },
  detectedRoutes: {
    type: [DetectedRouteSchema],
    default: []
  },
  baselineRunId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Run',
    default: null
  },
  meta: {
    dependencies: {
      type: Map,
      of: String
    },
    entryPoint: {
      type: String,
      default: 'server.js'
    },
    fileCount: Number,
    totalSizeBytes: Number,
    executionMode: {
      type: String,
      enum: ['sandboxed_container', 'direct_live_deployment'],
      default: 'sandboxed_container'
    }
  },
  error: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', ProjectSchema);
