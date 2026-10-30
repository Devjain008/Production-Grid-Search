const fs = require('fs');
const path = require('path');
const { OptimizationOrchestrator, activeJobs } = require('../agents/orchestrator');
const Project = require('../models/Project');

const orchestrator = new OptimizationOrchestrator();

/**
 * POST /api/projects/:id/optimize
 */
async function startOptimization(req, res) {
  try {
    const { id: projectId } = req.params;
    const { budget = {}, topN = 5 } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'ProjectNotFound', message: `Project ${projectId} not found.` });
    }

    if (project.sourceType === 'live_url' || !project.sourcePath) {
      return res.status(400).json({
        error: 'LiveDeploymentMode',
        message: 'Optimization code patching requires a local codebase (Zip or Git repo). Live deployed URLs are load-tested and benchmarked externally.'
      });
    }

    // Run optimization asynchronously in background or synchronously based on mode
    const runAsync = req.query.async !== 'false';

    if (runAsync) {
      // Start background execution
      orchestrator.runOptimization(projectId, { ...budget, topN })
        .catch(err => console.error('[OptimizeController] Background error:', err));

      return res.status(202).json({
        success: true,
        message: 'Optimization loop started in background.',
        projectId
      });
    } else {
      const result = await orchestrator.runOptimization(projectId, { ...budget, topN });
      return res.json({
        success: true,
        ...result
      });
    }
  } catch (err) {
    console.error('[OptimizeController] Error starting optimization:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/optimize/:jobId
 */
async function getJobStatus(req, res) {
  try {
    const { jobId } = req.params;
    const job = activeJobs.get(jobId);
    if (!job) {
      return res.status(404).json({ error: `Job ${jobId} not found.` });
    }

    res.json({
      success: true,
      job
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/optimize/:jobId/cancel
 */
async function cancelJob(req, res) {
  try {
    const { jobId } = req.params;
    const job = activeJobs.get(jobId);
    if (!job) {
      return res.status(404).json({ error: `Job ${jobId} not found.` });
    }

    job.cancelRequested = true;
    job.status = 'cancelled';
    job.logs.push(`[${new Date().toISOString()}] Job cancellation requested by user.`);

    res.json({
      success: true,
      message: `Job ${jobId} cancellation requested.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/optimize/:jobId/report
 */
async function getOptimizationReport(req, res) {
  try {
    const { jobId } = req.params;
    const artifactsDir = path.resolve(__dirname, '../../artifacts');
    const reportFile = path.join(artifactsDir, `Optimization_Report-${jobId}.md`);

    if (fs.existsSync(reportFile)) {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      return res.sendFile(reportFile);
    }

    res.status(404).json({ error: 'Optimization report not found for this job.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/optimize/:jobId/patch
 */
async function getOptimizationPatch(req, res) {
  try {
    const { jobId } = req.params;
    const artifactsDir = path.resolve(__dirname, '../../artifacts');
    const patchFile = path.join(artifactsDir, `optimized-${jobId}.patch`);

    if (fs.existsSync(patchFile)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.sendFile(patchFile);
    }

    res.status(404).json({ error: 'Optimization patch file not found for this job.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  startOptimization,
  getJobStatus,
  cancelJob,
  getOptimizationReport,
  getOptimizationPatch,
  orchestrator
};
