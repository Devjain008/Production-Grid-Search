const Experiment = require('../models/Experiment');
const { VectorStore } = require('./vectorStore');

async function reindexAllExperiments(options = {}) {
  const vectorStore = options.vectorStore || new VectorStore();
  const filter = options.projectId ? { projectId: options.projectId } : {};

  if (options.wipeFirst) {
    console.log('[Reindex] Wiping vector memory collections before reindex...');
    await vectorStore.wipe();
  }

  const experiments = await Experiment.find(filter);
  console.log(`[Reindex] Found ${experiments.length} experiments to reindex into vector memory.`);

  let indexedCount = 0;
  for (const exp of experiments) {
    await vectorStore.upsertExperiment(exp);
    indexedCount++;
  }

  console.log(`[Reindex] Successfully reindexed ${indexedCount} experiments into vector store.`);
  return {
    success: true,
    totalIndexed: indexedCount
  };
}

module.exports = {
  reindexAllExperiments
};
