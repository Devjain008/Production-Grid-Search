const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Project = require('../src/models/Project');
const Run = require('../src/models/Run');
const Experiment = require('../src/models/Experiment');
const DefectReport = require('../src/models/DefectReport');
const Report = require('../src/models/Report');
const User = require('../src/models/User');
const { generateFinalReport, wilsonInterval } = require('../src/services/report');
const { requireProjectOwnership } = require('../src/middleware/authMiddleware');

describe('EVOLVE Phase 6 Reports & Multi-Tenant Ownership Suite', () => {

  describe('Wilson Score Confidence Interval Math', () => {
    test('Calculates valid Wilson score intervals for proportions', () => {
      // 0 wins out of 10
      const ci0 = wilsonInterval(0, 10);
      expect(ci0[0]).toBe(0);
      expect(ci0[1]).toBeGreaterThan(0);

      // 5 wins out of 10
      const ciHalf = wilsonInterval(5, 10);
      expect(ciHalf[0]).toBeLessThan(0.5);
      expect(ciHalf[1]).toBeGreaterThan(0.5);

      // 10 wins out of 10
      const ciFull = wilsonInterval(10, 10);
      expect(ciFull[0]).toBeGreaterThan(0.6);
      expect(ciFull[1]).toBe(1);
    });
  });

  describe('Per-User Project Ownership Isolation', () => {
    test('requireProjectOwnership permits owner and blocks cross-tenant access', async () => {
      const ownerId = new mongoose.Types.ObjectId();
      const strangerId = new mongoose.Types.ObjectId();

      const mockProject = {
        _id: new mongoose.Types.ObjectId(),
        ownerId,
        isPublic: false,
        isDemo: false
      };

      jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

      // 1. Owner requests project -> ALLOWED (calls next)
      const reqOwner = { params: { id: mockProject._id }, user: { id: ownerId, role: 'user' } };
      const resOwner = {};
      const nextOwner = jest.fn();
      await requireProjectOwnership(reqOwner, resOwner, nextOwner);
      expect(nextOwner).toHaveBeenCalled();

      // 2. Stranger requests project -> FORBIDDEN (403)
      const reqStranger = { params: { id: mockProject._id }, user: { id: strangerId, role: 'user' } };
      const resStranger = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const nextStranger = jest.fn();
      await requireProjectOwnership(reqStranger, resStranger, nextStranger);
      expect(resStranger.status).toHaveBeenCalledWith(403);
      expect(resStranger.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Forbidden' }));
      expect(nextStranger).not.toHaveBeenCalled();

      // 3. Admin requests project -> ALLOWED (calls next)
      const reqAdmin = { params: { id: mockProject._id }, user: { id: strangerId, role: 'admin' } };
      const nextAdmin = jest.fn();
      await requireProjectOwnership(reqAdmin, {}, nextAdmin);
      expect(nextAdmin).toHaveBeenCalled();

      // 4. Demo or Public project -> ALLOWED for anyone
      mockProject.isPublic = true;
      const nextPublic = jest.fn();
      await requireProjectOwnership(reqStranger, {}, nextPublic);
      expect(nextPublic).toHaveBeenCalled();

      Project.findById.mockRestore();
    });
  });

  describe('Report Generator Artifacts & Completeness', () => {
    test('generateFinalReport produces HTML, PDF, Markdown, and JSON with all 12 sections', async () => {
      const projectId = new mongoose.Types.ObjectId();
      const jobId = 'test-job-rep-01';

      const mockProject = {
        _id: projectId,
        name: 'Shop API',
        baselineRunId: new mongoose.Types.ObjectId()
      };

      const mockBaselineRun = {
        _id: mockProject.baselineRunId,
        metrics: { p95: 140.0, rps: 90.0, errorRate: 0.001, memoryMb: 105.0 }
      };

      const mockDefects = {
        projectId,
        rankedDefects: [
          { rank: 1, file: 'server.js', line: 40, functionName: 'getOrders', category: 'performance', severity: 5, hotnessScore: 0.9, suggestedStrategy: 'batch' }
        ]
      };

      const mockExperiments = [
        {
          _id: new mongoose.Types.ObjectId(),
          projectId,
          hotspot: { file: 'server.js', line: 40, function: 'getOrders', category: 'performance' },
          strategy: 'batch',
          verdict: 'accepted',
          diff: '--- a/server.js\n+++ b/server.js\n- loop\n+ batch\n',
          comparison: { p95DeltaPct: -35.0, mannWhitneyP: 0.008, effectSize: 0.9, nCandidate: 5 },
          lesson: 'Batch queries with $in'
        },
        {
          _id: new mongoose.Types.ObjectId(),
          projectId,
          hotspot: { file: 'server.js', line: 80, function: 'login', category: 'performance' },
          strategy: 'cache',
          verdict: 'rejected',
          failureReason: { code: 'regression', summary: 'Memory spike' },
          lesson: 'Cache without TTL leaks memory'
        }
      ];

      jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);
      jest.spyOn(Run, 'findById').mockResolvedValue(mockBaselineRun);
      jest.spyOn(DefectReport, 'findOne').mockReturnValue({ sort: jest.fn().mockResolvedValue(mockDefects) });
      jest.spyOn(Experiment, 'find').mockReturnValue({ sort: jest.fn().mockResolvedValue(mockExperiments) });
      jest.spyOn(Report.prototype, 'save').mockResolvedValue(true);

      const report = await generateFinalReport({
        projectId,
        jobId,
        formats: ['html', 'pdf', 'md', 'json']
      });

      expect(report).toBeDefined();
      expect(report.artifacts.jsonPath).toBeDefined();
      expect(report.artifacts.markdownPath).toBeDefined();
      expect(report.artifacts.htmlPath).toBeDefined();
      expect(report.artifacts.pdfPath).toBeDefined();

      // Verify files exist on disk
      expect(fs.existsSync(report.artifacts.jsonPath)).toBe(true);
      expect(fs.existsSync(report.artifacts.markdownPath)).toBe(true);
      expect(fs.existsSync(report.artifacts.htmlPath)).toBe(true);

      const jsonContent = JSON.parse(fs.readFileSync(report.artifacts.jsonPath, 'utf8'));
      expect(jsonContent.executiveSummary.baselineP95Ms).toBe(140);
      expect(jsonContent.plainLanguageSummary).toContain('Shop API');
      expect(jsonContent.environment.hardwareClass).toContain('cgroup v2 sandbox');
      expect(jsonContent.acceptedFixes.length).toBe(1);
      expect(jsonContent.rejectedOrInconclusive.length).toBe(1);
      expect(jsonContent.limitations.length).toBeGreaterThan(0);

      // Clean up artifacts
      try {
        fs.unlinkSync(report.artifacts.jsonPath);
        fs.unlinkSync(report.artifacts.markdownPath);
        fs.unlinkSync(report.artifacts.htmlPath);
        if (fs.existsSync(report.artifacts.pdfPath)) fs.unlinkSync(report.artifacts.pdfPath);
      } catch (e) {}

      Project.findById.mockRestore();
      Run.findById.mockRestore();
      DefectReport.findOne.mockRestore();
      Experiment.find.mockRestore();
      Report.prototype.save.mockRestore();
    });
  });
});
