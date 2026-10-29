const { profiles } = require('./base-profiles');

/**
 * Generates an executable k6 test script string from detected Express routes and target profile.
 * 
 * @param {Array<{method: string, path: string, params?: Array<string>}>} routes
 * @param {string} baseUrl - e.g. "http://localhost:3000"
 * @param {string} profileName - "load" | "stress" | "spike" | "soak"
 * @returns {string} Executable k6 script contents
 */
function generateK6Script(routes, baseUrl, profileName = 'load') {
  const selectedProfile = profiles[profileName] || profiles.load;
  const stagesJson = JSON.stringify(selectedProfile.k6Stages, null, 2);

  // Filter out internal and dangerous routes
  const candidateRoutes = routes.filter(r => !r.path.includes('/_evolve_'));

  // Build route execution blocks
  const routeExecutors = candidateRoutes.map((route, idx) => {
    let targetPath = route.path;
    // Replace param placeholders like :id with dummy value
    targetPath = targetPath.replace(/:[a-zA-Z0-9_]+/g, '1');

    if (route.method.toUpperCase() === 'POST' || route.method.toUpperCase() === 'PUT') {
      let body = {};
      if (route.path.includes('login') || route.path.includes('auth')) {
        body = { username: 'testuser', password: 'password123' };
      } else if (route.path.includes('event') || route.path.includes('analytics')) {
        body = { event: 'page_view', timestamp: Date.now(), referrer: 'direct' };
      } else {
        body = { title: 'Sample Load Item', active: true, timestamp: Date.now() };
      }

      return `
    // Route #${idx + 1}: ${route.method} ${route.path}
    {
      const payload = JSON.stringify(${JSON.stringify(body)});
      const params = {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: '${route.method} ${route.path}' }
      };
      const res = http.${route.method.toLowerCase()}('${baseUrl}${targetPath}', payload, params);
      check(res, {
        'status is 200/201': (r) => r.status === 200 || r.status === 201
      });
      errorRate.add(res.status >= 400);
      reqDurationTrend.add(res.timings.duration);
      sleep(0.1);
    }
      `;
    } else {
      let queryString = '';
      if (route.path.includes('search')) {
        queryString = '?q=sku-1';
      }
      return `
    // Route #${idx + 1}: ${route.method} ${route.path}
    {
      const res = http.get('${baseUrl}${targetPath}${queryString}', {
        tags: { name: '${route.method} ${route.path}' }
      });
      check(res, {
        'status is 200': (r) => r.status === 200
      });
      errorRate.add(res.status >= 400);
      reqDurationTrend.add(res.timings.duration);
      sleep(0.1);
    }
      `;
    }
  }).join('\n');

  return `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

export const errorRate = new Rate('errors');
export const reqDurationTrend = new Trend('custom_req_duration');

export const options = {
  stages: ${stagesJson},
  thresholds: {
    errors: ['rate<0.1'],
    http_req_duration: ['p(95)<2000']
  }
};

export default function () {
  ${routeExecutors}
}

export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data, null, 2)
  };
}
`;
}

module.exports = {
  generateK6Script
};
