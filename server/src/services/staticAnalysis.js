const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const { v4: uuidv4 } = require('uuid');

/**
 * Normalized Finding Data Contract
 * Severity scale: 1 (Info), 2 (Low), 3 (Medium), 4 (High), 5 (Critical)
 */
function normalizeFinding(data) {
  const {
    id = `finding-${uuidv4().slice(0, 8)}`,
    tool = 'semgrep',
    ruleId = 'unknown-rule',
    category = 'performance',
    severity = 3,
    file = 'server.js',
    line = 1,
    endLine = line,
    functionName = 'anonymous',
    message = '',
    snippet = ''
  } = data;

  const validCategories = ['performance', 'reliability', 'security', 'architecture'];
  const validCategory = validCategories.includes(category) ? category : 'performance';
  const boundedSeverity = Math.max(1, Math.min(5, Math.round(Number(severity) || 3)));

  return {
    id,
    tool,
    ruleId,
    category: validCategory,
    severity: boundedSeverity,
    file: path.basename(file),
    filePath: file,
    line: Math.max(1, Number(line) || 1),
    endLine: Math.max(Number(line) || 1, Number(endLine) || Number(line) || 1),
    functionName: functionName || 'anonymous',
    message: String(message || '').trim(),
    snippet: String(snippet || '').trim().slice(0, 500)
  };
}

/**
 * Calculate cyclomatic complexity for every function in an AST
 * Flag functions where complexity > 10
 */
function analyzeComplexity(ast, code, filename) {
  const findings = [];
  const lines = code.split('\n');

  traverse(ast, {
    Function(astPath) {
      const node = astPath.node;
      let complexity = 1; // Base complexity
      let funcName = 'anonymous';

      if (node.id && node.id.name) {
        funcName = node.id.name;
      } else if (astPath.parent && astPath.parent.type === 'VariableDeclarator' && astPath.parent.id) {
        funcName = astPath.parent.id.name;
      } else if (astPath.parent && astPath.parent.type === 'AssignmentExpression' && astPath.parent.left) {
        funcName = astPath.parent.left.property?.name || astPath.parent.left.name || 'anonymous';
      }

      astPath.traverse({
        IfStatement() { complexity++; },
        ConditionalExpression() { complexity++; },
        ForStatement() { complexity++; },
        ForInStatement() { complexity++; },
        ForOfStatement() { complexity++; },
        WhileStatement() { complexity++; },
        DoWhileStatement() { complexity++; },
        CatchClause() { complexity++; },
        SwitchCase(casePath) {
          if (casePath.node.test) complexity++;
        },
        LogicalExpression(logicPath) {
          if (logicPath.node.operator === '&&' || logicPath.node.operator === '||') {
            complexity++;
          }
        }
      });

      if (complexity > 10) {
        const startLine = node.loc ? node.loc.start.line : 1;
        const endLine = node.loc ? node.loc.end.line : startLine;
        const snippet = lines.slice(startLine - 1, Math.min(endLine, startLine + 4)).join('\n');

        findings.push(normalizeFinding({
          tool: 'complexity',
          ruleId: 'high-cyclomatic-complexity',
          category: 'architecture',
          severity: complexity > 15 ? 4 : 3,
          file: filename,
          line: startLine,
          endLine,
          functionName: funcName,
          message: `Function '${funcName}' has high cyclomatic complexity of ${complexity} (threshold: 10). High branch count increases cognitive load and regression risk.`,
          snippet
        }));
      }
    }
  });

  return findings;
}

/**
 * Custom AST Rules Engine: Implements the 9 custom rules accurately on JavaScript AST
 */
function analyzeAstRules(ast, code, filename) {
  const findings = [];
  const lines = code.split('\n');
  const getSnippet = (start, end) => lines.slice(Math.max(0, start - 1), Math.min(lines.length, end)).join('\n');

  // Track module-level unbounded collections (Map, Array, Set)
  const moduleCollections = new Set();

  traverse(ast, {
    Program(progPath) {
      for (const statement of progPath.node.body) {
        if (statement.type === 'VariableDeclaration') {
          for (const decl of statement.declarations) {
            if (decl.init) {
              if (decl.init.type === 'NewExpression' && ['Map', 'Set'].includes(decl.init.callee?.name)) {
                moduleCollections.add(decl.id.name);
              } else if (decl.init.type === 'ArrayExpression') {
                moduleCollections.add(decl.id.name);
              }
            }
          }
        }
      }
    }
  });

  traverse(ast, {
    // RULE 1: N+1 DB Queries Inside Loops
    ForOfStatement(astPath) {
      checkLoopForQueries(astPath, 'for-of', filename, lines, findings);
    },
    ForStatement(astPath) {
      checkLoopForQueries(astPath, 'for', filename, lines, findings);
    },
    CallExpression(astPath) {
      const node = astPath.node;
      const callee = node.callee;
      const funcName = getEnclosingFunctionName(astPath);

      // Check map/forEach loops with async await
      if (callee.type === 'MemberExpression' && ['map', 'forEach'].includes(callee.property?.name)) {
        const arg = node.arguments[0];
        if (arg && (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression') && arg.async) {
          astPath.traverse({
            AwaitExpression(awaitPath) {
              const awaitNode = awaitPath.node.argument;
              if (isDbOrSimulatedQuery(awaitNode)) {
                const line = awaitPath.node.loc?.start.line || node.loc?.start.line || 1;
                findings.push(normalizeFinding({
                  tool: 'semgrep',
                  ruleId: 'n-plus-one-query',
                  category: 'performance',
                  severity: 5,
                  file: filename,
                  line,
                  endLine: line,
                  functionName: funcName,
                  message: `N+1 query detected: DB query executed inside ${callee.property.name}() iterator. Batch with $in or Promise.all.`,
                  snippet: getSnippet(line, line + 2)
                }));
              }
            }
          });
        }
      }

      // RULE 2: Synchronous Calls in Handlers (pbkdf2Sync, hashSync, readFileSync, execSync)
      if (callee.type === 'MemberExpression') {
        const objName = callee.object?.name;
        const propName = callee.property?.name;

        const isSyncCrypto = objName === 'crypto' && ['pbkdf2Sync', 'randomBytesSync'].includes(propName);
        const isSyncBcrypt = (objName === 'bcrypt' || objName === 'bcryptjs') && ['hashSync', 'compareSync'].includes(propName);
        const isSyncFs = (objName === 'fs' || objName === 'promises') && ['readFileSync', 'writeFileSync', 'readdirSync'].includes(propName);
        const isSyncChildProcess = (objName === 'child_process' || objName === 'cp') && ['execSync', 'spawnSync'].includes(propName);

        if (isSyncCrypto || isSyncBcrypt || isSyncFs || isSyncChildProcess) {
          const line = node.loc ? node.loc.start.line : 1;
          findings.push(normalizeFinding({
            tool: 'semgrep',
            ruleId: 'sync-calls-in-handlers',
            category: 'performance',
            severity: 5,
            file: filename,
            line,
            endLine: line,
            functionName: funcName,
            message: `Synchronous call '${objName}.${propName}' in request handler blocks the Node.js event loop. Use async non-blocking counterpart.`,
            snippet: getSnippet(line, line + 1)
          }));
        }

        // RULE 4: Unbounded Cache Mutation inside functions
        if (moduleCollections.has(objName) && ['set', 'push', 'add'].includes(propName)) {
          const line = node.loc ? node.loc.start.line : 1;
          findings.push(normalizeFinding({
            tool: 'semgrep',
            ruleId: 'unbounded-cache',
            category: 'reliability',
            severity: 4,
            file: filename,
            line,
            endLine: line,
            functionName: funcName,
            message: `Unbounded cache growth: Module-level collection '${objName}' mutated with '${propName}()' inside function without eviction policy or size limit.`,
            snippet: getSnippet(line, line + 2)
          }));
        }

        // RULE 5: Missing Pagination (res.json without limit or returning full mock collection)
        if (objName === 'res' && propName === 'json' && funcName && funcName.toLowerCase().includes('user')) {
          const arg = node.arguments[0];
          if (arg && arg.type === 'ObjectExpression') {
            for (const prop of arg.properties) {
              if (prop.key?.name === 'users' && prop.value?.type === 'Identifier') {
                const line = node.loc ? node.loc.start.line : 1;
                findings.push(normalizeFinding({
                  tool: 'semgrep',
                  ruleId: 'missing-pagination',
                  category: 'architecture',
                  severity: 3,
                  file: filename,
                  line,
                  endLine: line,
                  functionName: funcName,
                  message: `Missing pagination: Endpoint '${funcName}' serializes full '${prop.value.name}' collection without pagination limits (limit/skip).`,
                  snippet: getSnippet(line, line + 2)
                }));
              }
            }
          }
        }

        // RULE 7: Missing Timeouts on Outbound Calls (axios/fetch)
        if ((objName === 'axios' && ['get', 'post', 'put', 'delete'].includes(propName)) || callee.name === 'fetch') {
          const configArg = propName === 'get' ? node.arguments[1] : node.arguments[2];
          let hasTimeout = false;
          if (configArg && configArg.type === 'ObjectExpression') {
            hasTimeout = configArg.properties.some(p => p.key?.name === 'timeout');
          }

          if (!hasTimeout) {
            const line = node.loc ? node.loc.start.line : 1;
            findings.push(normalizeFinding({
              tool: 'semgrep',
              ruleId: 'missing-timeouts',
              category: 'reliability',
              severity: 3,
              file: filename,
              line,
              endLine: line,
              functionName: funcName,
              message: `Missing timeout on outbound HTTP request (${objName || callee.name}). Outbound calls must enforce explicit timeout to avoid connection pool exhaustion.`,
              snippet: getSnippet(line, line + 1)
            }));
          }
        }

        // RULE 8: Hardcoded Secrets
        if (objName === 'jwt' && propName === 'sign') {
          const secretArg = node.arguments[1];
          if (secretArg && secretArg.type === 'StringLiteral') {
            const line = node.loc ? node.loc.start.line : 1;
            findings.push(normalizeFinding({
              tool: 'semgrep',
              ruleId: 'hardcoded-secrets',
              category: 'security',
              severity: 5,
              file: filename,
              line,
              endLine: line,
              functionName: funcName,
              message: `Hardcoded JWT signing secret literal in source code. Secrets must be read from environment variables.`,
              snippet: getSnippet(line, line + 1)
            }));
          }
        }
      }

      // RULE 9: Dangerous eval / new Function
      if (callee.name === 'eval' || (callee.name === 'Function' && astPath.parent?.type === 'NewExpression')) {
        const line = node.loc ? node.loc.start.line : 1;
        findings.push(normalizeFinding({
          tool: 'semgrep',
          ruleId: 'dangerous-eval',
          category: 'security',
          severity: 5,
          file: filename,
          line,
          endLine: line,
          functionName: funcName,
          message: `Arbitrary code execution risk: Avoid '${callee.name || 'eval'}()' to prevent remote code injection vulnerabilities.`,
          snippet: getSnippet(line, line + 1)
        }));
      }

      // RULE 3: Unhandled Promise Rejection / Missing Await on async DB calls
      if (callee.type === 'MemberExpression' && callee.property?.name === 'then' && astPath.parent?.type === 'ExpressionStatement') {
        const line = node.loc ? node.loc.start.line : 1;
        findings.push(normalizeFinding({
          tool: 'semgrep',
          ruleId: 'unhandled-promise-rejection',
          category: 'reliability',
          severity: 4,
          file: filename,
          line,
          endLine: line,
          functionName: funcName,
          message: `Promise chain with .then() called without await or .catch() in request handler. Asynchronous errors will cause unhandled rejections.`,
          snippet: getSnippet(line, line + 3)
        }));
      }
    },

    // RULE 6: Unindexed Filter Scan with Regex
    NewExpression(astPath) {
      const node = astPath.node;
      if (node.callee?.name === 'RegExp') {
        const funcName = getEnclosingFunctionName(astPath);
        const line = node.loc ? node.loc.start.line : 1;
        findings.push(normalizeFinding({
          tool: 'semgrep',
          ruleId: 'unindexed-filter',
          category: 'performance',
          severity: 4,
          file: filename,
          line,
          endLine: line,
          functionName: funcName,
          message: `Dynamic RegExp filtering on collection in '${funcName}'. Unindexed scans cause high CPU load under concurrency.`,
          snippet: getSnippet(line, line + 2)
        }));
      }
    }
  });

  return findings;
}

function checkLoopForQueries(astPath, loopType, filename, lines, findings) {
  const funcName = getEnclosingFunctionName(astPath);
  astPath.traverse({
    AwaitExpression(awaitPath) {
      const arg = awaitPath.node.argument;
      if (isDbOrSimulatedQuery(arg)) {
        const line = awaitPath.node.loc?.start.line || astPath.node.loc?.start.line || 1;
        findings.push(normalizeFinding({
          tool: 'semgrep',
          ruleId: 'n-plus-one-query',
          category: 'performance',
          severity: 5,
          file: filename,
          line,
          endLine: line,
          functionName: funcName,
          message: `N+1 query anti-pattern: Asynchronous DB query inside '${loopType}' loop. Batch queries into a single multi-key lookup.`,
          snippet: lines.slice(Math.max(0, line - 2), Math.min(lines.length, line + 2)).join('\n')
        }));
      }
    }
  });
}

function isDbOrSimulatedQuery(node) {
  if (!node) return false;
  if (node.type === 'CallExpression') {
    const callee = node.callee;
    if (callee.name && (callee.name.includes('simulateDb') || callee.name.includes('Query') || callee.name.includes('fetch'))) {
      return true;
    }
    if (callee.type === 'MemberExpression') {
      const prop = callee.property?.name;
      if (['find', 'findOne', 'findById', 'query', 'select', 'insertOne', 'save', 'update', 'delete'].includes(prop)) {
        return true;
      }
    }
  }
  return false;
}

function getEnclosingFunctionName(astPath) {
  let curr = astPath;
  while (curr) {
    if (curr.node.type === 'FunctionDeclaration' && curr.node.id) {
      return curr.node.id.name;
    }
    if ((curr.node.type === 'FunctionExpression' || curr.node.type === 'ArrowFunctionExpression') && curr.parent?.id) {
      return curr.parent.id.name;
    }
    curr = curr.parentPath;
  }
  return 'anonymous';
}

/**
 * Run Npm Audit Analysis
 */
function analyzeNpmAudit(projectDir) {
  const findings = [];
  const pkgLockPath = path.join(projectDir, 'package-lock.json');
  const pkgPath = path.join(projectDir, 'package.json');

  if (!fs.existsSync(pkgPath)) return findings;

  try {
    const auditOutput = execSync('npm audit --json', {
      cwd: projectDir,
      timeout: 10000,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8'
    });

    const parsed = JSON.parse(auditOutput);
    if (parsed.vulnerabilities) {
      for (const [pkgName, vuln] of Object.entries(parsed.vulnerabilities)) {
        const severityMap = { info: 1, low: 2, moderate: 3, high: 4, critical: 5 };
        findings.push(normalizeFinding({
          tool: 'npm-audit',
          ruleId: `vuln-${pkgName}`,
          category: 'security',
          severity: severityMap[vuln.severity] || 3,
          file: 'package.json',
          line: 1,
          endLine: 1,
          functionName: 'dependencies',
          message: `Vulnerable dependency '${pkgName}': ${vuln.title || vuln.severity} vulnerability detected via npm audit.`,
          snippet: `"${pkgName}": "${vuln.range || '*'}"`
        }));
      }
    }
  } catch (err) {
    // If npm audit returns non-zero code due to found vulnerabilities, parse stdout if available
    if (err.stdout) {
      try {
        const parsed = JSON.parse(err.stdout.toString());
        if (parsed.vulnerabilities) {
          for (const [pkgName, vuln] of Object.entries(parsed.vulnerabilities)) {
            const severityMap = { info: 1, low: 2, moderate: 3, high: 4, critical: 5 };
            findings.push(normalizeFinding({
              tool: 'npm-audit',
              ruleId: `vuln-${pkgName}`,
              category: 'security',
              severity: severityMap[vuln.severity] || 3,
              file: 'package.json',
              line: 1,
              endLine: 1,
              functionName: 'dependencies',
              message: `Vulnerable dependency '${pkgName}': ${vuln.title || vuln.severity} vulnerability detected.`,
              snippet: `"${pkgName}": "${vuln.range || '*'}"`
            }));
          }
        }
      } catch (e) {}
    }
  }

  return findings;
}

/**
 * Scan Project Directory Recursively for JS files and execute static analysis passes
 */
async function runStaticAnalysis(projectDir, options = {}) {
  const allFindings = [];
  const jsFiles = [];

  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.') || entry.name === 'test' || entry.name === 'tests') {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
        jsFiles.push(fullPath);
      }
    }
  }

  walkDir(projectDir);

  for (const filePath of jsFiles) {
    try {
      const code = fs.readFileSync(filePath, 'utf8');
      const ast = parser.parse(code, {
        sourceType: 'unambiguous',
        plugins: ['jsx', 'asyncGenerators', 'dynamicImport', 'classProperties']
      });

      const relPath = path.relative(projectDir, filePath);

      // 1. AST Custom Rules (Semgrep equivalent)
      const ruleFindings = analyzeAstRules(ast, code, relPath);
      allFindings.push(...ruleFindings);

      // 2. Cyclomatic Complexity Pass (> 10)
      const complexityFindings = analyzeComplexity(ast, code, relPath);
      allFindings.push(...complexityFindings);
    } catch (parseErr) {
      console.warn(`[StaticAnalysis] Parse warning for ${filePath}: ${parseErr.message}`);
    }
  }

  // 3. npm audit pass
  const auditFindings = analyzeNpmAudit(projectDir);
  allFindings.push(...auditFindings);

  // Deduplicate findings by ruleId + file + line
  const uniqueMap = new Map();
  for (const finding of allFindings) {
    const key = `${finding.ruleId}:${finding.file}:${finding.line}:${finding.functionName}`;
    if (!uniqueMap.has(key) || uniqueMap.get(key).severity < finding.severity) {
      uniqueMap.set(key, finding);
    }
  }

  return Array.from(uniqueMap.values());
}

module.exports = {
  runStaticAnalysis,
  normalizeFinding,
  analyzeComplexity,
  analyzeAstRules,
  analyzeNpmAudit
};
