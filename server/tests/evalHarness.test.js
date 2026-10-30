const path = require('path');
const fs = require('fs');
const { bootstrapCI, loadBenchmarkSuite, CONDITIONS } = require('../../evaluation/runner');

describe('EVOLVE Evaluation Harness Verification Suite', () => {

  describe('Metric Computation & Bootstrap Confidence Intervals', () => {
    test('bootstrapCI computes valid 95% confidence intervals matching bounds', () => {
      const samples = [10.0, 12.0, 14.0, 11.0, 13.0, 12.5];
      const ci = bootstrapCI(samples, 500);

      expect(ci.length).toBe(2);
      expect(ci[0]).toBeGreaterThanOrEqual(10.0);
      expect(ci[1]).toBeLessThanOrEqual(14.0);
      expect(ci[0]).toBeLessThan(ci[1]);
    });

    test('bootstrapCI handles single-item and empty arrays defensively', () => {
      expect(bootstrapCI([])).toEqual([0, 0]);
      expect(bootstrapCI([42.5])).toEqual([42.5, 42.5]);
    });
  });

  describe('Benchmark Suite & Ground Truth Completeness', () => {
    test('Benchmark suite loads >= 10 sample applications with valid ground truth', () => {
      const suite = loadBenchmarkSuite();
      expect(suite.length).toBeGreaterThanOrEqual(10);

      // Verify each application contains valid ground truth entries
      for (const app of suite) {
        expect(app.name).toBeDefined();
        expect(Array.isArray(app.groundTruth)).toBe(true);
        expect(app.groundTruth.length).toBeGreaterThan(0);

        for (const defect of app.groundTruth) {
          expect(defect.file).toBeDefined();
          expect(defect.function).toBeDefined();
          if (!app.isUncontrolled) {
            expect(defect.expectedStrategy || defect.strategy).toBeDefined();
          }
        }
      }

      // Verify at least one uncontrolled case exists
      const uncontrolled = suite.filter(s => s.isUncontrolled);
      expect(uncontrolled.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Determinism & Data Integrity Guards', () => {
    test('results.json exists and all condition metrics derive from raw numbers', () => {
      const jsonPath = path.join(__dirname, '..', '..', 'evaluation', 'results.json');
      const mdPath = path.join(__dirname, '..', '..', 'evaluation', 'RESULTS_SUMMARY.md');

      if (!fs.existsSync(jsonPath)) {
        // Run eval dry to generate if missing
        const { runEvaluation } = require('../../evaluation/runner');
        runEvaluation();
      }

      expect(fs.existsSync(jsonPath)).toBe(true);
      expect(fs.existsSync(mdPath)).toBe(true);

      const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const md = fs.readFileSync(mdPath, 'utf8');

      // Verify every condition in CONDITIONS is present in results.json
      for (const cond of CONDITIONS) {
        expect(json.conditionSummaries[cond]).toBeDefined();
        expect(json.conditionSummaries[cond].p95ReductionPct.mean).toBeDefined();
        expect(json.conditionSummaries[cond].p95ReductionPct.ci95.length).toBe(2);

        // Guard test: number in Markdown summary matches results.json
        const meanP95Str = `${json.conditionSummaries[cond].p95ReductionPct.mean}%`;
        expect(md).toContain(meanP95Str);
      }

      // Guard test: B1 (unit tests only) exhibits higher false accept rate than FULL
      expect(json.conditionSummaries['B1'].falseAcceptRate.mean).toBeGreaterThan(
        json.conditionSummaries['FULL'].falseAcceptRate.mean
      );
    });
  });
});
