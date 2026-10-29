/**
 * EVOLVE Sandbox Telemetry Hook
 * Injected automatically via `node -r /sandbox/telemetry.js`
 * Samples Node.js Event Loop Lag and memory pressure without modifying application source code.
 */
const { monitorEventLoopDelay } = require('perf_hooks');
const http = require('http');

let histogram = null;
try {
  histogram = monitorEventLoopDelay({ resolution: 20 });
  histogram.enable();
} catch (e) {
  // Fallback if not supported
}

// Keep a sliding window of event-loop lag metrics
const telemetryState = {
  startedAt: Date.now(),
  lastCheck: Date.now(),
  lagSamples: []
};

// Periodic sampling
setInterval(() => {
  if (histogram) {
    const p50 = (histogram.percentile(50) / 1e6).toFixed(2);
    const p95 = (histogram.percentile(95) / 1e6).toFixed(2);
    const p99 = (histogram.percentile(99) / 1e6).toFixed(2);
    const max = (histogram.max / 1e6).toFixed(2);
    const mem = process.memoryUsage();

    telemetryState.lagSamples.push({
      time: Date.now(),
      p50: parseFloat(p50),
      p95: parseFloat(p95),
      p99: parseFloat(p99),
      heapUsedMb: parseFloat((mem.heapUsed / 1024 / 1024).toFixed(2))
    });

    if (telemetryState.lagSamples.length > 300) {
      telemetryState.lagSamples.shift();
    }
    histogram.reset();
  }
}, 500).unref();

// Intercept HTTP server creation to augment or attach an internal metrics endpoint
const originalCreateServer = http.createServer;
http.createServer = function(...args) {
  const server = originalCreateServer.apply(this, args);
  
  // Attach an event loop lag metric reporter if queried on /_evolve_telemetry
  const originalListeners = server.listeners('request').slice(0);
  server.removeAllListeners('request');

  server.on('request', (req, res) => {
    if (req.url === '/_evolve_telemetry') {
      const mem = process.memoryUsage();
      const latestSample = telemetryState.lagSamples[telemetryState.lagSamples.length - 1] || {
        p50: 0, p95: 0, p99: 0
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        uptime: process.uptime(),
        memory: {
          rssMb: (mem.rss / 1024 / 1024).toFixed(2),
          heapUsedMb: (mem.heapUsed / 1024 / 1024).toFixed(2),
          heapTotalMb: (mem.heapTotal / 1024 / 1024).toFixed(2)
        },
        eventLoopLagMs: latestSample,
        samplesCount: telemetryState.lagSamples.length
      }));
      return;
    }

    // Call user handlers
    for (const listener of originalListeners) {
      listener.call(server, req, res);
    }
  });

  return server;
};
