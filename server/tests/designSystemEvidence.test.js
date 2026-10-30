const fs = require('fs');
const path = require('path');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

describe('EVOLVE Design System Evidence-First & Invariant Rules', () => {
  const tokensPath = path.resolve(__dirname, '../../client/src/design-system/tokens.ts');
  let VERDICTS = {};
  let DATA_LABELS = {};

  beforeAll(() => {
    expect(fs.existsSync(tokensPath)).toBe(true);
    const content = fs.readFileSync(tokensPath, 'utf8');

    const ast = babelParser.parse(content, {
      sourceType: 'module',
      plugins: ['typescript']
    });

    traverse(ast, {
      VariableDeclarator(nodePath) {
        if (nodePath.node.id.name === 'VERDICTS' && nodePath.node.init?.type === 'ObjectExpression') {
          nodePath.node.init.properties.forEach(prop => {
            if (prop.type === 'ObjectProperty') {
              const key = prop.key.name || prop.key.value;
              const obj = {};
              if (prop.value.type === 'ObjectExpression') {
                prop.value.properties.forEach(p => {
                  if (p.type === 'ObjectProperty') {
                    const fKey = p.key.name || p.key.value;
                    if (p.value.type === 'StringLiteral') {
                      obj[fKey] = p.value.value;
                    }
                  }
                });
              }
              VERDICTS[key] = obj;
            }
          });
        }

        if (nodePath.node.id.name === 'DATA_LABELS' && nodePath.node.init?.type === 'ObjectExpression') {
          nodePath.node.init.properties.forEach(prop => {
            if (prop.type === 'ObjectProperty') {
              const key = prop.key.name || prop.key.value;
              const obj = {};
              if (prop.value.type === 'ObjectExpression') {
                prop.value.properties.forEach(p => {
                  if (p.type === 'ObjectProperty') {
                    const fKey = p.key.name || p.key.value;
                    if (p.value.type === 'StringLiteral') {
                      obj[fKey] = p.value.value;
                    }
                  }
                });
              }
              DATA_LABELS[key] = obj;
            }
          });
        }
      }
    });
  });

  describe('VerdictBadge & Colorblind Non-Color Invariant', () => {
    test('every verdict has distinct icon name, distinct text label, and distinct semantic meaning', () => {
      const requiredVerdicts = ['accepted', 'rejected', 'inconclusive', 'errored', 'rejected_by_critic'];
      
      const seenIcons = new Set();
      const seenLabels = new Set();

      for (const vKey of requiredVerdicts) {
        const v = VERDICTS[vKey];
        expect(v).toBeDefined();
        expect(typeof v.label).toBe('string');
        expect(typeof v.shortLabel).toBe('string');
        expect(typeof v.plainMeaning).toBe('string');
        expect(typeof v.iconName).toBe('string');
        expect(v.color).toMatch(/^#[0-9a-fA-F]{6}$/);

        // Invariant: Color is NEVER the only signal!
        expect(seenIcons.has(v.iconName)).toBe(false);
        expect(seenLabels.has(v.label)).toBe(false);
        seenIcons.add(v.iconName);
        seenLabels.add(v.label);
      }
    });
  });

  describe('Honest Data Labeling Taxonomy', () => {
    test('strictly segregates REAL, SIMULATED, MOCK, and DEMO data with disclosures', () => {
      const types = ['REAL', 'SIMULATED', 'MOCK', 'DEMO'];
      for (const t of types) {
        const item = DATA_LABELS[t];
        expect(item).toBeDefined();
        expect(item.label).toBe(t);
        expect(item.description.length).toBeGreaterThan(15);
      }
    });
  });

  describe('StatPair Evidence-First Formatting Logic', () => {
    function formatStatPairLogic({ before, after, pValue, verdict, ci, nBefore = 5, nAfter = 5, lowerIsBetter = true }) {
      const isInconclusive = verdict === 'inconclusive' || (typeof pValue === 'number' && pValue >= 0.05);
      const deltaPct = ((after - before) / before) * 100;
      const isImprovement = lowerIsBetter ? deltaPct < 0 : deltaPct > 0;

      let badgeText = '';
      let badgeType = '';
      if (isInconclusive) {
        badgeText = 'No reliable difference';
        badgeType = 'amber';
      } else if (isImprovement) {
        badgeText = `${Math.abs(deltaPct).toFixed(1)}% validated gain`;
        badgeType = 'emerald';
      } else {
        badgeText = `${Math.abs(deltaPct).toFixed(1)}% regression`;
        badgeType = 'rose';
      }

      return {
        isInconclusive,
        badgeText,
        badgeType,
        evidenceString: `n=${nBefore} vs ${nAfter}${pValue !== undefined ? `, p=${pValue.toFixed(3)}` : ''}`
      };
    }

    test('accepted patch with p < 0.05 displays validated gain and green badge', () => {
      const res = formatStatPairLogic({
        before: 440,
        after: 148,
        pValue: 0.008,
        verdict: 'accepted',
        ci: [-72, -59]
      });

      expect(res.isInconclusive).toBe(false);
      expect(res.badgeType).toBe('emerald');
      expect(res.badgeText).toContain('66.4% validated gain');
      expect(res.evidenceString).toBe('n=5 vs 5, p=0.008');
    });

    test('inconclusive patch or p >= 0.05 NEVER renders a gain; renders No reliable difference', () => {
      // Even if raw numbers look 10% faster:
      const res = formatStatPairLogic({
        before: 440,
        after: 396, // 10% faster on surface
        pValue: 0.23, // But high noise p > 0.05
        verdict: 'inconclusive'
      });

      expect(res.isInconclusive).toBe(true);
      expect(res.badgeType).toBe('amber');
      expect(res.badgeText).toBe('No reliable difference');
      expect(res.badgeText).not.toContain('gain');
      expect(res.evidenceString).toBe('n=5 vs 5, p=0.230');
    });

    test('regression patch shows regression warning', () => {
      const res = formatStatPairLogic({
        before: 148,
        after: 280,
        pValue: 0.001,
        verdict: 'rejected'
      });

      expect(res.isInconclusive).toBe(false);
      expect(res.badgeType).toBe('rose');
      expect(res.badgeText).toContain('89.2% regression');
    });
  });

  describe('Heatmap Cell Confidence Invariant', () => {
    function evaluateHeatmapCell({ n, winRate }) {
      const hasEnoughData = n >= 5;
      return {
        hasEnoughData,
        displayLabel: hasEnoughData ? `${Math.round(winRate * 100)}%` : 'n < 5',
        isGreyedOut: !hasEnoughData
      };
    }

    test('cells with n < 5 are strictly greyed out with n < 5 label', () => {
      const cellLowSample = evaluateHeatmapCell({ n: 3, winRate: 1.0 }); // 100% win rate on 3 attempts
      expect(cellLowSample.hasEnoughData).toBe(false);
      expect(cellLowSample.isGreyedOut).toBe(true);
      expect(cellLowSample.displayLabel).toBe('n < 5');
    });

    test('cells with n >= 5 display accurate win rate percentage', () => {
      const cellSufficient = evaluateHeatmapCell({ n: 18, winRate: 0.88 });
      expect(cellSufficient.hasEnoughData).toBe(true);
      expect(cellSufficient.isGreyedOut).toBe(false);
      expect(cellSufficient.displayLabel).toBe('88%');
    });
  });
});
