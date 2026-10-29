const axios = require('axios');
const { RuleBasedPolicy, LearnedPolicy } = require('../src/agents/policy');

jest.mock('axios');

describe('LearnedPolicy & Contextual Bandit Policy Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockHotspot = {
    file: 'orders.js',
    function: 'getOrders',
    category: 'performance',
    suggestedStrategy: 'batch',
    evidence: {
      static: ['db.orders.find() in loop']
    }
  };

  test('Mode: rule uses RuleBasedPolicy directly', async () => {
    const policy = new LearnedPolicy({ mode: 'rule' });
    const res = await policy.selectStrategy({
      hotspot: mockHotspot,
      features: { dbTimeShare: 0.8 },
      similarCases: []
    });

    expect(res.strategy).toBe('batch');
    expect(res.policyMode).toBe('rule');
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('Mode: learned queries FastAPI /policy/select and receives contextual arm', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        arm: 'batch',
        propensity: 0.85,
        scores: { batch: { mean: 0.65 } },
        masked: [],
        mode: 'linucb',
        policyVersion: 1,
        reason: 'Contextual LinUCB selected batch based on high dbTimeShare'
      }
    });

    const policy = new LearnedPolicy({ mode: 'learned', analyzerUrl: 'http://localhost:8000' });
    const res = await policy.selectStrategy({
      hotspot: mockHotspot,
      features: { dbTimeShare: 0.85 },
      similarCases: []
    });

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:8000/policy/select',
      expect.objectContaining({
        hotspot: mockHotspot,
        features: { dbTimeShare: 0.85 }
      }),
      expect.any(Object)
    );

    expect(res.strategy).toBe('batch');
    expect(res.policyMode).toBe('linucb');
    expect(res.propensity).toBe(0.85);
  });

  test('Mode: learned gracefully falls back to RuleBasedPolicy when FastAPI analyzer is unreachable', async () => {
    axios.post.mockRejectedValueOnce(new Error('ECONNREFUSED 127.0.0.1:8000'));

    const policy = new LearnedPolicy({ mode: 'learned', analyzerUrl: 'http://localhost:8000' });
    const res = await policy.selectStrategy({
      hotspot: mockHotspot,
      features: { dbTimeShare: 0.85 },
      similarCases: []
    });

    // Successfully fell back to rule-based suggestion without throwing
    expect(res.strategy).toBe('batch');
    expect(res.policyMode).toBe('rule');
  });

  test('Mode: shadow tracks agreement rate between rule and learned choices', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        arm: 'batch',
        propensity: 0.90,
        mode: 'thompson',
        policyVersion: 1
      }
    });

    const policy = new LearnedPolicy({ mode: 'shadow' });
    const res = await policy.selectStrategy({
      hotspot: mockHotspot,
      features: {},
      similarCases: []
    });

    expect(res.strategy).toBe('batch'); // Rule choice executed
    expect(res.policyMode).toBe('shadow');
    expect(res.shadowLearnedChoice?.strategy).toBe('batch');
    expect(policy.shadowStats.total).toBe(1);
    expect(policy.shadowStats.agreements).toBe(1);
  });

  test('Policy.update dispatches non-blocking update to /policy/update', async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });

    const policy = new LearnedPolicy({ analyzerUrl: 'http://localhost:8000' });
    await policy.update({
      features: { dbTimeShare: 0.8 },
      strategy: 'batch',
      reward: 0.55,
      category: 'performance',
      experimentId: '6620f4c01234567890abcdef'
    });

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:8000/policy/update',
      expect.objectContaining({
        arm: 'batch',
        reward: 0.55,
        category: 'performance',
        experimentId: '6620f4c01234567890abcdef'
      }),
      expect.any(Object)
    );
  });
});
