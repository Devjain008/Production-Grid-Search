import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import UploadCard from './components/UploadCard';
import BaselineReport from './components/BaselineReport';
import ProjectList from './components/ProjectList';
import DefectsPage from './components/DefectsPage';
import MemoryPage from './components/MemoryPage';
import OptimizePage from './components/OptimizePage';
import OverviewPage from './components/OverviewPage';
import PolicyPage from './components/PolicyPage';
import ReportsPage from './components/ReportsPage';
import SettingsPage from './components/SettingsPage';
import { 
  BarChart2, Activity, AlertTriangle, Zap, Database, Target, FileText, Settings, ShieldCheck, RefreshCw 
} from 'lucide-react';

export default function App() {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [activeRun, setActiveRun] = useState(null);
  const [activeNavTab, setActiveNavTab] = useState('overview'); // overview, baseline, defects, optimize, memory, policy, reports, settings
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
    setActiveNavTab('overview');
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

  const handleProjectDeleted = (deletedId) => {
    const remaining = projects.filter(p => p._id !== deletedId);
    setProjects(remaining);
    setActiveProject(remaining[0] || null);
    setActiveRun(remaining[0]?.baselineRunId || null);
    setActiveNavTab('overview');
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: BarChart2, color: 'text-sky-400', activeBg: 'bg-sky-500 text-black' },
    { id: 'baseline', label: 'Baseline', icon: Activity, color: 'text-cyan-400', activeBg: 'bg-cyan-500 text-black' },
    { id: 'defects', label: 'Defects & Profiling', icon: AlertTriangle, color: 'text-amber-400', activeBg: 'bg-amber-400 text-black' },
    { id: 'optimize', label: 'Autonomous Agents', icon: Zap, color: 'text-emerald-400', activeBg: 'bg-emerald-400 text-black' },
    { id: 'memory', label: 'Experience Memory', icon: Database, color: 'text-indigo-400', activeBg: 'bg-indigo-500 text-white' },
    { id: 'policy', label: 'Policy Learning', icon: Target, color: 'text-purple-400', activeBg: 'bg-purple-500 text-white' },
    { id: 'reports', label: 'Reports & Artifacts', icon: FileText, color: 'text-blue-400', activeBg: 'bg-blue-500 text-white' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'text-slate-400', activeBg: 'bg-slate-700 text-white' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100">
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

        {/* Global Navigation Bar */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-thin">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNavTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNavTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? `${item.activeBg} shadow-md`
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
                aria-label={item.label}
              >
                <Icon className={`w-4 h-4 ${isActive ? '' : item.color}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Project Switcher Bar if not in baseline tab */}
        {projects.length > 1 && (
          <div className="flex items-center space-x-2 text-xs bg-slate-900/60 border border-slate-800/80 px-4 py-2.5 rounded-xl overflow-x-auto">
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">Active Project:</span>
            {projects.map(p => (
              <button
                key={p._id}
                onClick={() => handleSelectProject(p)}
                className={`px-3 py-1 rounded-lg font-medium transition text-xs whitespace-nowrap ${
                  activeProject?._id === p._id
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {p.name} {p.isDemo ? '[DEMO]' : ''}
              </button>
            ))}
          </div>
        )}

        {/* Content based on Active Tab */}
        {activeNavTab === 'overview' && (
          <OverviewPage project={activeProject} />
        )}

        {activeNavTab === 'baseline' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <ProjectList
                projects={projects}
                selectedProjectId={activeProject?._id}
                onSelectProject={handleSelectProject}
              />

              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 text-xs space-y-2 text-slate-400">
                <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sandbox Guarantees</span>
                </h4>
                <ul className="space-y-1 list-disc list-inside text-[11px] text-slate-400">
                  <li>Isolated cgroups v2 container</li>
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

        {activeNavTab === 'optimize' && (
          <OptimizePage project={activeProject} />
        )}

        {activeNavTab === 'memory' && (
          <MemoryPage project={activeProject} />
        )}

        {activeNavTab === 'policy' && (
          <PolicyPage project={activeProject} />
        )}

        {activeNavTab === 'reports' && (
          <ReportsPage project={activeProject} />
        )}

        {activeNavTab === 'settings' && (
          <SettingsPage 
            project={activeProject} 
            onProjectDeleted={handleProjectDeleted} 
          />
        )}
      </main>

      <footer className="border-t border-slate-800 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        EVOLVE Autonomous Closed-Loop Optimization Platform &bull; Production Ready
      </footer>
    </div>
  );
}
