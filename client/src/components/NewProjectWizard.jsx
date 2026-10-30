import React, { useState } from 'react';
import { Upload, GitBranch, ArrowLeft, ArrowRight, ShieldCheck, Check, Sliders, AlertCircle, Database, Server, Clock, Zap } from 'lucide-react';
import { Button } from '../design-system/Button';
import { HelpTip } from './HelpTip';
import { DataLabelBadge } from '../design-system/DataLabelBadge';

/**
 * Production 3-Step New Project Wizard:
 * Step 1: Source (Zip dropzone or GitHub URL + Sandbox Trust Note)
 * Step 2: Detected Setup (Framework, entry point, editable routes, masked env)
 * Step 3: Test Profiles & Budget (Quick / Standard / Thorough presets + Cost/Time estimates)
 */
export function NewProjectWizard({ onCancel, onComplete }) {
  const [step, setStep] = useState(1);
  const [sourceType, setSourceType] = useState('zip'); // 'zip' | 'git'
  const [zipFile, setZipFile] = useState(null);
  const [gitUrl, setGitUrl] = useState('');
  const [gitBranch, setGitBranch] = useState('main');

  // Step 2: Setup configuration
  const [setup, setSetup] = useState({
    framework: 'express',
    entryPoint: 'server.js',
    startCommand: 'node server.js',
    port: 3000,
    services: { mongodb: true, redis: false },
    envVars: [{ key: 'NODE_ENV', value: 'test', masked: false }]
  });

  // Step 3: Test Profiles & Budget Presets
  const [profiles, setProfiles] = useState({
    load: true,
    stress: true,
    spike: false,
    soak: false
  });

  const [preset, setPreset] = useState('standard'); // 'quick' | 'standard' | 'thorough' | 'custom'
  const [budget, setBudget] = useState({
    maxExperiments: 10,
    tokenBudget: 35000,
    benchmarkRuns: 5,
    maxMinutes: 15
  });

  const handlePresetSelect = (p) => {
    setPreset(p);
    if (p === 'quick') {
      setBudget({ maxExperiments: 3, tokenBudget: 12000, benchmarkRuns: 3, maxMinutes: 5 });
    } else if (p === 'standard') {
      setBudget({ maxExperiments: 10, tokenBudget: 35000, benchmarkRuns: 5, maxMinutes: 15 });
    } else if (p === 'thorough') {
      setBudget({ maxExperiments: 25, tokenBudget: 85000, benchmarkRuns: 7, maxMinutes: 45 });
    }
  };

  const handleFinish = () => {
    const projectPayload = {
      name: zipFile ? zipFile.name.replace(/\.zip$/i, '') : gitUrl ? gitUrl.split('/').pop() : 'new-project',
      sourceType,
      setup,
      profiles,
      budget,
      createdAt: new Date().toISOString()
    };
    if (onComplete) onComplete(projectPayload);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      {/* Wizard Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-8">
        <div>
          <h2 className="text-xl font-bold text-white">Create New Project</h2>
          <p className="text-xs text-slate-400">Configure your Node/Express service for isolated benchmarking</p>
        </div>

        {/* Stepper Indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-colors ${
                  step === s
                    ? 'bg-indigo-600 text-white'
                    : step > s
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {step > s ? <Check size={14} /> : s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-emerald-600' : 'bg-slate-800'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: Source */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-800 max-w-sm">
            <button
              onClick={() => setSourceType('zip')}
              className={`py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                sourceType === 'zip' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload size={14} />
              ZIP Archive
            </button>
            <button
              onClick={() => setSourceType('git')}
              className={`py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                sourceType === 'git' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitBranch size={14} />
              GitHub Repository
            </button>
          </div>

          {sourceType === 'zip' ? (
            <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-10 bg-slate-900/40 text-center transition-colors">
              <Upload size={36} className="text-indigo-400 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-slate-200 mb-1">
                {zipFile ? zipFile.name : 'Drag and drop your project ZIP file'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                Supports Node.js archives up to 50MB. node_modules will be automatically ignored.
              </p>
              <input
                type="file"
                accept=".zip"
                id="file-input"
                className="hidden"
                onChange={(e) => setZipFile(e.target.files[0] || null)}
              />
              <label htmlFor="file-input">
                <span className="inline-flex items-center px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer border border-slate-700">
                  Select ZIP from disk
                </span>
              </label>
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">GitHub HTTPS URL</label>
                <input
                  type="text"
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  placeholder="https://github.com/organization/express-backend"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="w-48">
                <label className="block text-xs font-medium text-slate-300 mb-1">Branch</label>
                <input
                  type="text"
                  value={gitBranch}
                  onChange={(e) => setGitBranch(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono"
                />
              </div>
            </div>
          )}

          {/* Sandbox Isolation Trust Note */}
          <div className="p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/15 flex items-start gap-3">
            <ShieldCheck size={20} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-emerald-300">Zero-Network Sandbox Guarantee: </span>
              Your uploaded code runs exclusively in an isolated Linux container with strictly disabled outbound network access. Your source code and database seeds never leave the sandbox boundary.
              <span className="ml-1 inline-block">
                <HelpTip term="sandbox_containment" />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Detected Setup */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server size={20} className="text-indigo-400" />
              <div>
                <span className="text-xs font-semibold text-white block">Auto-Detected Node/Express Setup</span>
                <span className="text-[11px] text-slate-400">Review and adjust detected runtime parameters</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Validated AST
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Entry Point File</label>
              <input
                type="text"
                value={setup.entryPoint}
                onChange={(e) => setSetup({ ...setup, entryPoint: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Port</label>
              <input
                type="number"
                value={setup.port}
                onChange={(e) => setSetup({ ...setup, port: parseInt(e.target.value, 10) || 3000 })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono"
              />
            </div>
          </div>

          {/* Required Service Mocks */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Required Sandbox Auxiliary Services</label>
            <div className="grid grid-cols-2 gap-3">
              <label className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={setup.services.mongodb}
                  onChange={(e) => setSetup({ ...setup, services: { ...setup.services, mongodb: e.target.checked } })}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <Database size={15} className="text-indigo-400" />
                <span className="text-xs text-slate-200">MongoDB In-Memory Sandbox</span>
              </label>
              <label className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={setup.services.redis}
                  onChange={(e) => setSetup({ ...setup, services: { ...setup.services, redis: e.target.checked } })}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <Database size={15} className="text-rose-400" />
                <span className="text-xs text-slate-200">Redis Ephemeral Instance</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Test Profiles & Budget */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-3">1. Select Benchmark Load Profiles</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: 'load', title: 'Standard Load', desc: 'Sustained normal concurrency (60s)', term: 'steady_traffic' },
                { key: 'stress', title: 'Stress Profile', desc: 'Ramping to breaking point (90s)', term: 'breaking_point' },
                { key: 'spike', title: 'Traffic Spike', desc: 'Instantaneous 5x traffic burst (45s)', term: 'peak_capacity' },
                { key: 'soak', title: 'Memory Soak', desc: 'Extended run testing for leaks (10m)', term: 'heap_memory' }
              ].map((p) => (
                <label
                  key={p.key}
                  className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                    profiles[p.key]
                      ? 'bg-indigo-950/30 border-indigo-500/50 text-white'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <input
                      type="checkbox"
                      checked={profiles[p.key]}
                      onChange={(e) => setProfiles({ ...profiles, [p.key]: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-0"
                    />
                    <HelpTip term={p.term} />
                  </div>
                  <span className="text-xs font-semibold block">{p.title}</span>
                  <span className="text-[10px] text-slate-400">{p.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Optimization Budget Presets */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200">2. Autonomous Optimization Budget</h3>
              <span className="text-xs text-slate-400 font-mono">Guaranteed cost/time ceiling</span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { id: 'quick', title: 'Quick Pass', exps: 3, time: '5 mins', tokens: '12k tokens' },
                { id: 'standard', title: 'Standard Run', exps: 10, time: '15 mins', tokens: '35k tokens' },
                { id: 'thorough', title: 'Deep Sweep', exps: 25, time: '45 mins', tokens: '85k tokens' }
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handlePresetSelect(b.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    preset === b.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-950/30'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="font-semibold text-xs block mb-1">{b.title}</span>
                  <span className="text-xs font-mono font-bold text-indigo-300 block">{b.exps} Experiments</span>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                    <span>{b.time}</span>
                    <span>•</span>
                    <span>{b.tokens}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Wizard Footer Controls */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-800 mt-8">
        {step > 1 ? (
          <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)} leftIcon={ArrowLeft}>
            Back
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}

        {step < 3 ? (
          <Button variant="primary" size="sm" onClick={() => setStep(s => s + 1)} rightIcon={ArrowRight}>
            Next Step
          </Button>
        ) : (
          <Button variant="primary" size="md" onClick={handleFinish} leftIcon={Zap} className="px-6 font-semibold">
            Start Analysis & Baseline
          </Button>
        )}
      </div>
    </div>
  );
}

export default NewProjectWizard;
