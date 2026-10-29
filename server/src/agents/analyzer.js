const Experiment = require('../models/Experiment');
const DefectReport = require('../models/DefectReport');

/**
 * Analyzer Agent: Filters and orders hotspots for the agent patch loop.
 * - Prioritizes highest suspicion score defects.
 * - Skips strategy = 'none'.
 * - Skips hotspots whose recent experiments already resulted in an accepted patch.
 */
class AnalyzerAgent {
  constructor(options = {}) {
    this.topN = options.topN || 5;
  }

  async buildHotspotQueue(projectId, defectReport = null) {
    let report = defectReport;
    if (!report) {
      report = await DefectReport.findOne({ projectId }).sort({ createdAt: -1 });
    }

    if (!report || !report.rankedDefects || report.rankedDefects.length === 0) {
      return [];
    }

    // Fetch accepted experiments for this project to avoid redundant patching
    const acceptedExperiments = await Experiment.find({
      projectId,
      verdict: 'accepted'
    }).select('hotspot strategy').lean();

    const acceptedKeys = new Set(
      acceptedExperiments.map(e => `${e.hotspot?.file}:${e.hotspot?.function}`)
    );

    const candidates = [];

    for (const defect of report.rankedDefects) {
      // 1. Skip defects with no strategy
      if (!defect.suggestedStrategy || defect.suggestedStrategy === 'none') {
        continue;
      }

      // 2. Skip defects that already have an accepted patch
      const key = `${defect.file}:${defect.function}`;
      if (acceptedKeys.has(key)) {
        console.log(`[AnalyzerAgent] Skipping ${key} - already resolved by accepted experiment.`);
        continue;
      }

      candidates.push({
        file: defect.file,
        line: defect.line,
        function: defect.function,
        category: defect.evidence?.static?.[0]?.category || 'performance',
        defectRank: defect.rank,
        score: defect.score,
        suggestedStrategy: defect.suggestedStrategy,
        evidence: defect.evidence
      });
    }

    // Sort descending by suspicion score
    candidates.sort((a, b) => b.score - a.score);

    return candidates.slice(0, this.topN);
  }
}

module.exports = {
  AnalyzerAgent
};
