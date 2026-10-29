const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const projectController = require('../controllers/projectController');
const config = require('../config');

const router = express.Router();

// Ensure uploads dir exists
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

// API Routes
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'evolve-server',
    time: new Date().toISOString()
  });
});

router.post('/projects', upload.single('projectZip'), projectController.createProject);
router.get('/projects', projectController.listProjects);
router.get('/projects/:id', projectController.getProject);
router.get('/projects/:id/runs', projectController.getProjectRuns);
router.post('/projects/:id/baseline', projectController.triggerBaseline);
router.get('/runs/:id', projectController.getRun);

module.exports = router;
