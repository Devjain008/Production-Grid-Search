const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { StateGraph, START, END } = require('@langchain/langgraph');
const { AnalyzerAgent } = require('./analyzer');
const { PatcherAgent } = require('./patcher');
const { CriticAgent } = require('./critic');
const { ValidatorAgent, applyPatchToDirectory, copyDirRecursive } = require('./validator');
const { RuleBasedPolicy, LearnedPolicy } = require('./policy');
const { VectorStore } = require('../services/vectorStore');
const { reflect } = require('../services/reflect');
const Experiment = require('../models/Experiment');
const Project = require('../models/Project');
const config = require('../config');

// In-memory active job status & cancel tokens
const activeJobs = new Map(); // jobId -> { status, cancelRequested, currentStep, state, logs: [] }

class OptimizationOrchestrator {
  constructor(options = {}) {
    this.analyzer = new AnalyzerAgent(options);
    this.patcher = new PatcherAgent(options);
    this.critic = new CriticAgent(options);
    this.validator = new ValidatorAgent(options);
    this.policy = options.policy || new LearnedPolicy(options);
    this.vectorStore = options.vectorStore || new VectorStore();
  }

  /**
   * Builds the LangGraph StateGraph
   */
  buildGraph() {
    const workflow = new StateGraph({
      channels: {
        projectId: { value: (x, y) => y ?? x },
        jobId: { value: (x, y) => y ?? x },
        workingDir: { value: (x, y) => y ?? x },
        budget: { value: (x, y) => y ?? x },
        hotspotQueue: { value: (x, y) => y ?? x },
        current: { value: (x, y) => y ?? x },
        history: { value: (x, y) => (x || []).concat(y || []) },
        acceptedPatches: { value: (x, y) => (x || []).concat(y || []) },
        consecutiveFailures: { value: (x, y) => y ?? x ?? 0 },
        isFinished: { value: (x, y) => y ?? x ?? false },
        stopReason: { value: (x, y) => y ?? x ?? '' }
      }
    });

    // Node 1: Select Hotspot & Strategy
    workflow.addNode('selectHotspot', async (state) => {
      this._checkpoint(state, 'selectHotspot');
      const queue = [...(state.hotspotQueue || [])];

      if (queue.length === 0) {
        return { isFinished: true, stopReason: 'All queue hotspots processed.' };
      }

      const hotspot = queue.shift();
      const stratResult = await this.policy.selectStrategy({
        hotspot,
        features: hotspot.evidence || {},
        similarCases: []
      });

      if (stratResult.skip) {
        return {
          hotspotQueue: queue,
          current: { hotspot, strategy: 'none', skip: true }
        };
      }

      return {
        hotspotQueue: queue,
        current: {
          hotspot,
          strategy: stratResult.strategy,
          reason: stratResult.reason,
          policySelection: stratResult,
          skip: false
        }
      };
    });

    // Node 2: Retrieve Similar Past Cases from Memory
    workflow.addNode('retrieveSimilar', async (state) => {
      this._checkpoint(state, 'retrieveSimilar');
      if (state.current?.skip) return {};

      const similar = await this.vectorStore.searchSimilar({
        hotspot: state.current.hotspot,
        strategy: state.current.strategy,
        k: 5
      });

      return {
        current: {
          ...state.current,
          similarCases: similar
        }
      };
    });

    // Node 3: Propose Patch (LLM Patcher)
    workflow.addNode('patch', async (state) => {
      this._checkpoint(state, 'patch');
      if (state.current?.skip) return {};

      const patchResult = await this.patcher.proposePatch({
        projectDir: state.workingDir,
        hotspot: state.current.hotspot,
        strategy: state.current.strategy,
        similarCases: state.current.similarCases,
        evidence: state.current.hotspot.evidence
      });

      // Update token budget
      const tokensUsed = patchResult.llmMeta?.tokensUsed?.total || 0;
      const budget = { ...state.budget };
      budget.tokensSpent = (budget.tokensSpent || 0) + tokensUsed;

      if (!patchResult.success) {
        return {
          budget,
          current: {
            ...state.current,
            patchFailed: true,
            error: patchResult.error
          }
        };
      }

      return {
        budget,
        current: {
          ...state.current,
          diff: patchResult.diff,
          touchedFiles: patchResult.touchedFiles,
          llmMeta: patchResult.llmMeta
        }
      };
    });

    // Node 4: Critic Review
    workflow.addNode('critic', async (state) => {
      this._checkpoint(state, 'critic');
      if (state.current?.skip || state.current?.patchFailed) return {};

      const critique = this.critic.evaluatePatch({
        diff: state.current.diff,
        strategy: state.current.strategy
      });

      return {
        current: {
          ...state.current,
          critique
        }
      };
    });

    // Node 5 & 6: Validate & Benchmark
    workflow.addNode('validateAndBenchmark', async (state) => {
      this._checkpoint(state, 'validateAndBenchmark');
      if (state.current?.skip || state.current?.patchFailed) return {};

      // If critic rejected, skip compute
      if (!state.current.critique?.approved) {
        return {
          current: {
            ...state.current,
            verdict: 'rejected_by_critic',
            failureReason: {
              code: 'semantic_risk',
              summary: state.current.critique?.failureReason || 'Rejected by Critic'
            },
            testsPassed: false,
            reward: -0.2
          }
        };
      }

      const budget = { ...state.budget };
      budget.benchRunsSpent = (budget.benchRunsSpent || 0) + 5;

      const project = await Project.findById(state.projectId);
      const valResult = await this.validator.validatePatch({
        projectDir: state.workingDir,
        entryPoint: project?.meta?.entryPoint || 'server.js',
        diff: state.current.diff,
        routes: project?.detectedRoutes || []
      });

      return {
        budget,
        current: {
          ...state.current,
          verdict: valResult.verdict,
          failureReason: valResult.failureReason,
          comparison: valResult.comparison,
          testsPassed: valResult.testsPassed,
          reward: valResult.reward,
          rewardBreakdown: valResult.rewardBreakdown,
          metrics: valResult.metrics
        }
      };
    });

    // Node 7: Decide, Apply & Compound Gains
    workflow.addNode('decide', async (state) => {
      this._checkpoint(state, 'decide');
      if (state.current?.skip) return {};

      const cur = state.current;
      const isAccepted = cur.verdict === 'accepted';
      const acceptedPatches = [];

      if (isAccepted && cur.diff) {
        console.log(`[Orchestrator] ACCEPTED patch on ${cur.hotspot.function}. Applying to working baseline directory...`);
        applyPatchToDirectory(state.workingDir, cur.diff);
        acceptedPatches.push({
          hotspot: cur.hotspot,
          strategy: cur.strategy,
          diff: cur.diff,
          p95GainPct: Math.abs(cur.comparison?.p95DeltaPct || 0)
        });
      }

      const consecutiveFailures = isAccepted ? 0 : (state.consecutiveFailures || 0) + 1;

      return {
        acceptedPatches,
        consecutiveFailures
      };
    });

    // Node 8: Record Experiment & Lesson to Memory
    workflow.addNode('record', async (state) => {
      this._checkpoint(state, 'record');
      if (state.current?.skip) return {};

      const cur = state.current;
      const lesson = reflect({
        strategy: cur.strategy,
        hotspot: cur.hotspot,
        verdict: cur.verdict,
        failureReason: cur.failureReason,
        comparison: cur.comparison
      });

      const experiment = new Experiment({
        projectId: state.projectId,
        hotspot: cur.hotspot,
        features: cur.hotspot.evidence || {},
        strategy: cur.strategy,
        diff: cur.diff || '--- empty\n+++ empty\n',
        diffStats: { filesChanged: 1, linesAdded: 5, linesRemoved: 5 },
        metrics: cur.metrics || { baseline: [], candidate: [] },
        comparison: cur.comparison || {},
        testsPassed: Boolean(cur.testsPassed),
        reward: cur.reward || 0.0,
        rewardBreakdown: cur.rewardBreakdown || {},
        verdict: cur.verdict || 'errored',
        failureReason: cur.failureReason || { code: 'other', summary: 'Unknown failure' },
        lesson,
        provenance: {
          agentVersion: '2.0.0',
          llmModel: cur.llmMeta?.model || 'mock-patcher-v1',
          promptHash: cur.llmMeta?.promptHash || '',
          policyMode: cur.policySelection?.policyMode || 'rule',
          policyVersion: cur.policySelection?.policyVersion || 1,
          propensity: cur.policySelection?.propensity || 1.0,
          scores: cur.policySelection?.scores || {},
          maskedArms: cur.policySelection?.maskedArms || []
        },
        excludeFromPolicy: cur.verdict === 'inconclusive' || cur.verdict === 'errored'
      });

      await experiment.save();
      await this.vectorStore.upsertExperiment(experiment);

      // Hook Phase 5: Online Policy Update if experiment is valid
      if (!experiment.excludeFromPolicy && this.policy && typeof this.policy.update === 'function') {
        try {
          await this.policy.update({
            features: experiment.features,
            strategy: experiment.strategy,
            reward: experiment.reward,
            category: experiment.hotspot?.category || 'performance',
            experimentId: experiment._id.toString()
          });
        } catch (policyErr) {
          console.warn('[Orchestrator] Policy update warning:', policyErr.message);
        }
      }

      // Check Budget limits
      const budget = state.budget;
      let isFinished = false;
      let stopReason = '';

      const experimentsRun = (state.history?.length || 0) + 1;
      if (experimentsRun >= budget.maxExperiments) {
        isFinished = true;
        stopReason = `Reached MAX_EXPERIMENTS limit (${budget.maxExperiments}).`;
      } else if (budget.tokensSpent >= budget.maxTokens) {
        isFinished = true;
        stopReason = `Exceeded MAX_LLM_TOKENS budget (${budget.tokensSpent} >= ${budget.maxTokens}).`;
      } else if (state.consecutiveFailures >= budget.maxConsecutiveFailures) {
        isFinished = true;
        stopReason = `Exceeded MAX_CONSECUTIVE_FAILURES limit (${state.consecutiveFailures}).`;
      }

      return {
        isFinished,
        stopReason,
        history: [{
          experimentId: experiment._id,
          hotspot: cur.hotspot,
          strategy: cur.strategy,
          verdict: cur.verdict,
          reward: cur.reward,
          lesson
        }]
      };
    });

    // Define Graph Edges
    workflow.addEdge(START, 'selectHotspot');
    workflow.addEdge('selectHotspot', 'retrieveSimilar');
    workflow.addEdge('retrieveSimilar', 'patch');
    workflow.addEdge('patch', 'critic');
    workflow.addEdge('critic', 'validateAndBenchmark');
    workflow.addEdge('validateAndBenchmark', 'decide');
    workflow.addEdge('decide', 'record');

    // Conditional Loop Edge: Continue if not finished and queue remains
    workflow.addConditionalEdges('record', (state) => {
      if (state.isFinished || (state.hotspotQueue || []).length === 0) {
        return END;
      }
      return 'selectHotspot';
    });

    return workflow.compile();
  }

  _checkpoint(state, nodeName) {
    if (state.jobId && activeJobs.has(state.jobId)) {
      const job = activeJobs.get(state.jobId);
      job.currentStep = nodeName;
      job.state = { ...state };
      job.logs.push(`[${new Date().toISOString()}] Completed node: ${nodeName}`);
    }
  }

  /**
   * Run the full optimization loop
   */
  async runOptimization(projectId, customBudget = {}) {
    const jobId = `opt-${uuidv4().slice(0, 8)}`;
    const project = await Project.findById(projectId);
    if (!project) throw new Error('Project not found');

    const budget = {
      maxExperiments: customBudget.maxExperiments || parseInt(process.env.MAX_EXPERIMENTS, 10) || 5,
      maxTokens: customBudget.maxTokens || parseInt(process.env.MAX_LLM_TOKENS, 10) || 50000,
      maxBenchRuns: customBudget.maxBenchRuns || parseInt(process.env.MAX_BENCH_RUNS, 10) || 30,
      maxConsecutiveFailures: customBudget.maxConsecutiveFailures || parseInt(process.env.MAX_CONSECUTIVE_FAILURES, 10) || 3,
      tokensSpent: 0,
      benchRunsSpent: 0
    };

    activeJobs.set(jobId, {
      jobId,
      projectId,
      status: 'running',
      cancelRequested: false,
      currentStep: 'init',
      logs: [`Started optimization job ${jobId} for ${project.name}`]
    });

    // Create working directory copy for cumulative patching
    const optimizedDir = path.join(config.uploadDir, `opt-working-${jobId}`);
    copyDirRecursive(project.sourcePath, optimizedDir);

    const queue = await this.analyzer.buildHotspotQueue(projectId);

    const initialState = {
      projectId,
      jobId,
      workingDir: optimizedDir,
      budget,
      hotspotQueue: queue,
      current: null,
      history: [],
      acceptedPatches: [],
      consecutiveFailures: 0,
      isFinished: false,
      stopReason: ''
    };

    const graph = this.buildGraph();

    try {
      const finalState = await graph.invoke(initialState);

      // Generate final output artifacts
      const artifacts = await this.generateArtifacts(project, finalState, optimizedDir, jobId);

      if (activeJobs.has(jobId)) {
        activeJobs.get(jobId).status = 'completed';
        activeJobs.get(jobId).artifacts = artifacts;
      }

      return {
        jobId,
        status: 'completed',
        stopReason: finalState.stopReason || 'Optimization completed',
        acceptedCount: finalState.acceptedPatches?.length || 0,
        totalExperiments: finalState.history?.length || 0,
        artifacts
      };
    } catch (err) {
      if (activeJobs.has(jobId)) {
        activeJobs.get(jobId).status = 'failed';
        activeJobs.get(jobId).error = err.message;
      }
      throw err;
    }
  }

  async generateArtifacts(project, state, optimizedDir, jobId) {
    const artifactsDir = path.resolve(__dirname, '../../artifacts');
    if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });

    // 1. Combined Patch file
    const patchPath = path.join(artifactsDir, `optimized-${jobId}.patch`);
    const combinedDiff = (state.acceptedPatches || []).map(p => p.diff).join('\n\n');
    fs.writeFileSync(patchPath, combinedDiff || '# No patches were accepted\n', 'utf8');

    // 2. Optimized Project Zip
    const zipPath = path.join(artifactsDir, `optimized-${jobId}.zip`);
    const zip = new AdmZip();
    zip.addLocalFolder(optimizedDir, '');
    zip.writeZip(zipPath);

    // 3. Markdown Optimization Report
    const reportPath = path.join(artifactsDir, `Optimization_Report-${jobId}.md`);
    const mdReport = `# EVOLVE Optimization Report
**Project:** ${project.name}  
**Job ID:** \`${jobId}\`  
**Date:** ${new Date().toISOString()}  

## Summary
- **Accepted Fixes:** ${state.acceptedPatches?.length || 0}
- **Total Experiments Evaluated:** ${state.history?.length || 0}
- **Stop Reason:** ${state.stopReason || 'Completed'}
- **Tokens Consumed:** ${state.budget?.tokensSpent || 0}
- **Benchmark Executions:** ${state.budget?.benchRunsSpent || 0}

## Accepted Patches
${(state.acceptedPatches || []).map((p, i) => `
### Patch ${i + 1}: ${p.strategy.toUpperCase()} on \`${p.hotspot.function}\`
- **Source:** \`${p.hotspot.file}:${p.hotspot.line}\`
- **p95 Latency Reduction:** ${p.p95GainPct}%
\`\`\`diff
${p.diff}
\`\`\`
`).join('\n') || '*No patches met the acceptance criteria.*'}

## Experiment History
| # | Function | Strategy | Verdict | Reward | Reusable Lesson |
|---|----------|----------|---------|--------|-----------------|
${(state.history || []).map((h, i) =>
  `| ${i + 1} | \`${h.hotspot?.function}\` | ${h.strategy} | **${h.verdict}** | ${h.reward} | ${h.lesson} |`
).join('\n')}
`;
    fs.writeFileSync(reportPath, mdReport, 'utf8');

    return {
      patchFile: patchPath,
      zipFile: zipPath,
      reportFile: reportPath,
      patchUrl: `/api/optimize/${jobId}/patch`,
      reportUrl: `/api/optimize/${jobId}/report`
    };
  }
}

module.exports = {
  OptimizationOrchestrator,
  activeJobs
};
