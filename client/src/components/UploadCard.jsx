import React, { useState } from 'react';
import { UploadCloud, Github, Play, AlertCircle, FileArchive, Zap } from 'lucide-react';

export default function UploadCard({ onProjectCreated }) {
  const [tab, setTab] = useState('zip'); // 'zip' | 'github'
  const [projectName, setProjectName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [profile, setProfile] = useState('load');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
      } else {
        res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repoUrl,
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
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Deploy Node.js Project for Baseline</h2>
          <p className="text-xs text-slate-400">Untrusted execution in sandboxed container with automated route discovery and load profiling</p>
        </div>
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setTab('zip')}
            className={`px-3 py-1 rounded text-xs font-medium flex items-center space-x-1.5 transition ${
              tab === 'zip' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileArchive className="w-3.5 h-3.5" />
            <span>Zip Archive</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('github')}
            className={`px-3 py-1 rounded text-xs font-medium flex items-center space-x-1.5 transition ${
              tab === 'github' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub URL</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-950/80 border border-red-800 rounded-lg flex items-center space-x-2 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Project Name (Optional)</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. BuggyExpress-Baseline"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Load Profile</label>
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="load">Standard Load (20 VUs, 30s) - Baseline evaluation</option>
              <option value="stress">Stress Test (80 VUs, 45s) - Find saturation points</option>
              <option value="spike">Traffic Spike (100 VUs, 20s) - Burst traffic test</option>
              <option value="soak">Soak Test (15 VUs, 60s) - Detect memory leaks</option>
            </select>
          </div>
        </div>

        {tab === 'zip' ? (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Upload Project Zip Archive</label>
            <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-950/50 hover:bg-slate-950/80 transition">
              <UploadCloud className="w-8 h-8 text-cyan-400 mb-2" />
              <span className="text-sm font-medium text-slate-200">
                {selectedFile ? selectedFile.name : 'Click to browse or drop project .zip file'}
              </span>
              <span className="text-xs text-slate-400 mt-1">Must contain package.json and Express routes (Max 50MB)</span>
              <input
                type="file"
                accept=".zip"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">GitHub Repository Clone URL</label>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/expressjs/express.git"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-400 flex items-center space-x-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Sandboxed container isolation: 1 Core CPU, 512MB RAM, no outbound network.</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium text-sm bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-lg shadow-cyan-600/20 disabled:opacity-50 transition"
          >
            <Play className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
            <span>{isSubmitting ? 'Initializing Sandbox...' : 'Run Baseline Benchmark'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
