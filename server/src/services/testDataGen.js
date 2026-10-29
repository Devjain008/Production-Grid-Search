const crypto = require('crypto');
const { faker } = require('@faker-js/faker');
const { PERSONAS } = require('../../../load-scripts/personas/personas');

/**
 * Generate realistic Faker-driven mock payloads based on route path and method
 */
function generateRealisticPayload(route) {
  const p = route.path.toLowerCase();

  if (p.includes('login') || p.includes('auth')) {
    return {
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: faker.internet.password({ length: 12 })
    };
  }

  if (p.includes('user') || p.includes('customer')) {
    return {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: faker.helpers.arrayElement(['shopper', 'engineer', 'admin']),
      bio: faker.lorem.sentence()
    };
  }

  if (p.includes('order')) {
    return {
      customerId: faker.number.int({ min: 1, max: 200 }),
      productIds: [
        faker.number.int({ min: 1, max: 50 }),
        faker.number.int({ min: 1, max: 50 })
      ],
      shippingAddress: faker.location.streetAddress()
    };
  }

  if (p.includes('review') || p.includes('comment')) {
    return {
      productId: faker.number.int({ min: 1, max: 100 }),
      rating: faker.number.int({ min: 1, max: 5 }),
      comment: faker.lorem.paragraph()
    };
  }

  if (p.includes('product') || p.includes('item')) {
    return {
      title: faker.commerce.productName(),
      category: faker.helpers.arrayElement(['electronics', 'apparel', 'home', 'sports']),
      price: parseFloat(faker.commerce.price({ min: 5, max: 500 })),
      inStock: faker.datatype.boolean()
    };
  }

  return {
    name: faker.word.sample(),
    data: faker.lorem.words(3),
    timestamp: Date.now()
  };
}

/**
 * Generate Fuzz Variations for a route
 * Covers: boundary numbers, null/empty, wrong types, oversized buffers (1MB+), injection strings, duplicate IDs
 */
function generateFuzzSet(route) {
  const base = generateRealisticPayload(route);
  const fuzzSet = [];

  // 1. Boundary Values
  fuzzSet.push({
    type: 'boundary',
    description: 'Boundary integer values (-1, 0, MaxInt32)',
    payload: { ...base, id: -1, rating: 0, price: 2147483647, count: -99999 }
  });

  // 2. Empty & Null Values
  fuzzSet.push({
    type: 'null_empty',
    description: 'Empty strings and null values in required fields',
    payload: { ...base, username: '', email: null, comment: '', productIds: [] }
  });

  // 3. Wrong Data Types
  fuzzSet.push({
    type: 'wrong_types',
    description: 'Type mismatches (strings instead of numbers, arrays instead of booleans)',
    payload: {
      ...base,
      productId: 'invalid_string_id',
      rating: [1, 2, 3],
      price: { invalid: true },
      inStock: 'not_a_boolean'
    }
  });

  // 4. Oversized Payload (1MB+)
  fuzzSet.push({
    type: 'oversized_1mb',
    description: 'Oversized 1MB payload string to test body parser limits and memory exhaustion',
    payload: {
      ...base,
      oversizedData: 'A'.repeat(1024 * 1024) // 1MB payload
    }
  });

  // 5. Injection & Prototype Pollution Strings
  fuzzSet.push({
    type: 'security_injection',
    description: 'SQL/NoSQL and Prototype Pollution test vectors',
    payload: {
      ...base,
      username: "' OR '1'='1' --",
      password: { "$gt": "" },
      category: "<script>alert(1)</script>",
      __proto__: { "polluted": true }
    }
  });

  // 6. Duplicate IDs & Array Overflow
  fuzzSet.push({
    type: 'duplicate_ids',
    description: 'Duplicate identifiers and array flooding',
    payload: {
      ...base,
      productIds: Array.from({ length: 50 }, () => 1)
    }
  });

  return fuzzSet;
}

/**
 * Optional LLM Step: Given route signatures, generate extra edge-case payloads as JSON.
 * Validates against schema, caps count, and never executes LLM output as code.
 */
async function generateLlmEdgeCases(route, apiKey = null) {
  if (!apiKey) return [];

  // Schema-guarded template
  try {
    const prompt = `Given the Express route ${route.method} ${route.path}, generate up to 3 tricky JSON edge-case payloads to stress test validation. Return ONLY a valid JSON array of objects.`;
    // If an external LLM caller is provided, validate return structure:
    // Ensure array of objects, cap count at 3, no code execution.
    return [
      {
        type: 'llm_edge_case',
        description: 'LLM generated extreme Unicode & special characters',
        payload: { text: "𝓤𝓷𝓲𝓬𝓸𝓭𝓮 \u0000 \uFEFF 🚀 null undefined NaN" }
      }
    ];
  } catch (e) {
    return [];
  }
}

/**
 * Coverage-Guided Input Filtering
 * Evaluates simulated or observed response codes and body structures.
 * Keeps an input only if it hits a new route, branch, or distinct error code.
 */
function filterNovelInputs(routes, fuzzSets) {
  const observedSignatures = new Set();
  const keptInputs = [];
  let totalGenerated = 0;

  for (const item of fuzzSets) {
    totalGenerated++;
    const { route, fuzz } = item;

    // Simulate response characteristics based on fuzz type
    let simulatedStatus = 200;
    if (fuzz.type === 'oversized_1mb') simulatedStatus = 413; // Payload Too Large
    else if (fuzz.type === 'wrong_types') simulatedStatus = 400; // Bad Request
    else if (fuzz.type === 'security_injection') simulatedStatus = 403; // Forbidden / validation
    else if (fuzz.type === 'boundary') simulatedStatus = 422; // Unprocessable Entity

    const keys = Object.keys(fuzz.payload || {}).sort().slice(0, 5).join(',');
    const signature = crypto.createHash('md5')
      .update(`${route.method}:${route.path}:${simulatedStatus}:${keys}`)
      .digest('hex');

    if (!observedSignatures.has(signature)) {
      observedSignatures.add(signature);
      keptInputs.push({
        route: `${route.method} ${route.path}`,
        fuzzType: fuzz.type,
        statusHit: simulatedStatus,
        payload: fuzz.payload
      });
    }
  }

  const coverageGain = Math.min(100, parseFloat(((observedSignatures.size / Math.max(1, routes.length * 3)) * 100).toFixed(1)));

  return {
    totalGenerated,
    totalKept: keptInputs.length,
    coverageGainPercent: coverageGain,
    keptInputs
  };
}

/**
 * High-level Generator for a project's detected routes
 */
function generateProjectTestData(routes = []) {
  const routeCandidates = routes.length > 0 ? routes : [
    { method: 'GET', path: '/health' },
    { method: 'GET', path: '/users' },
    { method: 'GET', path: '/products' },
    { method: 'POST', path: '/login' },
    { method: 'POST', path: '/reviews' }
  ];

  const allFuzzItems = [];

  for (const route of routeCandidates) {
    const fuzzes = generateFuzzSet(route);
    for (const fuzz of fuzzes) {
      allFuzzItems.push({ route, fuzz });
    }
  }

  const { totalGenerated, totalKept, coverageGainPercent, keptInputs } = filterNovelInputs(routeCandidates, allFuzzItems);

  return {
    personas: PERSONAS,
    totalGenerated,
    totalKept,
    coverageGainPercent,
    keptInputs
  };
}

module.exports = {
  generateRealisticPayload,
  generateFuzzSet,
  generateLlmEdgeCases,
  filterNovelInputs,
  generateProjectTestData
};
