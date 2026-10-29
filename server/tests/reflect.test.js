const { reflect } = require('../src/services/reflect');

describe('Reflection & Lesson Generator Unit Tests', () => {
  test('generates positive lesson on accepted experiment', () => {
    const lesson = reflect({
      strategy: 'batch',
      hotspot: { function: 'getOrdersHandler' },
      verdict: 'accepted',
      comparison: { p95DeltaPct: -68.5 }
    });
    expect(lesson).toContain('batch');
    expect(lesson).toContain('getOrdersHandler');
    expect(lesson).toContain('68.5%');
  });

  test('generates test failure warning on rejected test suite', () => {
    const lesson = reflect({
      strategy: 'cache',
      hotspot: { function: 'searchHandler' },
      verdict: 'rejected',
      failureReason: { code: 'tests_failed', summary: 'Broken schema' }
    });
    expect(lesson).toContain('failed functional test suite');
  });

  test('generates memory regression takeaway', () => {
    const lesson = reflect({
      strategy: 'cache',
      hotspot: { function: 'searchHandler' },
      verdict: 'rejected',
      failureReason: { code: 'regression' },
      comparison: { memDeltaPct: 35.0 }
    });
    expect(lesson).toContain('memory regression');
    expect(lesson).toContain('35%');
  });

  test('generates noise awareness on inconclusive run', () => {
    const lesson = reflect({
      strategy: 'async',
      hotspot: { function: 'loginHandler' },
      verdict: 'inconclusive',
      comparison: { p95DeltaPct: -2.1, mannWhitneyP: 0.42 }
    });
    expect(lesson).toContain('run-to-run noise');
    expect(lesson).toContain('0.42');
  });
});
