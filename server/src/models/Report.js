const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  jobId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  summary: {
    executiveSummary: String,
    plainLanguageSummary: String,
    baselineP95Ms: Number,
    finalP95Ms: Number,
    p95ReductionPct: Number,
    baselineRps: Number,
    finalRps: Number,
    rpsGainPct: Number,
    acceptedCount: Number,
    rejectedCount: Number,
    inconclusiveCount: Number,
    totalExperiments: Number,
    tokensSpent: Number,
    benchRunsSpent: Number
  },
  artifacts: {
    htmlPath: String,
    pdfPath: String,
    markdownPath: String,
    jsonPath: String
  },
  contentJson: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('Report', ReportSchema);
