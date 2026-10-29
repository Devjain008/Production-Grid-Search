import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import UploadCard from './components/UploadCard';
import BaselineReport from './components/BaselineReport';
import ProjectList from './components/ProjectList';
import DefectsPage from './components/DefectsPage';
import MemoryPage from './components/MemoryPage';
import OptimizePage from './components/OptimizePage';
import { Activity, AlertTriangle, Database, Zap } from 'lucide-react';

export default function App() {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [activeRun, setActiveRun] = useState(null);
  const [activeNavTab, setActiveNavTab] = useState('baseline'); // 'baseline' | 'defects' | 'memory' | 'optimize'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pollTimerRef = useRef(null);

  // Fetch all projects
  const fetchProjects = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !activeProject) {
          setActiveProject(data[0]);
          if (data[0].baselineRunId) {
            setActiveRun(data[0].baselineRunId);
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch projects:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Poll active run if running
  useEffect(() => {
    if (activeRun && ['queued', 'building', 'running', 'loadtesting'].includes(activeRun.status)) {
      pollTimerRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/runs/${activeRun._id}`);
          if (res.ok) {
            const updatedRun = await res.json();
            setActiveRun(updatedRun);
            if (['completed', 'failed'].includes(updatedRun.status)) {
              fetchProjects();
            }
          }
        } catch (e) {
          console.error('Failed to poll run status:', e);
        }
      }, 1500);
    }

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [activeRun]);

  const handleProjectCreated = (newProject, newRun) => {
    setProjects([newProject, ...projects]);
    setActiveProject(newProject);
    setActiveRun(newRun);
  };

  const handleSelectProject = (project) => {
    setActiveProject(project);
    if (project.baselineRunId) {
      setActiveRun(project.baselineRunId);
    } else {
      setActiveRun(null);
    }
  };

  const handleRebenchmark = async (profile) => {
    if (!activeProject) return;
    try {
      const res = await fetch(`/api/projects/${activeProject._id}/baseline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRun(data.run);
      }
    } catch (e) {
      console.error('Failed to re-trigger baseline benchmark:', e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      <Header
        activeProject={activeProject}
        onRefresh={fetchProjects}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Project Ingestion Section */}
        <section>
          <UploadCard onProjectCreated={handleProjectCreated} />
        </section>

        {/* Global Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveNavTab('baseline')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeNavTab === 'baseline'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Baseline & Testing</span>
          </button>

          <button
            onClick={() => setActiveNavTab('defects')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeNavTab === 'defects'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Defects & Profiling</span>
          </button>

          <button
            onClick={() => setActiveNavTab('memory')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeNavTab === 'memory'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Experiment Memory</span>
          </button>

          <button
            onClick={() => setActiveNavTab('optimize')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeNavTab === 'optimize'
                ? 'bg-emerald-400 text-black shadow-md shadow-emerald-400/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Autonomous Agent Loop</span>
          </button>
        </div>

        {/* Content based on Active Tab */}
        {activeNavTab === 'baseline' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <ProjectList
                projects={projects}
                selectedProjectId={activeProject?._id}
                onSelectProject={handleSelectProject}
              />

              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 text-xs space-y-2 text-slate-400">
                <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">Sandbox Guarantees</h4>
                <ul className="space-y-1 list-disc list-inside text-[11px] text-slate-400">
                  <li>Untrusted execution boundary</li>
                  <li>Hard NanoCPUs limit (1 Core)</li>
                  <li>Memory bound at 512MB RAM</li>
                  <li>Anti-fork bomb (100 PIDs limit)</li>
                  <li>Zero outbound Internet egress</li>
                  <li>Non-root execution UID 1001</li>
                </ul>
              </div>
            </div>

            <div className="lg:col-span-3">
              <BaselineReport
                project={activeProject}
                run={activeRun}
                onRebenchmark={handleRebenchmark}
              />
            </div>
          </div>
        )}

        {activeNavTab === 'defects' && (
          <DefectsPage project={activeProject} />
        )}

        {activeNavTab === 'memory' && (
          <MemoryPage project={activeProject} />
        )}

        {activeNavTab === 'optimize' && (
          <OptimizePage project={activeProject} />
        )}
      </main>

      <footer className="border-t border-slate-800 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        EVOLVE Closed-Loop Performance Platform • Phases 1 - 4 Active
      </footer>
    </div>
  );
}
