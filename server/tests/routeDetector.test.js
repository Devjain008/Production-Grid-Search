const path = require('path');
const { detectProjectRoutes, parseFileRoutes } = require('../src/services/routeDetector');

describe('RouteDetector Unit Tests', () => {
  const sampleDir = path.resolve(__dirname, '../../samples/buggy-express-app');
  const serverJsPath = path.join(sampleDir, 'server.js');

  test('parses routes accurately from Express AST in server.js', () => {
    const routes = parseFileRoutes(serverJsPath, sampleDir);
    expect(routes.length).toBeGreaterThanOrEqual(5);

    const methodsAndPaths = routes.map(r => `${r.method} ${r.path}`);
    expect(methodsAndPaths).toContain('GET /health');
    expect(methodsAndPaths).toContain('GET /api/info');
    expect(methodsAndPaths).toContain('GET /api/users');
    expect(methodsAndPaths).toContain('POST /api/auth/login');
    expect(methodsAndPaths).toContain('POST /api/analytics/events');
    expect(methodsAndPaths).toContain('GET /api/items/search');
  });

  test('scans entire project directory and returns deduplicated route list', () => {
    const allRoutes = detectProjectRoutes(sampleDir);
    expect(allRoutes.length).toBeGreaterThanOrEqual(5);

    const healthRoute = allRoutes.find(r => r.path === '/health');
    expect(healthRoute).toBeDefined();
    expect(healthRoute.method).toBe('GET');
  });
});
