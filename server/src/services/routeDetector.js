const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'all'];

/**
 * Recursively find all JavaScript files in the project directory, skipping node_modules
 */
function findJsFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        findJsFiles(fullPath, fileList);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

/**
 * Check for OpenAPI / Swagger definitions in the project
 */
function detectOpenApiRoutes(projectDir) {
  const possibleFiles = ['openapi.json', 'swagger.json', 'api-docs.json'];
  for (const filename of possibleFiles) {
    const filePath = path.join(projectDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (content.paths) {
          const routes = [];
          for (const [routePath, methods] of Object.entries(content.paths)) {
            for (const [method, details] of Object.entries(methods)) {
              if (HTTP_METHODS.includes(method.toLowerCase())) {
                routes.push({
                  method: method.toUpperCase(),
                  path: routePath,
                  params: (details.parameters || [])
                    .filter(p => p.in === 'path')
                    .map(p => p.name),
                  filePath: filename,
                  line: 1
                });
              }
            }
          }
          if (routes.length > 0) return routes;
        }
      } catch (e) {
        // Continue to AST parsing if JSON parse fails
      }
    }
  }
  return null;
}

/**
 * Parse Express route declarations using Babel AST
 */
function parseFileRoutes(filePath, projectDir) {
  const code = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(projectDir, filePath);
  const detected = [];

  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript', 'classProperties', 'dynamicImport', 'asyncGenerators']
    });
  } catch (err) {
    // If AST parsing fails, fallback to regex
    return fallbackRegexRoutes(code, relativePath);
  }

  // Map to track mounted router prefixes (e.g. app.use('/api', apiRouter))
  const routerPrefixes = new Map();

  traverse(ast, {
    CallExpression(nodePath) {
      const callee = nodePath.node.callee;
      if (callee.type === 'MemberExpression') {
        const method = callee.property.name;
        const args = nodePath.node.arguments;

        // Check for router mounting: app.use('/prefix', router)
        if (method === 'use' && args.length >= 2) {
          if (args[0].type === 'StringLiteral') {
            const prefix = args[0].value;
            if (args[1].type === 'Identifier') {
              routerPrefixes.set(args[1].name, prefix);
            }
          }
        }

        // Check for HTTP route registrations: app.get('/path', handler) or router.post('/path', ...)
        if (HTTP_METHODS.includes(method)) {
          if (args.length >= 1 && args[0].type === 'StringLiteral') {
            let routePath = args[0].value;
            const callerName = callee.object.name;

            // Prepend prefix if defined
            if (callerName && routerPrefixes.has(callerName)) {
              const prefix = routerPrefixes.get(callerName);
              routePath = path.posix.join(prefix, routePath);
            }

            // Extract path params e.g. /users/:id -> ['id']
            const paramMatches = routePath.match(/:([a-zA-Z0-9_]+)/g) || [];
            const params = paramMatches.map(p => p.slice(1));

            detected.push({
              method: method.toUpperCase(),
              path: routePath,
              params,
              filePath: relativePath,
              line: nodePath.node.loc ? nodePath.node.loc.start.line : 1
            });
          }
        }
      }
    }
  });

  return detected;
}

/**
 * Regex fallback for edge cases
 */
function fallbackRegexRoutes(code, relativePath) {
  const detected = [];
  const regex = /(?:app|router)\.(get|post|put|delete|patch|all)\(\s*['"`]([^'"`]+)['"`]/gi;
  let match;
  while ((match = regex.exec(code)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = match[2];
    const paramMatches = routePath.match(/:([a-zA-Z0-9_]+)/g) || [];
    const params = paramMatches.map(p => p.slice(1));

    detected.push({
      method,
      path: routePath,
      params,
      filePath: relativePath,
      line: 1
    });
  }
  return detected;
}

/**
 * Detect all routes across a project directory
 * 
 * @param {string} projectDir 
 * @returns {Array<{method: string, path: string, params: Array<string>, filePath: string, line: number}>}
 */
function detectProjectRoutes(projectDir) {
  // 1. Check for OpenAPI / Swagger specs first
  const openApiRoutes = detectOpenApiRoutes(projectDir);
  if (openApiRoutes && openApiRoutes.length > 0) {
    return openApiRoutes;
  }

  // 2. Scan JavaScript files
  const files = findJsFiles(projectDir);
  const allRoutes = [];
  const seen = new Set();

  for (const file of files) {
    try {
      const routes = parseFileRoutes(file, projectDir);
      for (const route of routes) {
        const key = `${route.method}:${route.path}`;
        if (!seen.has(key)) {
          seen.add(key);
          allRoutes.push(route);
        }
      }
    } catch (err) {
      console.warn(`[RouteDetector] Failed parsing ${file}:`, err.message);
    }
  }

  // Always ensure a root or healthcheck endpoint is available
  if (allRoutes.length === 0) {
    allRoutes.push({
      method: 'GET',
      path: '/',
      params: [],
      filePath: 'unknown',
      line: 1
    });
  }

  return allRoutes;
}

module.exports = {
  detectProjectRoutes,
  parseFileRoutes,
  findJsFiles
};
