import React from 'react';
import { Layers, ChevronRight, Activity, Calendar } from 'lucide-react';

export default function ProjectList({ projects, selectedProjectId, onSelectProject }) {
  if (!projects || projects.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Evaluated Projects History</span>
        </h3>
        <span className="text-xs text-slate-400">{projects.length} Total</span>
      </div>

      <div className="space-y-2">
        {projects.map((proj) => {
          const isSelected = proj._id === selectedProjectId;
          const baselineRun = proj.baselineRunId;
          const p95 = baselineRun?.metrics?.p95;

          return (
            <div
              key={proj._id}
              onClick={() => onSelectProject(proj)}
              className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                isSelected
                  ? 'bg-cyan-950/40 border-cyan-700 text-white'
                  : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40 text-slate-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={`w-2 h-2 rounded-full ${
                  proj.status === 'ready' ? 'bg-emerald-400' : proj.status === 'failed' ? 'bg-red-400' : 'bg-cyan-400 animate-pulse'
                }`} />
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">{proj.name}</h4>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                    <span>{proj.detectedRoutes ? proj.detectedRoutes.length : 0} routes</span>
                    <span>•</span>
                    <span>{new Date(proj.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {p95 !== undefined && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Baseline p95</span>
                    <span className="text-xs font-bold font-mono text-cyan-400">{p95}ms</span>
                  </div>
                )}
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
