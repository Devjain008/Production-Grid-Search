const axios = require('axios');
const { EmbedderService, formatExperimentText, extractNumericFeatureVector } = require('./embedder');

/**
 * Cosine similarity between two float vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0.0;
  let dot = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0.0;
}

class VectorStore {
  constructor(options = {}) {
    this.qdrantUrl = options.qdrantUrl || process.env.QDRANT_URL || 'http://localhost:6333';
    this.embedder = new EmbedderService();
    this.textCollection = 'experiments';
    this.featureCollection = 'experiment_features';

    // In-memory fallback index for zero-dependency standalone execution & test resilience
    this.memoryTextStore = new Map(); // id -> { id, vector, payload }
    this.memoryFeatureStore = new Map(); // id -> { id, vector, payload }
  }

  async initCollections() {
    try {
      // 1. Text collection (384 dim)
      await axios.put(`${this.qdrantUrl}/collections/${this.textCollection}`, {
        vectors: { size: 384, distance: 'Cosine' }
      }, { timeout: 1500 });

      // 2. Feature collection (16 dim)
      await axios.put(`${this.qdrantUrl}/collections/${this.featureCollection}`, {
        vectors: { size: 16, distance: 'Cosine' }
      }, { timeout: 1500 });
    } catch (e) {
      // Qdrant container may be offline or already initialized; in-memory fallback remains active
    }
  }

  /**
   * Idempotent upsert of experiment into both text and feature collections
   */
  async upsertExperiment(experiment) {
    const experimentId = experiment._id ? experiment._id.toString() : experiment.id;
    const text = formatExperimentText(experiment);
    const textVector = await this.embedder.embedText(text);
    const featureVector = extractNumericFeatureVector(experiment.features || {});

    const payload = {
      experimentId,
      projectId: experiment.projectId ? experiment.projectId.toString() : null,
      strategy: experiment.strategy,
      category: experiment.hotspot?.category || 'performance',
      functionName: experiment.hotspot?.function || 'anonymous',
      file: experiment.hotspot?.file || 'server.js',
      verdict: experiment.verdict,
      reward: experiment.reward,
      testsPassed: experiment.testsPassed,
      failureReason: experiment.failureReason?.summary || '',
      failureCode: experiment.failureReason?.code || 'none',
      lesson: experiment.lesson || '',
      diffExcerpt: (experiment.diff || '').slice(0, 300),
      excludeFromPolicy: Boolean(experiment.excludeFromPolicy),
      featureVersion: experiment.featureVersion || 1,
      createdAt: experiment.createdAt ? new Date(experiment.createdAt).toISOString() : new Date().toISOString()
    };

    // Always update in-memory store for instant zero-dependency retrieval
    this.memoryTextStore.set(experimentId, { id: experimentId, vector: textVector, payload });
    this.memoryFeatureStore.set(experimentId, { id: experimentId, vector: featureVector, payload });

    // Try Qdrant HTTP upsert
    try {
      const qdrantPointId = Math.abs(this._hashStringToInteger(experimentId));

      await axios.put(`${this.qdrantUrl}/collections/${this.textCollection}/points`, {
        points: [{ id: qdrantPointId, vector: textVector, payload }]
      }, { timeout: 1500 });

      await axios.put(`${this.qdrantUrl}/collections/${this.featureCollection}/points`, {
        points: [{ id: qdrantPointId, vector: featureVector, payload }]
      }, { timeout: 1500 });
    } catch (e) {
      // In-memory store continues servicing queries
    }

    return { success: true, experimentId };
  }

  /**
   * Hybrid retrieval combining semantic text similarity and numeric feature similarity
   */
  async searchSimilar(query = {}) {
    const {
      hotspot = {},
      features = {},
      strategy = null,
      k = 5,
      onlyFailures = false,
      onlySuccesses = false,
      weightText = 0.6,
      weightFeature = 0.4
    } = query;

    const queryText = `${hotspot.category || 'performance'} | ${strategy || ''} | ${hotspot.function || ''} | ${hotspot.description || ''}`;
    const queryTextVector = await this.embedder.embedText(queryText);
    const queryFeatureVector = extractNumericFeatureVector(features);

    const candidates = [];

    for (const [id, item] of this.memoryTextStore.entries()) {
      const payload = item.payload;

      // Filter flags
      if (onlyFailures && payload.verdict === 'accepted') continue;
      if (onlySuccesses && payload.verdict !== 'accepted') continue;
      if (strategy && payload.strategy !== strategy) continue;

      const simText = cosineSimilarity(queryTextVector, item.vector);

      let simFeature = 0.0;
      if (this.memoryFeatureStore.has(id)) {
        simFeature = cosineSimilarity(queryFeatureVector, this.memoryFeatureStore.get(id).vector);
      }

      // Hybrid combined score
      const combinedScore = parseFloat((weightText * simText + weightFeature * simFeature).toFixed(4));

      candidates.push({
        id,
        score: combinedScore,
        textScore: parseFloat(simText.toFixed(4)),
        featureScore: parseFloat(simFeature.toFixed(4)),
        ...payload
      });
    }

    // Sort descending by combined score
    candidates.sort((a, b) => b.score - a.score);

    return candidates.slice(0, k);
  }

  /**
   * Delete experiment by id (cascading cleanup)
   */
  async deleteExperiment(experimentId) {
    this.memoryTextStore.delete(experimentId);
    this.memoryFeatureStore.delete(experimentId);
    try {
      const qdrantPointId = Math.abs(this._hashStringToInteger(experimentId));
      await axios.post(`${this.qdrantUrl}/collections/${this.textCollection}/points/delete`, {
        points: [qdrantPointId]
      }, { timeout: 1000 });
      await axios.post(`${this.qdrantUrl}/collections/${this.featureCollection}/points/delete`, {
        points: [qdrantPointId]
      }, { timeout: 1000 });
    } catch (e) {}
  }

  /**
   * Wipe all collections (for reindexing tests)
   */
  async wipe() {
    this.memoryTextStore.clear();
    this.memoryFeatureStore.clear();
    try {
      await axios.delete(`${this.qdrantUrl}/collections/${this.textCollection}`, { timeout: 1000 });
      await axios.delete(`${this.qdrantUrl}/collections/${this.featureCollection}`, { timeout: 1000 });
      await this.initCollections();
    } catch (e) {}
  }

  _hashStringToInteger(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) || 1;
  }
}

module.exports = {
  VectorStore,
  cosineSimilarity
};
