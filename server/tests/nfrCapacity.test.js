const { evaluateNfrAndCapacity } = require('../src/services/loadTester');

describe('NFR Scorecard & Capacity Profiling Unit Tests', () => {
  test('evaluates compliant system meeting all latency and reliability SLAs', () => {
    const rawResult = {
      requests: { average: 320, max: 480 },
      latency: { average: 45, p50: 38, p95: 110, p99: 190 },
      '2xx': 9600,
      '4xx': 0,
      '5xx': 0,
      errors: 0,
      timeouts: 0
    };

    const metrics = {
      p50: 38,
      p95: 110,
      p99: 190,
      mean: 45,
      rps: 320,
      totalRequests: 9600,
      errorRate: 0.0,
      eventLoopLagP95Ms: 4.5,
      memoryMaxMb: 85
    };

    const profileConfig = {
      autocannon: { connections: 40 }
    };

    const { capacity, nfrScorecard } = evaluateNfrAndCapacity(rawResult, metrics, profileConfig);

    expect(capacity.maxPeakRps).toBe(480);
    expect(capacity.mediumSteadyRps).toBe(320);
    expect(capacity.breakingPointVus).toBeGreaterThan(40);
    expect(capacity.trafficClassification).toBe('High Throughput');

    expect(nfrScorecard.overallScore).toBe(100);
    expect(nfrScorecard.verdict).toBe('COMPLIANT');

    const latencyItem = nfrScorecard.items.find(i => i.metric.includes('Latency'));
    expect(latencyItem.status).toBe('PASS');

    const availItem = nfrScorecard.items.find(i => i.metric.includes('Availability'));
    expect(availItem.status).toBe('PASS');
  });

  test('flags non-compliant system with high tail latency and event loop lag', () => {
    const rawResult = {
      requests: { average: 45, max: 60 },
      latency: { average: 320, p50: 150, p95: 850, p99: 1200 },
      '2xx': 900,
      '4xx': 40,
      '5xx': 60,
      errors: 10,
      timeouts: 15
    };

    const metrics = {
      p50: 150,
      p95: 850, // Exceeds SLA
      p99: 1200,
      mean: 320,
      rps: 45,
      totalRequests: 1025,
      errorRate: 0.12, // 12% error rate!
      eventLoopLagP95Ms: 42.0, // Severe event-loop lag
      memoryMaxMb: 240
    };

    const profileConfig = {
      autocannon: { connections: 50 }
    };

    const { capacity, nfrScorecard } = evaluateNfrAndCapacity(rawResult, metrics, profileConfig);

    expect(capacity.trafficClassification).toBe('Bottlenecked');
    expect(capacity.breakingPointVus).toBeLessThan(50); // Saturated early

    expect(nfrScorecard.verdict).toBe('NON_COMPLIANT');
    expect(nfrScorecard.overallScore).toBeLessThan(60);

    const latencyItem = nfrScorecard.items.find(i => i.metric.includes('Latency'));
    expect(latencyItem.status).toBe('FAIL');

    const availItem = nfrScorecard.items.find(i => i.metric.includes('Availability'));
    expect(availItem.status).toBe('FAIL');

    const loopItem = nfrScorecard.items.find(i => i.metric.includes('Event Loop'));
    expect(loopItem.status).toBe('FAIL');
  });
});
