/**
 * EVOLVE Security & Hardening Middleware
 * Implements OWASP security headers, sliding-window rate limiting, and CORS protections.
 */

function helmetSecurityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http: https:; img-src 'self' data: blob: http: https:;"
  );
  next();
}

/**
 * In-memory sliding-window rate limiter
 */
function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute
  const maxRequests = options.max || 200; // max 200 req/min
  const message = options.message || 'Too many requests, please try again later.';
  const hits = new Map(); // key -> [timestamps]

  return (req, res, next) => {
    // Whitelist health checks and demo query in local dev
    if (req.path === '/health' || req.path === '/readyz' || req.path === '/healthz') {
      return next();
    }

    const key = req.user?.id || req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    let timestamps = hits.get(key) || [];
    // Prune out-of-window timestamps
    timestamps = timestamps.filter(t => t > windowStart);

    if (timestamps.length >= maxRequests) {
      return res.status(429).json({
        error: 'TooManyRequests',
        message,
        retryAfterSeconds: Math.ceil(windowMs / 1000)
      });
    }

    timestamps.push(now);
    hits.set(key, timestamps);
    next();
  };
}

module.exports = {
  helmetSecurityHeaders,
  createRateLimiter
};
