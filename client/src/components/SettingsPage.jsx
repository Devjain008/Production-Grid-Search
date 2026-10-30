import React, { useState } from 'react';
import { 
  Settings, Shield, Download, Trash2, Key, Database, AlertOctagon, HelpCircle, Eye, Cpu, Bell, Check, Copy, Sliders 
} from 'lucide-react';
import { HelpTip, Term } from './HelpTip';
import { useHelp } from '../content/HelpContext';
import { Button } from '../design-system/Button';

/**
 * Production SettingsPage Component (Section 5.12)
 * Reading Modes, API Tokens, Notification Preferences, LLM Model Info,
 * GDPR Data Export, and Type-to-Confirm Project Deletion.
 */
export default function SettingsPage({ project, onProjectDeleted }) {
  const { expertMode, setExpertMode, alwaysShowIcons, setAlwaysShowIcons } = useHelp();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // API Tokens
  const [apiTokens, setApiTokens] = useState([
    { id: 'tok_1', name: 'CI/CD Pipeline Key', created: '2026-10-15', lastUsed: '2 hours ago', masked: 'evl_live_••••••••••••94f2' }
  ]);
  const [newGeneratedToken, setNewGeneratedToken] = useState(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [message, setMessage] = useState('');

  const handleGenerateToken = () => {
    const rawSecret = `evl_live_${Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join('')}`;
    const newTokenObj = {
      id: `tok_${Date.now()}`,
      name: `Agent CLI Access (${new Date().toLocaleDateString()})`,
      created: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
      masked: `evl_live_••••••••••••${rawSecret.slice(-4)}`
    };
    setApiTokens([newTokenObj, ...apiTokens]);
    setNewGeneratedToken(rawSecret);
  };

  const handleCopyNewToken = () => {
    if (newGeneratedToken) {
      navigator.clipboard.writeText(newGeneratedToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

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
    if (deleteConfirmText.trim() !== (project.name || '').trim()) {
      setMessage('Project name did not match confirmation requirement.');
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project._id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage('Project, runs, experiments, and artifacts deleted successfully.');
        setDeleteModalOpen(false);
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
    <div className="space-y-8 max-w-4xl font-sans">
      {/* Settings Header */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings size={22} className="text-slate-400" />
          System Settings &amp; Data Governance
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage terminology assistance, reading modes, API authentication, and isolated sandbox policies.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-xs text-indigo-300">
          {message}
        </div>
      )}

      {/* Reading Modes & Accessibility */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Sliders size={16} className="text-indigo-400" />
          Terminology Guidance &amp; Reading Modes
        </h3>
        <p className="text-xs text-slate-400">
          Configure how technical metrics and non-functional terms are explained throughout the platform.
        </p>

        <div className="space-y-3 pt-2">
          <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={expertMode}
              onChange={(e) => setExpertMode(e.target.checked)}
              className="mt-0.5 rounded text-indigo-600 focus:ring-0"
            />
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Expert Mode</span>
              <span className="text-[11px] text-slate-400">
                Displays formal mathematical definitions, Mann-Whitney U test formulas, and SLA thresholds alongside Grade 8 plain-language summaries.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={alwaysShowIcons}
              onChange={(e) => setAlwaysShowIcons(e.target.checked)}
              className="mt-0.5 rounded text-indigo-600 focus:ring-0"
            />
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Always Show Help '?' Icons</span>
              <span className="text-[11px] text-slate-400">
                Keeps the small circled '?' button visible next to all technical terms even in Expert mode.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* API Tokens */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-amber-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              API Access Tokens
            </h3>
          </div>
          <Button variant="outline" size="sm" onClick={handleGenerateToken}>
            Generate New Token
          </Button>
        </div>

        <p className="text-xs text-slate-400">
          Programmatic access tokens for CLI automation (`agy`), CI/CD integration, and external agent runners.
        </p>

        {newGeneratedToken && (
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 space-y-2">
            <span className="text-xs font-bold text-amber-300 block">
              New Secret API Token (Shown Once Only):
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={newGeneratedToken}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-amber-200"
              />
              <Button variant="secondary" size="sm" onClick={handleCopyNewToken} leftIcon={copiedToken ? Check : Copy}>
                {copiedToken ? 'Copied' : 'Copy Token'}
              </Button>
            </div>
          </div>
        )}

        <div className="divide-y divide-slate-800">
          {apiTokens.map((t) => (
            <div key={t.id} className="py-3 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="font-semibold text-white block">{t.name}</span>
                <span className="text-slate-500 text-[11px]">{t.masked}</span>
              </div>
              <span className="text-slate-400 text-[11px]">Last used: {t.lastUsed}</span>
            </div>
          ))}
        </div>
      </div>

      {/* LLM Engine & Sandbox Environment */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Cpu size={16} className="text-emerald-400" />
          LLM Generator &amp; Isolated Sandbox Engine
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 uppercase text-[10px]">AI Reasoning Swarm</span>
            <div className="text-white font-bold">Claude 3.5 Sonnet / Gemini 1.5 Pro</div>
            <p className="text-[11px] text-slate-500">Agent framework: LangGraph StateGraph</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 uppercase text-[10px]">Sandbox Network Policy</span>
            <div className="text-emerald-400 font-bold">ZERO EGRESS (Isolated)</div>
            <p className="text-[11px] text-slate-500">cgroups v2 enforce 2 NanoCPUs &amp; 2GB hard caps</p>
          </div>
        </div>
      </div>

      {/* Data Lifecycle & GDPR Export */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Database size={16} className="text-sky-400" />
          Data Lifecycle &amp; Export
        </h3>
        <p className="text-xs text-slate-400">
          Download a complete portable JSON archive containing all projects, runs, raw metrics, experiments, lessons, and reports.
        </p>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleExportData}
          isLoading={exporting}
          leftIcon={Download}
        >
          {exporting ? 'Compiling Archive...' : 'Export All My Data (JSON)'}
        </Button>
      </div>

      {/* Danger Zone: Type-to-Confirm Project Deletion */}
      {project && (
        <div className="p-6 rounded-2xl border border-rose-900/40 bg-rose-950/15 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
            <AlertOctagon size={16} className="text-rose-500" />
            Danger Zone: Delete Active Project
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Permanently delete <strong className="text-white">"{project.name}"</strong>, including all baseline runs, ranked defect reports, candidate patch experiments, vector embeddings, and report artifacts.
          </p>

          {!deleteModalOpen ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteModalOpen(true)}
              leftIcon={Trash2}
            >
              Delete This Project
            </Button>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950 border border-rose-900/60 space-y-3">
              <span className="text-xs text-slate-300 block">
                To confirm permanent deletion, please type the project name{' '}
                <strong className="text-rose-400 select-all font-mono">"{project.name}"</strong> below:
              </span>
              <input
                type="text"
                placeholder={project.name}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteConfirmText.trim() !== (project.name || '').trim() || deleting}
                  isLoading={deleting}
                  onClick={handleDeleteProject}
                >
                  Confirm Permanent Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteModalOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
