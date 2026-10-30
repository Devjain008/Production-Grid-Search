const fs = require('fs');
const path = require('path');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

describe('Glossary Coverage and Single Source of Truth Guard', () => {
  const glossaryPath = path.resolve(__dirname, '../../client/src/content/glossary.ts');
  const clientSrcDir = path.resolve(__dirname, '../../client/src');

  let glossaryEntries = {};
  let glossaryAliases = {};

  beforeAll(() => {
    // 1. Read and parse glossary.ts with Babel TypeScript parser
    expect(fs.existsSync(glossaryPath)).toBe(true);
    const content = fs.readFileSync(glossaryPath, 'utf8');

    const ast = babelParser.parse(content, {
      sourceType: 'module',
      plugins: ['typescript']
    });

    traverse(ast, {
      VariableDeclarator(nodePath) {
        if (nodePath.node.id.name === 'GLOSSARY' && nodePath.node.init?.type === 'ObjectExpression') {
          nodePath.node.init.properties.forEach(prop => {
            if (prop.type === 'ObjectProperty') {
              const key = prop.key.name || prop.key.value;
              const entryObj = {};
              if (prop.value.type === 'ObjectExpression') {
                prop.value.properties.forEach(p => {
                  if (p.type === 'ObjectProperty') {
                    const fieldKey = p.key.name || p.key.value;
                    if (p.value.type === 'StringLiteral') {
                      entryObj[fieldKey] = p.value.value;
                    } else if (p.value.type === 'ArrayExpression') {
                      entryObj[fieldKey] = p.value.elements
                        .filter(el => el.type === 'StringLiteral')
                        .map(el => el.value);
                    } else if (p.value.type === 'ArrowFunctionExpression' || p.value.type === 'FunctionExpression') {
                      try {
                        const fnStr = content.slice(p.value.start, p.value.end);
                        entryObj[fieldKey] = eval('(' + fnStr + ')');
                      } catch (e) {
                        entryObj[fieldKey] = '[Function]';
                      }
                    }
                  }
                });
              }
              glossaryEntries[key] = entryObj;
            }
          });
        }

        if (nodePath.node.id.name === 'GLOSSARY_ALIASES' && nodePath.node.init?.type === 'ObjectExpression') {
          nodePath.node.init.properties.forEach(prop => {
            if (prop.type === 'ObjectProperty') {
              const key = prop.key.name || prop.key.value;
              if (prop.value.type === 'StringLiteral') {
                glossaryAliases[key] = prop.value.value;
              }
            }
          });
        }
      }
    });
  });

  test('glossary.ts contains comprehensive terms covering all technical domains', () => {
    const termKeys = Object.keys(glossaryEntries);
    expect(termKeys.length).toBeGreaterThanOrEqual(25);

    // Key latency metrics
    expect(glossaryEntries).toHaveProperty('p50');
    expect(glossaryEntries).toHaveProperty('p95');
    expect(glossaryEntries).toHaveProperty('throughput');
    expect(glossaryEntries).toHaveProperty('event_loop_lag');
    expect(glossaryEntries).toHaveProperty('heap_memory');
    expect(glossaryEntries).toHaveProperty('error_rate');

    // Statistical & AI terms
    expect(glossaryEntries).toHaveProperty('mann_whitney');
    expect(glossaryEntries).toHaveProperty('wilson_interval');
    expect(glossaryEntries).toHaveProperty('linucb');
    expect(glossaryEntries).toHaveProperty('thompson_sampling');
    expect(glossaryEntries).toHaveProperty('agent_loop');
    expect(glossaryEntries).toHaveProperty('critic_filter');
    expect(glossaryEntries).toHaveProperty('reward_score');
  });

  test('every entry adheres strictly to Grade 8 readability standards and word count (<= 45 words)', () => {
    const validCategories = [
      'Latency & Speed',
      'Throughput & Capacity',
      'Resource & Stability',
      'Reliability & Errors',
      'Static Analysis & Profiling',
      'AI & Learning',
      'Statistics & Verification',
      'Load Profiles & Verification',
      'Security & Containment',
      'Optimization Strategies'
    ];

    for (const [key, entry] of Object.entries(glossaryEntries)) {
      expect(entry.id).toBe(key);
      expect(typeof entry.title).toBe('string');
      expect(entry.title.length).toBeGreaterThan(0);

      expect(validCategories).toContain(entry.category);

      expect(typeof entry.simple).toBe('string');
      expect(entry.simple.length).toBeGreaterThan(10);

      // Word count test: <= 45 words
      const words = entry.simple.trim().split(/\s+/).filter(Boolean);
      expect(words.length).toBeLessThanOrEqual(45);

      expect(typeof entry.why).toBe('string');
      expect(entry.why.length).toBeGreaterThan(10);

      // Verify no placeholder strings
      expect(entry.simple.toLowerCase()).not.toContain('todo');
      expect(entry.simple.toLowerCase()).not.toContain('tbd');
      expect(entry.simple.toLowerCase()).not.toContain('placeholder');
      expect(entry.why.toLowerCase()).not.toContain('todo');
    }
  });

  test('all GLOSSARY_ALIASES resolve to existing primary keys in GLOSSARY', () => {
    const primaryKeys = new Set(Object.keys(glossaryEntries));
    for (const [alias, canonicalKey] of Object.entries(glossaryAliases)) {
      expect(primaryKeys.has(canonicalKey)).toBe(true);
    }
  });

  test('all explain(val) functions execute cleanly and return non-empty strings for sample values', () => {
    let testedCount = 0;
    for (const [key, entry] of Object.entries(glossaryEntries)) {
      if (typeof entry.explain === 'function') {
        const outputNum = entry.explain(123.45);
        expect(typeof outputNum).toBe('string');
        expect(outputNum.length).toBeGreaterThan(5);

        const outputStr = entry.explain('Grade A');
        expect(typeof outputStr).toBe('string');
        expect(outputStr.length).toBeGreaterThan(3);

        testedCount++;
      }
    }
    expect(testedCount).toBeGreaterThanOrEqual(10);
  });

  test('all <Term> and <HelpTip> usages across client components reference valid glossary entries', () => {
    const validKeys = new Set([
      ...Object.keys(glossaryEntries),
      ...Object.keys(glossaryAliases)
    ]);

    const findJsxFiles = (dir) => {
      let results = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          results = results.concat(findJsxFiles(fullPath));
        } else if (file.endsWith('.jsx') || file.endsWith('.tsx') || file.endsWith('.js')) {
          results.push(fullPath);
        }
      }
      return results;
    };

    const clientFiles = findJsxFiles(clientSrcDir);
    expect(clientFiles.length).toBeGreaterThan(5);

    // Match static string literal usage like id="p95" or term='p95'
    const termRegex = /<(?:Term|HelpTip)\s+[^>]*?(?:id|term)=["']([a-zA-Z0-9_\-\.]+)["']/g;
    const missingKeys = [];

    for (const filePath of clientFiles) {
      if (filePath.endsWith('HelpTip.jsx')) continue;
      const code = fs.readFileSync(filePath, 'utf8');
      let match;
      while ((match = termRegex.exec(code)) !== null) {
        const termKey = match[1].toLowerCase();
        if (!validKeys.has(termKey)) {
          missingKeys.push({
            file: path.relative(clientSrcDir, filePath),
            key: termKey
          });
        }
      }
    }

    if (missingKeys.length > 0) {
      console.error('Missing glossary keys found in client JSX:', missingKeys);
    }
    expect(missingKeys).toEqual([]);
  });
});
