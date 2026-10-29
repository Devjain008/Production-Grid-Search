const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');

/**
 * Redact sensitive API keys, secrets, tokens, and passwords from diffs and text
 */
function redactSecrets(text = '') {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/(?:api[_-]?key|secret|password|token|bearer|auth)\s*[:=]\s*['"][^'"]+['"]/gi, 'secret="[REDACTED]"')
    .replace(/(?:postgres|mongodb|mysql):\/\/[^:\s]+:[^@\s]+@[^\s]+/gi, '$1://[USER]:[REDACTED]@[HOST]')
    .replace(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, '[REDACTED_JWT]');
}

/**
 * Compact a unified diff by stripping headers and unchanged context lines
 * Keeps added (+) and removed (-) lines to produce dense embeddings
 */
function compactDiff(diff = '', maxLength = 1000) {
  if (!diff || typeof diff !== 'string') return '';
  const clean = redactSecrets(diff);
  const lines = clean.split('\n');
  const compactLines = [];

  for (const line of lines) {
    if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@') || line.startsWith('diff --git')) {
      continue;
    }
    if (line.startsWith('+') || line.startsWith('-')) {
      compactLines.push(line.trim());
    }
  }

  const result = compactLines.join(' ');
  return result.length > maxLength ? result.slice(0, maxLength) + '...' : result;
}

/**
 * Format structured experiment representation into dense semantic embedding text
 */
function formatExperimentText(experiment) {
  const category = experiment.hotspot?.category || 'performance';
  const strategy = experiment.strategy || 'other';
  const funcTokens = (experiment.hotspot?.function || 'anonymous')
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .toLowerCase();

  const diffSummary = compactDiff(experiment.diff || '', 300);
  const failureSummary = experiment.failureReason?.summary || 'none';
  const lesson = experiment.lesson || '';

  return `${category} | ${strategy} | ${funcTokens} | ${diffSummary} | ${failureSummary} | ${lesson}`;
}

/**
 * Extract normalized numeric feature vector (16 dimensions)
 */
function extractNumericFeatureVector(features = {}) {
  const v = [
    Math.min(1.0, (features.staticSeverity || 0) / 5.0),
    Math.min(1.0, (features.hotness || 0) / 100.0),
    Math.min(1.0, (features.eventLoopLagP95 || 0) / 100.0),
    Math.min(1.0, (features.gcPauseMs || 0) / 200.0),
    Math.min(1.0, (features.dbTimeShare || 0) / 100.0),
    Math.min(1.0, Math.max(0, (features.heapSlope || 0) / 50.0)),
    Math.min(1.0, features.anomalyScore || 0),
    Math.min(1.0, (features.complexity || 1) / 25.0),
    Math.min(1.0, (features.routeRps || 0) / 500.0),
    features.strategy === 'batch' ? 1.0 : 0.0,
    features.strategy === 'cache' ? 1.0 : 0.0,
    features.strategy === 'index' ? 1.0 : 0.0,
    features.strategy === 'async' ? 1.0 : 0.0,
    features.strategy === 'pagination' ? 1.0 : 0.0,
    features.strategy === 'pool' ? 1.0 : 0.0,
    features.strategy === 'compression' ? 1.0 : 0.0
  ];

  // L2 Normalize
  const norm = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0)) || 1.0;
  return v.map(val => parseFloat((val / norm).toFixed(6)));
}

/**
 * Deterministic Semantic Projection (384 dimensions)
 * Fast, self-contained, reproducible embedding generator that projects token n-grams
 * into dense normalized 384-dim vector space.
 */
function deterministicTextProjection(text = '', dim = 384) {
  const vec = new Float64Array(dim);
  const clean = text.toLowerCase().replace(/[^a-z0-9\s_-]/g, ' ');
  const tokens = clean.split(/\s+/).filter(Boolean);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const hash = crypto.createHash('sha256').update(token).digest();
    for (let j = 0; j < 32; j++) {
      const idx = (hash[j] + j * 12) % dim;
      const sign = (hash[(j + 1) % 32] % 2 === 0) ? 1 : -1;
      const weight = 1.0 / Math.sqrt(i + 1);
      vec[idx] += sign * weight;
    }

    // Bigram
    if (i > 0) {
      const bigram = `${tokens[i - 1]}_${token}`;
      const biHash = crypto.createHash('sha256').update(bigram).digest();
      for (let k = 0; k < 16; k++) {
        const idx = (biHash[k] + k * 23) % dim;
        const sign = (biHash[(k + 1) % 16] % 2 === 0) ? 1 : -1;
        vec[idx] += sign * 1.5;
      }
    }
  }

  // L2 Normalize
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1.0;

  const result = [];
  for (let i = 0; i < dim; i++) {
    result.push(parseFloat((vec[i] / norm).toFixed(6)));
  }
  return result;
}

/**
 * Main Embedder Interface
 * Uses FastAPI /embed when available, falls back to deterministic projection
 */
class EmbedderService {
  constructor(options = {}) {
    this.analyzerUrl = options.analyzerUrl || process.env.ANALYZER_URL || 'http://localhost:8000';
    this.dim = 384;
  }

  async embedText(text) {
    const cleanText = redactSecrets(text);
    try {
      const res = await axios.post(`${this.analyzerUrl}/embed`, {
        texts: [cleanText]
      }, { timeout: 1200 });

      if (res.data && res.data.embeddings && res.data.embeddings[0]) {
        return res.data.embeddings[0];
      }
    } catch (e) {
      // Fallback to deterministic projection
    }
    return deterministicTextProjection(cleanText, this.dim);
  }

  embedNumericFeatures(features) {
    return extractNumericFeatureVector(features);
  }
}

module.exports = {
  EmbedderService,
  redactSecrets,
  compactDiff,
  formatExperimentText,
  extractNumericFeatureVector,
  deterministicTextProjection
};
