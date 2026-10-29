const fs = require('fs');
const path = require('path');
const Report = require('../models/Report');
const Project = require('../models/Project');
const { generateFinalReport } = require('../services/report');

/**
 * Generates report artifacts for an optimize job
 */
async function createReport(req, res, next) {
  try {
    const { jobId, projectId, formats } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'BadRequest', message: 'jobId is required' });
    }

    let targetProjectId = projectId;
    if (!targetProjectId) {
      // Find project associated with job or find from database
      const existing = await Report.findOne({ jobId });
      if (existing) targetProjectId = existing.projectId;
      else {
        // Fallback: look up recent project
        const recent = await Project.findOne().sort({ updatedAt: -1 });
        targetProjectId = recent?._id;
      }
    }

    const report = await generateFinalReport({
      projectId: targetProjectId,
      jobId,
      formats: formats || ['html', 'pdf', 'md', 'json']
    });

    res.status(201).json({
      success: true,
      report
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Gets report by ID
 */
async function getReport(req, res, next) {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'NotFound', message: 'Report not found' });
    }
    res.json({ success: true, report });
  } catch (err) {
    next(err);
  }
}

/**
 * Downloads report in requested format (pdf, html, md, json)
 */
async function downloadReport(req, res, next) {
  try {
    const { id } = req.params;
    const format = (req.query.format || 'html').toLowerCase();

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ error: 'NotFound', message: 'Report not found' });
    }

    let filePath;
    let contentType;
    let fileName = `report-${report.jobId}.${format}`;

    if (format === 'json') {
      filePath = report.artifacts?.jsonPath;
      contentType = 'application/json';
    } else if (format === 'md') {
      filePath = report.artifacts?.markdownPath;
      contentType = 'text/markdown';
    } else if (format === 'html') {
      filePath = report.artifacts?.htmlPath;
      contentType = 'text/html';
    } else if (format === 'pdf') {
      filePath = report.artifacts?.pdfPath;
      contentType = 'application/pdf'; // or text/html with attachment headers
    } else {
      return res.status(400).json({ error: 'BadRequest', message: `Unsupported format: ${format}` });
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'NotFound', message: `Artifact file for format '${format}' not found on disk` });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

/**
 * Lists all reports for a project
 */
async function listProjectReports(req, res, next) {
  try {
    const { id } = req.params;
    const reports = await Report.find({ projectId: id }).sort({ createdAt: -1 });
    res.json({ success: true, count: reports.length, reports });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createReport,
  getReport,
  downloadReport,
  listProjectReports
};
