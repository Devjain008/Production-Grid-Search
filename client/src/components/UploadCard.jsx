import React, { useState } from 'react';
import { UploadCloud, Github, Globe, Play, AlertCircle, FileArchive, Zap, Sparkles, Check } from 'lucide-react';
import InfoTooltip from './InfoTooltip';

export default function UploadCard({ onProjectCreated }) {
  const [tab, setTab] = useState('zip'); // 'zip' | 'github' | 'live'
  const [projectName, setProjectName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [profile, setProfile] = useState('load');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.zip')) {
        setErrorMessage('Please select a .zip archive of a Node.js / Express application.');
        return;
      }
      setSelectedFile(file);
      setErrorMessage('');
      if (!projectName) {
        setProjectName(file.name.replace('.zip', ''));
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.name.endsWith('.zip')) {
        setErrorMessage('Please drop a valid .zip archive.');
        return;
      }
      setSelectedFile(file);
      setErrorMessage('');
      if (!projectName) {
        setProjectName(file.name.replace('.zip', ''));
      }
    }
  };

  const handleDemoClick = async () => {
    setIsDemoLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/projects/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize sample demo.');
      }
      onProjectCreated(data.project, data.baselineRun);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (tab === 'zip' && !selectedFile) {
      setErrorMessage('Please select a project .zip archive to upload.');
      return;
    }
    if (tab === 'github' && !repoUrl) {
      setErrorMessage('Please provide a valid GitHub repository URL.');
      return;
    }
    if (tab === 'live' && !liveUrl) {
      setErrorMessage('Please provide a valid live deployed application URL (e.g. https://api.example.com).');
      return;
    }

    setIsSubmitting(true);
    try {
      let res;
      if (tab === 'zip') {
        const formData = new FormData();
        formData.append('projectZip', selectedFile);
        formData.append('name', projectName);
        formData.append('profile', profile);

        res = await fetch('/api/projects', {
          method: 'POST',
          body: formData
        });
      } else if (tab === 'github') {
        res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repoUrl,
            name: projectName,
            profile
          })
        });
      } else {
        // Direct Live Deployed Endpoint Mode
        res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            liveUrl,
            name: projectName,
            profile
          })
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize project benchmark.');
      }

      onProjectCreated(data.project, data.baselineRun);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
      {/* 1-Click Quick Demo Banner */}
      <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-emerald-950/80 border border-cyan-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 border border-cyan-500/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Instant Verification Demo</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 font-mono">Buggy Express App</span>
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Evaluate real injected bottlenecks: N+1 database queries, sync PBKDF2 hash, and unbounded memory leak.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDemoClick}
          disabled={isDemoLoading || isSubmitting}
          className="flex-shrink-0 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/25 transition disabled:opacity-50"
        >
          <Zap className={`w-3.5 h-3.5 ${isDemoLoading ? 'animate-spin' : ''}`} />
          <span>{isDemoLoading ? 'Booting Sandbox...' : 'Run Built-in Sample Benchmark'}</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-1.5">
            <span>Target Application Configuration</span>
            <InfoTooltip term="sandbox_containment" />
          </h2>
          <p className="text-xs text-slate-400">
            {tab === 'live'
              ? 'Direct Online Mode: Probes live endpoints & benchmarks production infrastructure'
              : 'Codebase Mode: Sandboxed container execution with 1 Core CPU & 512MB RAM bounds'}
          </p>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setTab('zip')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${
              tab === 'zip' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileArchive className="w-3.5 h-3.5" />
            <span>Zip File</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('github')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${
              tab === 'github' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>Git Repo</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('live')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${
              tab === 'live' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Deployed Live URL</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-950/80 border border-red-800 rounded-xl flex items-center space-x-2 text-xs text-red-300 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Project Identifier (Optional)</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={tab === 'live' ? 'e.g. Production-Api-Staging' : 'e.g. MyExpressApp'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono transition"
            />
          </div>

          <div>
            <div className="flex items-center space-x-1 mb-1">
              <label className="text-xs font-semibold text-slate-300">Load Profile</label>
              <InfoTooltip term="load_profile" />
            </div>
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-sans transition"
            >
              <option value="load">Standard Load (20 VUs, 30s) - Baseline evaluation</option>
              <option value="stress">Stress Test (80 VUs, 45s) - Find saturation & max peak traffic</option>
              <option value="spike">Traffic Spike (100 VUs, 20s) - Sudden burst recovery test</option>
              <option value="soak">Soak Test (15 VUs, 60s) - Memory & socket leak audit</option>
            </select>
          </div>
        </div>

        {tab === 'zip' && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Project Zip Archive</label>
            <label
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition ${
                isDragOver
                  ? 'border-cyan-400 bg-cyan-950/30'
                  : selectedFile
                  ? 'border-emerald-500/60 bg-emerald-950/20'
                  : 'border-slate-800 hover:border-cyan-500/80 bg-slate-950/60'
              }`}
            >
              {selectedFile ? (
                <div className="flex flex-col items-center space-y-1">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1">
                    <Check className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-white font-mono">{selectedFile.name}</span>
                  <span className="text-[11px] text-emerald-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for sandbox extraction</span>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-8 h-8 text-cyan-400 mb-2" />
                  <span className="text-xs font-medium text-slate-200">
                    Click to browse or drop your Node.js project .zip archive
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 font-mono">Requires package.json at root • Max 50MB</span>
                </>
              )}
              <input
                type="file"
                accept=".zip"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        )}

        {tab === 'github' && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">GitHub Repository Clone URL</label>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/expressjs/express.git"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono transition"
            />
            <p className="text-[11px] text-slate-500 mt-1">EVOLVE will clone the repository shallowly, inspect AST routes, and run in the sandbox container.</p>
          </div>
        )}

        {tab === 'live' && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Direct Deployed Online URL</label>
            <input
              type="text"
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              placeholder="https://my-express-api.onrender.com or http://localhost:8080"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono transition"
            />
            <p className="text-[11px] text-slate-500 mt-1">Direct online mode checks health readiness, probes for OpenAPI/Swagger specs, and benchmarks the deployed service directly.</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-slate-400 flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>
              {tab === 'live'
                ? 'Direct Online Mode: Zero container build overhead. Tests live infrastructure.'
                : 'Isolation Caps: 1 Core CPU, 512MB RAM, 100 PIDs, zero network egress.'}
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isDemoLoading}
            className="flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-lg shadow-cyan-600/20 disabled:opacity-50 transition"
          >
            <Play className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
            <span>
              {isSubmitting
                ? 'Initializing Pipeline...'
                : tab === 'live'
                ? 'Benchmark Live Deployment'
                : 'Run Baseline Benchmark'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
