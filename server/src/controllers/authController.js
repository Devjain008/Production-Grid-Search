const User = require('../models/User');
const Project = require('../models/Project');
const Run = require('../models/Run');
const Experiment = require('../models/Experiment');
const DefectReport = require('../models/DefectReport');
const Report = require('../models/Report');
const { generateToken } = require('../services/auth');

/**
 * Register a new user
 */
async function register(req, res, next) {
  try {
    const { email, username, password } = req.body;
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'BadRequest', message: 'Email, username, and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Conflict', message: 'User with this email already exists' });
    }

    const { salt, hash } = await User.hashPassword(password);
    const user = new User({
      email: email.toLowerCase(),
      username,
      salt,
      passwordHash: hash
    });
    await user.save();

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Login existing user
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'BadRequest', message: 'Email and password required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
    }

    const valid = await user.verifyPassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
    }

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Export all user data (GDPR requirement)
 */
async function exportUserData(req, res, next) {
  try {
    const userId = req.user?.id;
    const projects = await Project.find({ ownerId: userId });
    const projectIds = projects.map(p => p._id);

    const [runs, experiments, defects, reports] = await Promise.all([
      Run.find({ projectId: { $in: projectIds } }),
      Experiment.find({ projectId: { $in: projectIds } }),
      DefectReport.find({ projectId: { $in: projectIds } }),
      Report.find({ projectId: { $in: projectIds } })
    ]);

    res.json({
      user: req.user,
      exportedAt: new Date().toISOString(),
      counts: {
        projects: projects.length,
        runs: runs.length,
        experiments: experiments.length,
        defectReports: defects.length,
        reports: reports.length
      },
      data: {
        projects,
        runs,
        experiments,
        defectReports: defects,
        reports
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  exportUserData
};
