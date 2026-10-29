const mongoose = require('mongoose');

const ExperimentSchema = new mongoose.Schema({
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
  baselineRunId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Run'
  },
  hotspot: {
    file: { type: String, required: true },
    line: { type: Number, required: true },
    function: { type: String, required: true },
    category: {
      type: String,
      enum: ['performance', 'reliability', 'security', 'architecture', 'other'],
      default: 'performance'
    },
    defectRank: Number
  },
  features: {
    staticSeverity: { type: Number, default: 0 },
    hotness: { type: Number, default: 0 },
    eventLoopLagP95: { type: Number, default: 0 },
    gcPauseMs: { type: Number, default: 0 },
    dbTimeShare: { type: Number, default: 0 },
    heapSlope: { type: Number, default: 0 },
    anomalyScore: { type: Number, default: 0 },
    complexity: { type: Number, default: 1 },
    routeRps: { type: Number, default: 0 },
    vector: { type: [Number], default: [] }
  },
  featureVersion: {
    type: Number,
    default: 1,
    index: true
  },
  strategy: {
    type: String,
    enum: ['cache', 'index', 'batch', 'async', 'pool', 'pagination', 'compression', 'other'],
    required: true,
    index: true
  },
  diff: {
    type: String,
    required: true
  },
  diffStats: {
    filesChanged: { type: Number, default: 1 },
    linesAdded: { type: Number, default: 0 },
    linesRemoved: { type: Number, default: 0 }
  },
  metrics: {
    baseline: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    candidate: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    }
  },
  comparison: {
    p95DeltaPct: { type: Number, default: 0 },
    rpsDeltaPct: { type: Number, default: 0 },
    errorDelta: { type: Number, default: 0 },
    memDeltaPct: { type: Number, default: 0 },
    mannWhitneyP: { type: Number, default: 1.0 },
    effectSize: { type: Number, default: 0 },
    nBaseline: { type: Number, default: 0 },
    nCandidate: { type: Number, default: 0 }
  },
  testsPassed: {
    type: Boolean,
    required: true
  },
  reward: {
    type: Number,
    required: true,
    index: true
  },
  rewardBreakdown: {
    latency: { type: Number, default: 0 },
    errorPenalty: { type: Number, default: 0 },
    memPenalty: { type: Number, default: 0 },
    testPenalty: { type: Number, default: 0 }
  },
  verdict: {
    type: String,
    enum: ['accepted', 'rejected', 'inconclusive', 'errored', 'rejected_by_critic'],
    required: true,
    index: true
  },
  failureReason: {
    code: {
      type: String,
      enum: ['tests_failed', 'regression', 'no_improvement', 'timeout', 'build_error', 'semantic_risk', 'noise', 'other', 'none'],
      default: 'none'
    },
    summary: { type: String, default: '' }
  },
  lesson: {
    type: String,
    default: ''
  },
  provenance: {
    agentVersion: { type: String, default: '1.0.0' },
    llmModel: { type: String, default: 'mock-patcher-v1' },
    promptHash: { type: String, default: '' },
    seed: { type: Number, default: 42 },
    createdBy: { type: String, default: 'system' },
    policyMode: { type: String, default: 'rule' },
    policyVersion: { type: Number, default: 1 },
    propensity: { type: Number, default: 1.0 },
    scores: { type: mongoose.Schema.Types.Mixed, default: {} },
    maskedArms: { type: [String], default: [] }
  },
  excludeFromPolicy: {
    type: Boolean,
    default: false,
    index: true
  },
  isDuplicate: {
    type: Boolean,
    default: false,
    index: true
  },
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Experiment',
    default: null
  },
  tags: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Composite Indexes
ExperimentSchema.index({ projectId: 1, createdAt: -1 });
ExperimentSchema.index({ strategy: 1, verdict: 1 });
ExperimentSchema.index({ 'hotspot.category': 1, strategy: 1 });

// Immutability Guard: Once verdict is set, core experiment data is immutable
ExperimentSchema.pre('save', function (next) {
  if (!this.isNew && this.isModified('verdict') && this.verdict !== undefined) {
    const modifiedPaths = this.modifiedPaths();
    const allowedModifications = ['lesson', 'tags', 'excludeFromPolicy', 'isDuplicate', 'duplicateOf'];
    const invalidMods = modifiedPaths.filter(p => !allowedModifications.includes(p) && p !== 'updatedAt');
    if (invalidMods.length > 0 && !this._allowUpdate) {
      return next(new Error(`Immutable Experiment: Fields [${invalidMods.join(', ')}] cannot be modified after verdict is committed.`));
    }
  }
  next();
});

module.exports = mongoose.model('Experiment', ExperimentSchema);
