const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const simpleGit = require('simple-git');
const { v4: uuidv4 } = require('uuid');
const Project = require('../models/Project');
const Run = require('../models/Run');
const { detectProjectRoutes } = require('../services/routeDetector');
const { enqueueSandboxJob } = require('../queues/queueManager');
const config = require('../config');

/**
 * Find entrypoint file in project
 */
function findEntryPoint(projectDir) {
  const pkgPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.main && fs.existsSync(path.join(projectDir, pkg.main))) {
        return pkg.main;
      }
    } catch (e) {}
  }

  const candidates = ['server.js', 'app.js', 'index.js', 'src/server.js', 'src/app.js', 'src/index.js'];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(projectDir, candidate))) {
      return candidate;
    }
  }

  return 'server.js';
}

/**
 * POST /api/projects
 * Accepts multipart zip or JSON body { repoUrl, name }
 */
async function createProject(req, res) {
  try {
    let projectName = req.body.name;
    const repoUrl = req.body.repoUrl;
    const uploadedFile = req.file;

    if (!uploadedFile && !repoUrl) {
      return res.status(400).json({ error: 'Please provide either a project zip file or a GitHub repoUrl.' });
    }

    const projectIdStr = uuidv4();
    const targetDir = path.join(config.uploadDir, projectIdStr);
    fs.mkdirSync(targetDir, { recursive: true });

    let sourceType = 'zip';

    if (uploadedFile) {
      sourceType = 'zip';
      if (!projectName) {
        projectName = path.basename(uploadedFile.originalname, path.extname(uploadedFile.originalname));
      }

      // Extract zip
      try {
        const zip = new AdmZip(uploadedFile.path);
        zip.extractAllTo(targetDir, true);
        // Clean up temp upload
        fs.unlinkSync(uploadedFile.path);
      } catch (zipErr) {
        return res.status(400).json({ error: `Failed to extract zip archive: ${zipErr.message}` });
      }
    } else if (repoUrl) {
      sourceType = 'github';
      if (!projectName) {
        projectName = repoUrl.split('/').pop().replace('.git', '') || 'github-project';
      }

      try {
        const git = simpleGit();
        await git.clone(repoUrl, targetDir, ['--depth', '1']);
      } catch (gitErr) {
        return res.status(400).json({ error: `Failed to clone repository: ${gitErr.message}` });
      }
    }

    // Handle nested folder if zip contained an enclosing root folder
    let effectiveDir = targetDir;
    const contents = fs.readdirSync(targetDir);
    if (contents.length === 1 && fs.statSync(path.join(targetDir, contents[0])).isDirectory()) {
      effectiveDir = path.join(targetDir, contents[0]);
    }

    // Validate project structure: Must contain package.json
    const packageJsonPath = path.join(effectiveDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return res.status(400).json({
        error: 'Invalid project structure: Missing package.json. EVOLVE strictly accepts Node.js / Express applications.'
      });
    }

    // Read package info
    let pkg = {};
    try {
      pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    } catch (e) {}

    const entryPoint = findEntryPoint(effectiveDir);

    // Detect routes via AST
    const detectedRoutes = detectProjectRoutes(effectiveDir);
    console.log(`[ProjectController] Detected ${detectedRoutes.length} Express routes for ${projectName}`);

    // Create Project record
    const project = new Project({
      name: projectName,
      sourceType,
      sourceUrl: repoUrl || null,
      sourcePath: effectiveDir,
      status: 'analyzing',
      detectedRoutes,
      meta: {
        dependencies: pkg.dependencies || {},
        entryPoint,
        fileCount: detectedRoutes.length
      }
    });
    await project.save();

    // Create initial baseline Run
    const baselineRun = new Run({
      projectId: project._id,
      type: 'baseline',
      status: 'queued',
      profile: req.body.profile || 'load'
    });
    await baselineRun.save();

    project.baselineRunId = baselineRun._id;
    await project.save();

    // Enqueue sandbox build & run job
    await enqueueSandboxJob({
      runId: baselineRun._id.toString(),
      projectId: project._id.toString(),
      projectDir: effectiveDir,
      entryPoint,
      profile: baselineRun.profile
    });

    res.status(201).json({
      success: true,
      project,
      baselineRun
    });
  } catch (err) {
    console.error('[ProjectController] Error creating project:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/projects
 */
async function listProjects(req, res) {
  try {
    const projects = await Project.find()
      .populate('baselineRunId')
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/projects/:id
 */
async function getProject(req, res) {
  try {
    const project = await Project.findById(req.params.id).populate('baselineRunId');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/projects/:id/runs
 */
async function getProjectRuns(req, res) {
  try {
    const runs = await Run.find({ projectId: req.params.id }).sort({ createdAt: -1 });
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/projects/:id/baseline
 * Re-trigger baseline or alternate profile benchmark
 */
async function triggerBaseline(req, res) {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const profile = req.body.profile || 'load';
    const entryPoint = project.meta?.entryPoint || 'server.js';

    const newRun = new Run({
      projectId: project._id,
      type: 'baseline',
      status: 'queued',
      profile
    });
    await newRun.save();

    await enqueueSandboxJob({
      runId: newRun._id.toString(),
      projectId: project._id.toString(),
      projectDir: project.sourcePath,
      entryPoint,
      profile
    });

    res.status(201).json({ success: true, run: newRun });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/runs/:id
 */
async function getRun(req, res) {
  try {
    const run = await Run.findById(req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createProject,
  listProjects,
  getProject,
  getProjectRuns,
  triggerBaseline,
  getRun
};
