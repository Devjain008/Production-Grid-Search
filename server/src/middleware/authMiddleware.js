const { verifyToken } = require('../services/auth');
const Project = require('../models/Project');

const DEMO_USER = {
  id: '000000000000000000000001',
  email: 'demo@evolve.local',
  username: 'demo_user',
  role: 'demo'
};

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized', message: err.message });
    }
  }

  // Graceful fallback for demo or unauthenticated local dev
  const isDevOrDemo = process.env.NODE_ENV !== 'production' || req.query.demo === 'true' || process.env.DEMO_MODE === 'true';
  if (isDevOrDemo) {
    req.user = DEMO_USER;
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Authentication token required (Bearer <token>)'
  });
}

async function requireProjectOwnership(req, res, next) {
  const projectId = req.params.id || req.params.projectId;
  if (!projectId) return next();

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'NotFound', message: `Project ${projectId} not found` });
    }

    req.project = project;

    // Admin, Demo project, or Public project bypass
    if (project.isPublic || project.isDemo || req.user?.role === 'admin') {
      return next();
    }

    // Ownership check
    if (project.ownerId && req.user && project.ownerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: You do not have ownership permissions for this project'
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  authenticate,
  requireProjectOwnership,
  DEMO_USER
};
