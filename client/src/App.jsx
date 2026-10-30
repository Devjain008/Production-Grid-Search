import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import AuthModal from './components/AuthModal';
import NewProjectWizard from './components/NewProjectWizard';
import BaselineReport from './components/BaselineReport';
import ProjectList from './components/ProjectList';
import DefectsPage from './components/DefectsPage';
import MemoryPage from './components/MemoryPage';
import OptimizePage from './components/OptimizePage';
import OverviewPage from './components/OverviewPage';
import PolicyPage from './components/PolicyPage';
import ReportsPage from './components/ReportsPage';
import SettingsPage from './components/SettingsPage';
import GlossaryPage from './components/GlossaryPage';
import ExperimentDrawer from './components/ExperimentDrawer';
import { HelpTip, Term } from './components/HelpTip';
import { HelpProvider, useHelp } from './content/HelpContext';
import { CommandPalette } from './design-system/CommandPalette';
import { KeyboardHelpModal } from './design-system/KeyboardHelpModal';
import { OnboardingTour } from './design-system/OnboardingTour';
import { DEMO_PROJECT, DEMO_EXPERIMENTS } from './demo/demoData';
import { 
  BarChart2, Activity, AlertTriangle, Zap, Database, Target, FileText, Settings, ShieldCheck, RefreshCw, AlertCircle, BookOpen, Plus, Folder 
} from 'lucide-react';

function AppContent() {
  const [showLanding, setShowLanding] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isKeyboardHelpOpen, setIsKeyboardHelpOpen] = useState(false);
  const [isOnboardingTourOpen, setIsOnboardingTourOpen] = useState(false);

  // Experiment Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState(null);

  // Data & Navigation State
  const [projects, setProjects] = useState([DEMO_PROJECT]);
  const [activeProject, setActiveProject] = useState(DEMO_PROJECT);
  const [activeRun, setActiveRun] = useState(null);
  const [activeNavTab, setActiveNavTab] = useState('overview'); // overview, baseline, defects, optimize, memory, policy, reports, settings, glossary
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(true);

  // Running jobs tracking
  const [runningJobs, setRunningJobs] = useState([]);

  const { expertMode, setExpertMode, setCurrentPage } = useHelp();

  // Sync current page with HelpContext for glossary "Used on this page"
  useEffect(() => {
    setCurrentPage(activeNavTab);
  }, [activeNavTab, setCurrentPage]);

  // Global keydown listeners for Ctrl+K and ?
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      } else if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
        e.preventDefault();
        setIsKeyboardHelpOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch all projects from backend or fallback to DEMO
  const fetchProjects = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProjects(data);
          setBackendError(null);
          setIsDemoMode(false);
          if (!activeProject || activeProject._id === DEMO_PROJECT._id) {
            setActiveProject(data[0]);
            if (data[0].baselineRunId) {
              setActiveRun(data[0].baselineRunId);
            }
          }
        }
      } else {
        // Backend not returning projects, stay in demo mode gracefully
        setIsDemoMode(true);
      }
    } catch (e) {
      // Backend not running, operate in self-contained demo mode
      setIsDemoMode(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSelectProject = (project) => {
    setActiveProject(project);
    if (project.baselineRunId) {
      setActiveRun(project.baselineRunId);
    }
  };

  const handleEnterDemo = () => {
    setIsDemoMode(true);
    setActiveProject(DEMO_PROJECT);
    setProjects([DEMO_PROJECT]);
    setActiveNavTab('overview');
    setShowLanding(false);
  };

  const handleOpenDrawer = (exp) => {
    setSelectedExperiment(exp);
    setIsDrawerOpen(true);
  };

  const handleDrawerNext = () => {
    const currentList = DEMO_EXPERIMENTS;
    const idx = currentList.findIndex(e => (e._id || e.experimentId) === (selectedExperiment?._id || selectedExperiment?.experimentId));
    if (idx !== -1 && idx < currentList.length - 1) {
      setSelectedExperiment(currentList[idx + 1]);
    }
  };

  const handleDrawerPrev = () => {
    const currentList = DEMO_EXPERIMENTS;
    const idx = currentList.findIndex(e => (e._id || e.experimentId) === (selectedExperiment?._id || selectedExperiment?.experimentId));
    if (idx > 0) {
      setSelectedExperiment(currentList[idx - 1]);
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity, color: 'text-indigo-400' },
    { id: 'baseline', label: 'Baseline', icon: BarChart2, color: 'text-sky-400' },
    { id: 'defects', label: 'Defects', icon: AlertTriangle, color: 'text-amber-400' },
    { id: 'optimize', label: 'Optimize', icon: Zap, color: 'text-emerald-400' },
    { id: 'memory', label: 'Memory', icon: Database, color: 'text-purple-400' },
    { id: 'policy', label: 'Policy', icon: Target, color: 'text-rose-400' },
    { id: 'reports', label: 'Reports', icon: FileText, color: 'text-blue-400' },
    { id: 'glossary', label: 'Glossary', icon: BookOpen, color: 'text-indigo-300' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'text-slate-400' }
  ];

  if (showLanding) {
    return (
      <LandingPage
        onEnterDemo={handleEnterDemo}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onGoToDashboard={() => setShowLanding(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      <Header
        activeProject={activeProject}
        activeNavTab={activeNavTab}
        onRefresh={fetchProjects}
        isRefreshing={isRefreshing}
        onNavigateTab={(tab) => setActiveNavTab(tab)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenKeyboardHelp={() => setIsKeyboardHelpOpen(true)}
        runningJobs={runningJobs}
        isDemoMode={isDemoMode}
        onEnterDemo={handleEnterDemo}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 overflow-x-auto">
          <nav className="flex space-x-1 sm:space-x-2" role="tablist" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNavTab === item.id;
              return (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveNavTab(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-950'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <button
            onClick={() => setIsWizardOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shrink-0 ml-4 shadow-sm"
          >
            <Plus size={14} />
            <span>New Project</span>
          </button>
        </div>

        {/* Project Switcher Bar if multiple projects exist */}
        {projects.length > 1 && activeNavTab !== 'glossary' && (
          <div className="flex items-center space-x-2 text-xs bg-slate-900/60 border border-slate-800/80 px-4 py-2.5 rounded-xl overflow-x-auto">
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">Active Project:</span>
            {projects.map(p => (
              <button
                key={p._id}
                onClick={() => handleSelectProject(p)}
                className={`px-3 py-1 rounded-lg font-medium transition text-xs whitespace-nowrap ${
                  activeProject?._id === p._id
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {p.name} {p._id === DEMO_PROJECT._id ? '[DEMO]' : ''}
              </button>
            ))}
          </div>
        )}

        {/* Active Screen Content */}
        {activeNavTab === 'overview' && (
          <OverviewPage
            project={activeProject}
            onOpenDrawer={handleOpenDrawer}
          />
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
                  <HelpTip term="sandbox_containment" />
                </h4>
                <ul className="space-y-1 list-disc list-inside text-[11px] text-slate-400">
                  <li>Isolated cgroups v2 container</li>
                  <li>Hard NanoCPUs limit (2 Cores)</li>
                  <li>Memory bound at 2GB RAM</li>
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
                onRebenchmark={() => {}}
              />
            </div>
          </div>
        )}

        {activeNavTab === 'defects' && (
          <DefectsPage project={activeProject} />
        )}

        {activeNavTab === 'optimize' && (
          <OptimizePage
            projectId={activeProject?._id}
            onOpenDrawer={handleOpenDrawer}
          />
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

        {activeNavTab === 'glossary' && (
          <GlossaryPage />
        )}

        {activeNavTab === 'settings' && (
          <SettingsPage 
            project={activeProject} 
            onProjectDeleted={() => fetchProjects()} 
          />
        )}
      </main>

      <footer className="border-t border-slate-800 bg-slate-950/80 py-4 text-center text-xs text-slate-500 flex items-center justify-between max-w-7xl w-full mx-auto px-4">
        <span>EVOLVE Autonomous Closed-Loop Optimization Platform &bull; Production Ready</span>
        <button
          onClick={() => setShowLanding(true)}
          className="text-indigo-400 hover:text-indigo-300 text-xs"
        >
          View Landing Page
        </button>
      </footer>

      {/* Global Modals, Drawers & Palettes */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tab) => { setActiveNavTab(tab); setIsCommandPaletteOpen(false); }}
        onToggleExpertMode={() => setExpertMode(!expertMode)}
        isExpertMode={expertMode}
        onLoadDemo={handleEnterDemo}
        onStartOptimize={() => { setActiveNavTab('optimize'); setIsCommandPaletteOpen(false); }}
      />

      <KeyboardHelpModal
        isOpen={isKeyboardHelpOpen}
        onClose={() => setIsKeyboardHelpOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" role="dialog">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl my-8">
            <NewProjectWizard
              onCancel={() => setIsWizardOpen(false)}
              onComplete={(newProj) => {
                setProjects(prev => [newProj, ...prev]);
                setActiveProject(newProj);
                setIsWizardOpen(false);
                setActiveNavTab('overview');
              }}
            />
          </div>
        </div>
      )}

      <ExperimentDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        experiment={selectedExperiment}
        onNext={handleDrawerNext}
        onPrev={handleDrawerPrev}
        hasNext={true}
        hasPrev={true}
      />

      <OnboardingTour
        isOpen={isOnboardingTourOpen}
        onClose={() => setIsOnboardingTourOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <HelpProvider>
      <AppContent />
    </HelpProvider>
  );
}
