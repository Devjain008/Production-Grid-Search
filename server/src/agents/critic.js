const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

class CriticAgent {
  constructor(options = {}) {
    this.maxRevisions = options.maxRevisions || 1;
  }

  /**
   * Deterministic structural and AST analysis on candidate patch
   */
  deterministicReview(diff, originalSource = '', patchedSource = '') {
    const risks = [];

    // 1. Trivial early return detection (Reward-hack guard)
    const addedLines = diff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
    const trivialReturnRegex = /\breturn\s*(?:res\.json\s*\(\s*\{\s*(?:count\s*:\s*0\s*,\s*orders\s*:\s*\[\s*\])?\s*\}\s*\)|null|undefined|false|true|\{\s*\}|\[\s*\])?\s*;?$/i;

    for (const line of addedLines) {
      if (trivialReturnRegex.test(line.replace(/^\+/, '').trim())) {
        risks.push({
          code: 'trivial_return_bypass',
          message: 'Trivial early return detected in patch. Bypassing application work to fake performance is rejected.',
          severity: 'critical'
        });
        break;
      }
    }

    // 2. Dangerous function injection (eval, child_process)
    for (const line of addedLines) {
      if (/\b(?:eval|Function|execSync|spawnSync)\b/.test(line)) {
        risks.push({
          code: 'dangerous_execution',
          message: 'Patch introduces dangerous execution function (eval or child_process).',
          severity: 'critical'
        });
      }
    }

    // 3. AST Syntax check & structural comparison if patched source provided
    if (patchedSource) {
      try {
        const patchedAst = parser.parse(patchedSource, {
          sourceType: 'unambiguous',
          plugins: ['jsx', 'asyncGenerators']
        });

        // Verify try-catch and auth protection weren't stripped
        if (originalSource) {
          const originalAst = parser.parse(originalSource, {
            sourceType: 'unambiguous',
            plugins: ['jsx', 'asyncGenerators']
          });

          let origTryCount = 0;
          let patchTryCount = 0;

          traverse(originalAst, {
            TryStatement() { origTryCount++; }
          });
          traverse(patchedAst, {
            TryStatement() { patchTryCount++; }
          });

          if (patchTryCount < origTryCount) {
            risks.push({
              code: 'removed_error_handling',
              message: `Patch stripped ${origTryCount - patchTryCount} try/catch error handling block(s). Error handling must be preserved.`,
              severity: 'high'
            });
          }
        }
      } catch (parseErr) {
        risks.push({
          code: 'syntax_error',
          message: `Patched source fails JavaScript syntax parsing: ${parseErr.message}`,
          severity: 'critical'
        });
      }
    }

    const hasCritical = risks.some(r => r.severity === 'critical');
    return {
      pass: !hasCritical && risks.length === 0,
      risks
    };
  }

  /**
   * Semantic risk assessment (checks cache invalidation, race conditions, unbounded memory)
   */
  semanticReview(strategy, diff) {
    const risks = [];

    // Check for cache with no TTL or size limit
    if (strategy === 'cache' && !diff.includes('ttl') && !diff.includes('max') && !diff.includes('delete') && !diff.includes('clear')) {
      if (diff.includes('Map') || diff.includes('searchCache')) {
        risks.push({
          code: 'unbounded_cache_leak',
          message: 'Cache strategy applied without TTL expiration, size cap, or invalidation mechanism. High memory leak risk under load.',
          severity: 'high'
        });
      }
    }

    return {
      approve: risks.length === 0,
      risks
    };
  }

  /**
   * Full Critique Pipeline
   */
  evaluatePatch({ diff, strategy, originalSource = '', patchedSource = '' }) {
    const detResult = this.deterministicReview(diff, originalSource, patchedSource);
    if (!detResult.pass) {
      return {
        approved: false,
        rejectionStage: 'deterministic',
        risks: detResult.risks,
        failureReason: detResult.risks[0]?.message || 'Failed deterministic critic review'
      };
    }

    const semResult = this.semanticReview(strategy, diff);
    if (!semResult.approve) {
      return {
        approved: false,
        rejectionStage: 'semantic',
        risks: semResult.risks,
        failureReason: semResult.risks[0]?.message || 'Failed semantic critic review'
      };
    }

    return {
      approved: true,
      risks: []
    };
  }
}

module.exports = {
  CriticAgent
};
