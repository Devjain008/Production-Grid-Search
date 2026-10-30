/**
 * Compatibility adapter re-exporting from single source of truth: src/content/glossary.ts
 */
import { GLOSSARY as RAW_GLOSSARY, GLOSSARY_ALIASES, getGlossaryEntry } from '../content/glossary';

// Create backward-compatible dictionary providing both new and legacy property keys
export const GLOSSARY = new Proxy(RAW_GLOSSARY, {
  get(target, prop) {
    if (typeof prop !== 'string') return target[prop];
    const entry = getGlossaryEntry(prop);
    if (!entry) return undefined;
    return {
      ...entry,
      term: entry.title,
      definition: entry.simple,
      impact: entry.why,
      target: entry.goodHint,
      analogy: entry.simple
    };
  }
});

export { GLOSSARY_ALIASES, getGlossaryEntry };
