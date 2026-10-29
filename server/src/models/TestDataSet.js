const mongoose = require('mongoose');

const TestDataSetSchema = new mongoose.Schema({
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
  totalGenerated: {
    type: Number,
    default: 0
  },
  totalKept: {
    type: Number,
    default: 0
  },
  coverageGainPercent: {
    type: Number,
    default: 0
  },
  personaScenarios: mongoose.Schema.Types.Mixed,
  keptInputs: [
    {
      route: String,
      fuzzType: String,
      statusHit: Number,
      payload: mongoose.Schema.Types.Mixed
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('TestDataSet', TestDataSetSchema);
