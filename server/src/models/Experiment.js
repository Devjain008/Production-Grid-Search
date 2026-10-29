const mongoose = require('mongoose');

const ExperimentSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  baselineRunId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Run',
    required: true
  },
  candidateRunId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Run'
  },
  hotspot: {
    file: String,
    line: Number,
    suspicionScore: Number,
    rule: String,
    description: String
  },
  strategy: {
    type: String,
    enum: [
      'cache',
      'index',
      'batch_queries',
      'async',
      'connection_pool',
      'pagination',
      'compression',
      'unspecified'
    ],
    default: 'unspecified'
  },
  diff: {
    type: String,
    default: ''
  },
  beforeMetrics: {
    type: mongoose.Schema.Types.Mixed
  },
  afterMetrics: {
    type: mongoose.Schema.Types.Mixed
  },
  reward: {
    type: Number,
    default: 0
  },
  verdict: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'inconclusive', 'errored'],
    default: 'pending'
  },
  failureSummary: {
    type: String,
    default: ''
  },
  llmMetadata: {
    model: String,
    prompt: String,
    temperature: Number
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Experiment', ExperimentSchema);
