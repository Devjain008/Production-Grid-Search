/**
 * Load Testing Profile Definitions
 * Compatible with both k6 scenario configurations and autocannon execution parameters.
 */
module.exports = {
  profiles: {
    load: {
      name: 'Standard Baseline Load',
      description: 'Simulates steady user traffic to establish typical baseline performance',
      durationSeconds: 30,
      targetVUs: 20,
      k6Stages: [
        { duration: '5s', target: 10 },
        { duration: '20s', target: 20 },
        { duration: '5s', target: 0 }
      ],
      autocannon: {
        connections: 20,
        duration: 30,
        pipelining: 1
      }
    },

    stress: {
      name: 'Stress Test',
      description: 'Ramps traffic up past typical limits to identify system breaking points and saturation',
      durationSeconds: 45,
      targetVUs: 80,
      k6Stages: [
        { duration: '10s', target: 20 },
        { duration: '15s', target: 50 },
        { duration: '15s', target: 80 },
        { duration: '5s', target: 0 }
      ],
      autocannon: {
        connections: 80,
        duration: 45,
        pipelining: 2
      }
    },

    spike: {
      name: 'Traffic Spike',
      description: 'Sudden burst of traffic to verify recovery capability and failure behavior',
      durationSeconds: 20,
      targetVUs: 100,
      k6Stages: [
        { duration: '2s', target: 5 },
        { duration: '3s', target: 100 },
        { duration: '10s', target: 100 },
        { duration: '5s', target: 0 }
      ],
      autocannon: {
        connections: 100,
        duration: 20,
        pipelining: 1
      }
    },

    soak: {
      name: 'Soak / Endurance Test',
      description: 'Extended steady run to uncover memory leaks, resource exhaustion, and socket leaks',
      durationSeconds: 60,
      targetVUs: 15,
      k6Stages: [
        { duration: '5s', target: 15 },
        { duration: '50s', target: 15 },
        { duration: '5s', target: 0 }
      ],
      autocannon: {
        connections: 15,
        duration: 60,
        pipelining: 1
      }
    }
  }
};
