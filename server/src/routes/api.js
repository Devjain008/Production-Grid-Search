const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const projectController = require('../controllers/projectController');
const memoryController = require('../controllers/memoryController');
const optimizeController = require('../controllers/optimizeController');
const reportController = require('../controllers/reportController');
const authController = require('../controllers/authController');
const { authenticate, requireProjectOwnership } = require('../middleware/authMiddleware');
const config = require('../config');

const router = express.Router();

const tempUploadDir = path.join(config.uploadDir, 'temp');
fs.mkdirSync(tempUploadDir, { recursive: true });

const upload = multer({
  dest: tempUploadDir,
  limits: {
    fileSize: config.maxUploadSizeMb * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || 
        file.mimetype === 'application/x-zip-compressed' || 
        file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only .zip files are allowed.'));
    }
  }
});

// Observability & Health
router.get('/health', (req, res) => res.json({ status: 'ok', service: 'evolve-server', time: new Date().toISOString() }));
router.get('/healthz', (req, res) => res.status(200).send('OK'));
router.get('/readyz', (req, res) => res.status(200).json({ status: 'ready', database: 'connected' }));

// Prometheus Metrics Endpoint
let reqCounter = 0;
router.get('/metrics', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(`# HELP evolve_requests_total Total HTTP requests handled
# TYPE evolve_requests_total counter
evolve_requests_total ${++reqCounter}
# HELP evolve_active_sandboxes Current active sandboxes
# TYPE evolve_active_sandboxes gauge
evolve_active_sandboxes 0
`);
});

// Auth Routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/user/export', authenticate, authController.exportUserData);

// Project Routes
router.post('/projects', authenticate, upload.single('projectZip'), projectController.createProject);
router.post('/projects/demo', projectController.createDemoProject);
router.get('/projects', authenticate, projectController.listProjects);
router.get('/projects/:id', authenticate, requireProjectOwnership, projectController.getProject);
router.delete('/projects/:id', authenticate, requireProjectOwnership, projectController.deleteProject);
router.get('/projects/:id/runs', authenticate, requireProjectOwnership, projectController.getProjectRuns);
router.post('/projects/:id/baseline', authenticate, requireProjectOwnership, projectController.triggerBaseline);
router.get('/runs/:id', projectController.getRun);
router.post('/runs/:id/virtual-request', projectController.sendVirtualRequest);

// Phase 2: Analysis, Profiling, and Defects
router.post('/projects/:id/analyze', authenticate, requireProjectOwnership, projectController.analyzeProject);
router.get('/projects/:id/defects', authenticate, requireProjectOwnership, projectController.getProjectDefects);
router.get('/projects/:id/profile', authenticate, requireProjectOwnership, projectController.getProjectProfile);
router.get('/projects/:id/flamegraph', projectController.getProjectFlamegraph);
router.get('/projects/flamegraph/:runId', projectController.getProjectFlamegraph);

// Phase 3: Experiment Memory & Vector Store
router.post('/memory/experiments', memoryController.createExperiment);
router.get('/memory/experiments', memoryController.listExperiments);
router.get('/memory/experiments/:id', memoryController.getExperiment);
router.post('/memory/similar', memoryController.searchSimilarExperiments);
router.get('/memory/stats', memoryController.getMemoryStats);
router.get('/memory/policy-data', memoryController.getPolicyData);
router.delete('/memory/experiments/:id', memoryController.deleteExperiment);

// Phase 4: Autonomous Agent Optimization Loop
router.post('/projects/:id/optimize', authenticate, requireProjectOwnership, optimizeController.startOptimization);
router.get('/optimize/:jobId', optimizeController.getJobStatus);
router.post('/optimize/:jobId/cancel', optimizeController.cancelJob);
router.get('/optimize/:jobId/report', optimizeController.getOptimizationReport);
router.get('/optimize/:jobId/patch', optimizeController.getOptimizationPatch);

// Phase 6: Final Report Generator
router.post('/reports', authenticate, reportController.createReport);
router.get('/reports/:id', authenticate, reportController.getReport);
router.get('/reports/:id/download', reportController.downloadReport);
router.get('/projects/:id/reports', authenticate, requireProjectOwnership, reportController.listProjectReports);

module.exports = router;
