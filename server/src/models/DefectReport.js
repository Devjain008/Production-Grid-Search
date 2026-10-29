const mongoose = require('mongoose');

const DefectReportSchema = new mongoose.Schema({
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
  totalDefectsFound: {
    type: Number,
    default: 0
  },
  rankedDefects: [
    {
      rank: Number,
      file: String,
      line: Number,
      function: String,
      score: Number,
      isSingleSignal: Boolean,
      signalCount: Number,
      suggestedStrategy: {
        type: String,
        enum: ['cache', 'index', 'batch', 'async', 'pool', 'pagination', 'compression', 'none', 'other'],
        default: 'none'
      },
      evidence: {
        static: [mongoose.Schema.Types.Mixed],
        profile: mongoose.Schema.Types.Mixed,
        anomaly: mongoose.Schema.Types.Mixed
      }
    }
  ],
  weights: {
    wStatic: Number,
    wProfile: Number,
    wAnomaly: Number
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('DefectReport', DefectReportSchema);
