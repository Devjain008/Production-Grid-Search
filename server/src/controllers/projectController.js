const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const simpleGit = require('simple-git');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const Project = require('../models/Project');
const Run = require('../models/Run');
const { detectProjectRoutes } = require('../services/routeDetector');
const { enqueueSandboxJob } = require('../queues/queueManager');
const { SandboxRunner } = require('../services/sandboxRunner');
const config = require('../config');

const virtualRunner = new SandboxRunner();

/**
 * Copy directory recursively skipping node_modules
 */
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Smart Monorepo & Multi-Folder Resolution
 * If the repository contains multiple folders (e.g. frontend/ and backend/, or server/ and client/),
 * locate the folder containing package.json with Express dependencies.
 */
function findExpressServiceDir(rootDir) {
  const rootPkgPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(rootPkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps['express']) {
        return rootDir;
      }
    } catch (e) {}
  }

  const candidateDirs = [];

  function search(currentDir, depth) {
    if (depth > 3) return;
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
          const subPath = path.join(currentDir, entry.name);
          const pkgFile = path.join(subPath, 'package.json');
          if (fs.existsSync(pkgFile)) {
            try {
              const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
              const deps = { ...pkg.dependencies, ...pkg.devDependencies };
              const isExpress = !!deps['express'];
              const score = (isExpress ? 15 : 0) + 
                (['backend', 'server', 'api', 'app', 'service'].includes(entry.name.toLowerCase()) ? 8 : 0);
              candidateDirs.push({ dir: subPath, score, isExpress, name: entry.name });
            } catch (e) {}
          }
          search(subPath, depth + 1);
        }
      }
    } catch (err) {}
  }

  search(rootDir, 1);

  if (candidateDirs.length > 0) {
    candidateDirs.sort((a, b) => b.score - a.score);
    console.log(`[ProjectController] Smart folder detection resolved Express service directory: ${candidateDirs[0].dir} (Folder: ${candidateDirs[0].name})`);
    return candidateDirs[0].dir;
  }

  return rootDir;
}

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
 * Probe live URL for OpenAPI/Swagger specs or health endpoints
 */
async function probeLiveEndpoints(liveUrl) {
  const discovered = [];
  const specPaths = ['/openapi.json', '/swagger.json', '/api-docs.json'];

  for (const p of specPaths) {
    try {
      const target = new URL(p, liveUrl).toString();
      const res = await axios.get(target, { timeout: 2500 });
      if (res.data && res.data.paths) {
        for (const [routePath, methods] of Object.entries(res.data.paths)) {
          for (const method of Object.keys(methods)) {
            discovered.push({
              method: method.toUpperCase(),
              path: routePath,
              params: [],
              filePath: 'openapi-spec',
              line: 1
            });
          }
        }
        if (discovered.length > 0) return discovered;
      }
    } catch (e) {}
  }

  return [
    { method: 'GET', path: '/health', params: [], filePath: 'live-probe', line: 1 },
    { method: 'GET', path: '/', params: [], filePath: 'live-probe', line: 1 }
  ];
}

/**
 * POST /api/projects
 */
async function createProject(req, res) {
  try {
    let projectName = req.body.name;
    const repoUrl = req.body.repoUrl;
    const liveUrl = req.body.liveUrl?.trim();
    const uploadedFile = req.file;

    // CASE 1: Live Deployed Application Link
    if (liveUrl) {
      try {
        new URL(liveUrl);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid live deployed URL provided. Must include http:// or https://' });
      }

      if (!projectName) {
        projectName = `LiveApp-${new URL(liveUrl).hostname}`;
      }

      const detectedRoutes = await probeLiveEndpoints(liveUrl);

      const project = new Project({
        name: projectName,
        sourceType: 'live_url',
        liveUrl,
        sourcePath: null,
        status: 'analyzing',
        detectedRoutes,
        meta: {
          executionMode: 'direct_live_deployment',
          fileCount: detectedRoutes.length
        }
      });
      await project.save();

      const profile = req.body.profile || 'load';
      const baselineRun = new Run({
        projectId: project._id,
        type: 'baseline',
        executionMode: 'direct_live_deployment',
        status: 'queued',
        profile
      });
      await baselineRun.save();

      project.baselineRunId = baselineRun._id;
      await project.save();

      await enqueueSandboxJob({
        runId: baselineRun._id.toString(),
        projectId: project._id.toString(),
        profile,
        executionMode: 'direct_live_deployment',
        liveUrl
      });

      return res.status(201).json({
        success: true,
        project,
        baselineRun
      });
    }

    // CASE 2: Codebase Mode (Zip or Git Repo Link)
    if (!uploadedFile && !repoUrl) {
      return res.status(400).json({
        error: 'Please provide either a project zip file, a GitHub repoUrl, or a live deployed URL.'
      });
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

      try {
        const zip = new AdmZip(uploadedFile.path);
        zip.extractAllTo(targetDir, true);
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

    // Smart Monorepo & Multi-Folder Resolution
    const effectiveDir = findExpressServiceDir(targetDir);

    const packageJsonPath = path.join(effectiveDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return res.status(400).json({
        error: 'Invalid project structure: Missing package.json. EVOLVE strictly accepts Node.js / Express applications.'
      });
    }

    let pkg = {};
    try {
      pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    } catch (e) {}

    const entryPoint = findEntryPoint(effectiveDir);
    const detectedRoutes = detectProjectRoutes(effectiveDir);
    console.log(`[ProjectController] Detected ${detectedRoutes.length} Express routes for ${projectName}`);

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
        fileCount: detectedRoutes.length,
        executionMode: 'sandboxed_container'
      }
    });
    await project.save();

    const profile = req.body.profile || 'load';
    const baselineRun = new Run({
      projectId: project._id,
      type: 'baseline',
      executionMode: 'sandboxed_container',
      status: 'queued',
      profile
    });
    await baselineRun.save();

    project.baselineRunId = baselineRun._id;
    await project.save();

    await enqueueSandboxJob({
      runId: baselineRun._id.toString(),
      projectId: project._id.toString(),
      projectDir: effectiveDir,
      entryPoint,
      profile: baselineRun.profile,
      executionMode: 'sandboxed_container'
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
 * POST /api/projects/demo
 */
async function createDemoProject(req, res) {
  try {
    const sampleSrc = path.resolve(__dirname, '../../../samples/buggy-express-app');
    const projectIdStr = `demo-${uuidv4().slice(0, 8)}`;
    const targetDir = path.join(config.uploadDir, projectIdStr);
    copyDirSync(sampleSrc, targetDir);

    const detectedRoutes = detectProjectRoutes(targetDir);
    const project = new Project({
      name: 'Buggy Express Sample App (Demo)',
      sourceType: 'zip',
      sourcePath: targetDir,
      status: 'analyzing',
      detectedRoutes,
      meta: {
        entryPoint: 'server.js',
        fileCount: detectedRoutes.length,
        executionMode: 'sandboxed_container'
      }
    });
    await project.save();

    const profile = req.body.profile || 'load';
    const baselineRun = new Run({
      projectId: project._id,
      type: 'baseline',
      executionMode: 'sandboxed_container',
      status: 'queued',
      profile
    });
    await baselineRun.save();

    project.baselineRunId = baselineRun._id;
    await project.save();

    await enqueueSandboxJob({
      runId: baselineRun._id.toString(),
      projectId: project._id.toString(),
      projectDir: targetDir,
      entryPoint: 'server.js',
      profile,
      executionMode: 'sandboxed_container'
    });

    res.status(201).json({
      success: true,
      project,
      baselineRun
    });
  } catch (err) {
    console.error('[ProjectController] Error creating demo project:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/runs/:id/virtual-request
 * Interactive virtual request runner allowing users to fire custom HTTP test calls
 */
async function sendVirtualRequest(req, res) {
  try {
    const { id: runId } = req.params;
    const { method = 'GET', routePath = '/', body = null, headers = {} } = req.body;

    const run = await Run.findById(runId);
    if (!run) return res.status(404).json({ error: 'Run not found' });

    const project = await Project.findById(run.projectId);
    if (!project) return res.status(404).json({ error: 'Associated project not found' });

    let targetBaseUrl = '';
    let tempProbeRunId = null;

    if (run.executionMode === 'direct_live_deployment') {
      targetBaseUrl = project.liveUrl;
    } else {
      // Check if container/sandbox is currently running
      if (run.containerInfo?.port) {
        targetBaseUrl = `http://127.0.0.1:${run.containerInfo.port}`;
      } else {
        // Spin up temporary lightweight local probe
        tempProbeRunId = `virtual-probe-${Date.now()}`;
        const probeResult = await virtualRunner.startSandbox(
          project.sourcePath,
          tempProbeRunId,
          project.meta?.entryPoint || 'server.js'
        );
        targetBaseUrl = probeResult.baseUrl;
      }
    }

    let cleanPath = routePath.startsWith('/') ? routePath : `/${routePath}`;
    cleanPath = cleanPath.replace(/:[a-zA-Z0-9_]+/g, '1');
    const targetUrl = new URL(cleanPath, targetBaseUrl).toString();

    const startTime = Date.now();
    try {
      const response = await axios({
        method: method.toUpperCase(),
        url: targetUrl,
        headers: { 'Content-Type': 'application/json', ...headers },
        data: body,
        timeout: 10000,
        validateStatus: () => true
      });

      const responseTimeMs = Date.now() - startTime;

      if (tempProbeRunId) {
        await virtualRunner.stopSandbox(tempProbeRunId);
      }

      res.json({
        success: true,
        targetUrl,
        statusCode: response.status,
        statusText: response.statusText,
        responseTimeMs,
        headers: response.headers,
        data: response.data
      });
    } catch (reqErr) {
      if (tempProbeRunId) {
        await virtualRunner.stopSandbox(tempProbeRunId);
      }

      res.status(502).json({
        success: false,
        targetUrl,
        error: reqErr.message,
        responseTimeMs: Date.now() - startTime
      });
    }
  } catch (err) {
    console.error('[ProjectController] Error executing virtual request:', err);
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
 */
async function triggerBaseline(req, res) {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const profile = req.body.profile || 'load';
    const entryPoint = project.meta?.entryPoint || 'server.js';
    const executionMode = project.meta?.executionMode || 'sandboxed_container';

    const newRun = new Run({
      projectId: project._id,
      type: 'baseline',
      executionMode,
      status: 'queued',
      profile
    });
    await newRun.save();

    await enqueueSandboxJob({
      runId: newRun._id.toString(),
      projectId: project._id.toString(),
      projectDir: project.sourcePath,
      entryPoint,
      profile,
      executionMode,
      liveUrl: project.liveUrl
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
  createDemoProject,
  sendVirtualRequest,
  findExpressServiceDir,
  listProjects,
  getProject,
  getProjectRuns,
  triggerBaseline,
  getRun
};
