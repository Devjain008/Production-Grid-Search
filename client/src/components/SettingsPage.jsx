import React, { useState } from 'react';
import { Settings, Shield, Download, Trash2, Key, Database, AlertOctagon } from 'lucide-react';

export default function SettingsPage({ project, onProjectDeleted }) {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [message, setMessage] = useState('');

  const handleExportData = async () => {
    setExporting(true);
    setMessage('');
    try {
      const res = await fetch('/api/user/export');
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `evolve-user-data-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setMessage('Successfully exported all user and project data (GDPR compliant).');
      }
    } catch (err) {
      setMessage(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project?._id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project._id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage('Project, runs, experiments, and artifacts deleted successfully.');
        setDeleteConfirm(false);
        if (onProjectDeleted) onProjectDeleted(project._id);
      } else {
        const err = await res.json();
        setMessage(`Delete failed: ${err.message}`);
      }
    } catch (err) {
      setMessage(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-400" />
          System Settings &amp; Data Governance
        </h2>
        <p className="text-xs text-slate-400 mt-1">Manage sandbox limits, authentication tokens, and GDPR data export/deletion cascades.</p>
      </div>

      {message && (
        <div className="bg-sky-950/40 border border-sky-500/40 p-4 rounded-xl text-xs text-sky-300">
          {message}
        </div>
      )}

      {/* Sandbox Guarantees */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          Active Sandbox Security Boundary
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">CPU &amp; Memory Isolation</span>
            <div className="text-white font-mono">1.0 NanoCPU Core &bull; 512MB RAM Hard Cap</div>
            <p className="text-[11px] text-slate-500">cgroups v2 enforce deterministic execution bounds</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Network Egress Policy</span>
            <div className="text-emerald-400 font-mono font-bold">ZERO OUTBOUND NETWORK</div>
            <p className="text-[11px] text-slate-500">Host network namespace isolated; DNS &amp; sockets blocked</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Anti-Fork Bomb Limit</span>
            <div className="text-white font-mono">100 PIDs Maximum</div>
            <p className="text-[11px] text-slate-500">Kernel prevents runaway process spawning</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Execution Privilege</span>
            <div className="text-white font-mono">Non-Root UID 1001</div>
            <p className="text-[11px] text-slate-500">Root filesystem mounted Read-Only</p>
          </div>
        </div>
      </div>

      {/* Data Lifecycle & GDPR Export */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Database className="w-4 h-4 text-sky-400" />
          Data Lifecycle &amp; Export
        </h3>
        <p className="text-xs text-slate-400">
          Download a complete portable JSON archive containing all projects, runs, raw metrics, experiments, lessons, and reports.
        </p>

        <button
          onClick={handleExportData}
          disabled={exporting}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 border border-slate-700"
        >
          <Download className="w-4 h-4 text-sky-400" />
          <span>{exporting ? 'Compiling Export Archive...' : 'Export All My Data (JSON)'}</span>
        </button>
      </div>

      {/* Danger Zone: Project Deletion */}
      {project && (
        <div className="bg-rose-950/20 border border-rose-900/40 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-500" />
            Danger Zone: Delete Active Project
          </h3>
          <p className="text-xs text-slate-400">
            Permanently delete <strong className="text-white">"{project.name}"</strong>, including all baseline runs, ranked defect reports, candidate patch experiments, vector embeddings, and report artifacts. This action cannot be undone.
          </p>

          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Project Cascading</span>
            </button>
          ) : (
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDeleteProject}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/20 transition"
              >
                {deleting ? 'Deleting...' : 'Confirm Permanent Deletion'}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
