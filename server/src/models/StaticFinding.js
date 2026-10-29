const mongoose = require('mongoose');

const StaticFindingSchema = new mongoose.Schema({
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
  tool: {
    type: String,
    enum: ['semgrep', 'eslint', 'complexity', 'npm-audit'],
    required: true
  },
  ruleId: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['performance', 'reliability', 'security', 'architecture'],
    required: true
  },
  severity: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  file: {
    type: String,
    required: true
  },
  filePath: String,
  line: {
    type: Number,
    required: true
  },
  endLine: Number,
  functionName: {
    type: String,
    default: 'anonymous'
  },
  message: {
    type: String,
    required: true
  },
  snippet: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('StaticFinding', StaticFindingSchema);
