import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend
} from 'recharts';

export default function MetricsCharts({ metrics }) {
  if (!metrics) return null;

  // Prepare latency bar chart data
  const latencyBarData = [
    { name: 'p50 (Median)', value: metrics.p50 || 0, fill: '#06b6d4' },
    { name: 'Mean Latency', value: metrics.mean || 0, fill: '#3b82f6' },
    { name: 'p95 Latency', value: metrics.p95 || 0, fill: '#f59e0b' },
    { name: 'p99 Tail Latency', value: metrics.p99 || 0, fill: '#ef4444' }
  ];

  // Prepare latency sample timeline data
  const sampleTimelineData = (metrics.latencySamples && metrics.latencySamples.length > 0)
    ? metrics.latencySamples.map((sample, idx) => ({
        point: idx + 1,
        latencyMs: Math.round(sample.latency),
        cpuPercent: Math.round(sample.cpu),
        memMb: Math.round(sample.memory)
      }))
    : [
        { point: 1, latencyMs: metrics.p50, cpuPercent: 35, memMb: 80 },
        { point: 2, latencyMs: metrics.mean, cpuPercent: 45, memMb: 88 },
        { point: 3, latencyMs: metrics.p95, cpuPercent: 65, memMb: 95 },
        { point: 4, latencyMs: metrics.p99, cpuPercent: 78, memMb: 110 }
      ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs font-mono">
          <p className="font-semibold text-slate-200">{label}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} style={{ color: entry.color || entry.fill }}>
              {entry.name}: {entry.value} {entry.unit || 'ms'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Latency Percentiles Comparison */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-200">Latency Percentile Distribution (ms)</h3>
          <span className="text-xs text-slate-400 font-mono">Lower is better</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={latencyBarData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit="ms" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Latency" unit="ms" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Latency & Resource Utilization Trend */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-200">Load Test Telemetry Timeline</h3>
          <span className="text-xs text-slate-400 font-mono">Sampling Window</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sampleTimelineData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="point" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="latencyMs" name="Latency (ms)" stroke="#06b6d4" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cpuPercent" name="CPU Usage (%)" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="memMb" name="Memory (MB)" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
