/**
 * Virtual User Personas for k6 & Synthetic Traffic Generation
 */
const PERSONAS = {
  browser: {
    name: 'Browser Persona (Read-Heavy)',
    weight: 0.60,
    description: 'Simulates normal browsing traffic with search, catalog queries, and pagination.',
    targetRpsRatio: 0.60,
    behavior: {
      thinkTimeMinMs: 100,
      thinkTimeMaxMs: 400,
      readToWriteRatio: 0.95,
      preferredMethods: ['GET']
    }
  },

  buyer: {
    name: 'Buyer Persona (Transactional Flow)',
    weight: 0.30,
    description: 'Simulates customer purchasing journey: authentication -> catalog browsing -> order inspection -> submitting reviews.',
    targetRpsRatio: 0.30,
    behavior: {
      thinkTimeMinMs: 200,
      thinkTimeMaxMs: 800,
      flowSteps: [
        { method: 'POST', path: '/login', body: { username: 'buyer_user', password: 'password123' } },
        { method: 'GET', path: '/products' },
        { method: 'GET', path: '/orders' },
        { method: 'POST', path: '/reviews', body: { productId: 1, rating: 5, comment: 'Excellent product delivery' } }
      ]
    }
  },

  abusive: {
    name: 'Abusive Client (Stress & Fuzzing)',
    weight: 0.10,
    description: 'Simulates malicious or misconfigured clients firing rapid bursts, invalid tokens, oversized payloads (1MB+), and fuzzing inputs.',
    targetRpsRatio: 0.10,
    behavior: {
      bursts: true,
      concurrencyMultiplier: 2.5,
      fuzzPayloads: true
    }
  }
};

module.exports = {
  PERSONAS
};
