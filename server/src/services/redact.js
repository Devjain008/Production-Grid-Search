/**
 * EVOLVE Secrets Redaction Service
 * Automatically scrubs credentials, keys, tokens, and passwords from logs, reports, and diffs.
 */

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9T3BlbkFJ]{20,}/g, // OpenAI keys
  /AIza[0-9A-Za-z\-_]{35}/g,       // Google / Gemini API keys
  /AKIA[0-9A-Z]{16}/g,             // AWS Access Key ID
  /ghp_[a-zA-Z0-9]{36}/g,          // GitHub Personal Access Token
  /ey[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/g, // JWTs
  /mongodb(\+srv)?:\/\/[^:]+:([^@]+)@/g, // Mongo credentials
  /postgres:\/\/[^:]+:([^@]+)@/g,        // Postgres credentials
  /Bearer\s+[A-Za-z0-9\-_.]+/gi          // Authorization Bearer headers
];

function redactString(text) {
  if (!text || typeof text !== 'string') return text;
  let clean = text;

  // Mask known credential patterns
  clean = clean.replace(/sk-[a-zA-Z0-9T3BlbkFJ]{20,}/g, 'sk-***REDACTED***');
  clean = clean.replace(/AIza[0-9A-Za-z\-_]{35}/g, 'AIza***REDACTED***');
  clean = clean.replace(/AKIA[0-9A-Z]{16}/g, 'AKIA***REDACTED***');
  clean = clean.replace(/ghp_[a-zA-Z0-9]{36}/g, 'ghp_***REDACTED***');
  clean = clean.replace(/ey[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/g, 'eyJ***.***.***');
  clean = clean.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/g, 'mongodb$1://$2:***REDACTED***@');
  clean = clean.replace(/postgres:\/\/([^:]+):([^@]+)@/g, 'postgres://$1:***REDACTED***@');
  clean = clean.replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, 'Bearer ***REDACTED***');

  return clean;
}

function redactObject(obj) {
  if (!obj || typeof obj !== 'object') {
    return typeof obj === 'string' ? redactString(obj) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item));
  }

  const result = {};
  const sensitiveKeys = ['password', 'secret', 'apikey', 'token', 'auth', 'privatekey', 'pass'];

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      result[key] = '***REDACTED***';
    } else if (typeof value === 'string') {
      result[key] = redactString(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactObject(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

module.exports = {
  redactString,
  redactObject
};
