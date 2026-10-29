/**
 * Reflection and Lesson Extraction Engine
 * Generates concise, reusable 1-2 sentence engineering takeaways from experiment results.
 */

function reflect(experiment) {
  if (!experiment) return 'No experiment record available for reflection.';

  const strategy = experiment.strategy || 'unknown';
  const hotspot = experiment.hotspot || {};
  const funcName = hotspot.function || 'target function';
  const category = hotspot.category || 'performance';
  const verdict = experiment.verdict || 'unknown';
  const failureReason = experiment.failureReason || {};
  const comparison = experiment.comparison || {};
  const p95Delta = comparison.p95DeltaPct !== undefined ? comparison.p95DeltaPct : 0;
  const memDelta = comparison.memDeltaPct !== undefined ? comparison.memDeltaPct : 0;
  const errorDelta = comparison.errorDelta !== undefined ? comparison.errorDelta : 0;

  if (verdict === 'accepted') {
    const latRed = Math.abs(p95Delta);
    return `Applying ${strategy} strategy to ${funcName} successfully reduced p95 latency by ${latRed}% with stable error rates and memory usage.`;
  }

  if (verdict === 'rejected') {
    if (failureReason.code === 'tests_failed') {
      return `Patch using ${strategy} on ${funcName} failed functional test suite; ensure parameter validation and edge cases are preserved.`;
    }
    if (failureReason.code === 'regression') {
      if (memDelta > 20) {
        return `Applying ${strategy} to ${funcName} caused a +${memDelta}% memory regression; unbounded allocations or caching without eviction must be avoided.`;
      }
      if (errorDelta > 0.01) {
        return `Applying ${strategy} to ${funcName} triggered an error rate regression (+${(errorDelta * 100).toFixed(1)}%); verify concurrency limits and connection pools.`;
      }
      return `Strategy ${strategy} on ${funcName} caused metric regression: ${failureReason.summary}.`;
    }
    if (failureReason.code === 'no_improvement') {
      return `Strategy ${strategy} on ${funcName} yielded no measurable latency improvement; hotspot bottleneck may be bound by external I/O rather than CPU.`;
    }
    return `Optimization attempt on ${funcName} rejected: ${failureReason.summary || 'criteria not met'}.`;
  }

  if (verdict === 'inconclusive') {
    return `Strategy ${strategy} on ${funcName} showed marginal latency change (${p95Delta}%) within run-to-run noise (p=${comparison.mannWhitneyP || 1.0}); more samples or higher load required.`;
  }

  if (verdict === 'rejected_by_critic') {
    return `Proposed ${strategy} diff on ${funcName} was rejected by pre-benchmark critic for semantic safety risk: ${failureReason.summary || 'unsafe diff'}.`;
  }

  return `Experiment on ${funcName} using ${strategy} concluded with status ${verdict}.`;
}

module.exports = {
  reflect
};
