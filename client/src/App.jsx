import React, { useState, useEffect, Suspense, lazy } from 'react';
import Header from './components/Header';
import { GuidedJourneyBar } from './components/GuidedJourneyBar';
import { HelpTip, Term } from './components/HelpTip';
import { HelpProvider, useHelp } from './content/HelpContext';
import { TabSkeletonFallback } from './design-system/Skeleton';
import { CommandPalette } from './design-system/CommandPalette';
import { KeyboardHelpModal } from './design-system/KeyboardHelpModal';
import { OnboardingTour } from './design-system/OnboardingTour';
import { DEMO_PROJECT, DEMO_EXPERIMENTS } from './demo/demoData';
import { 
  BarChart2, Activity, AlertTriangle, Zap, Database, Target, FileText, Settings, ShieldCheck, RefreshCw, AlertCircle, BookOpen, Plus, Folder 
} from 'lucide-react';

// Code-split all main screens with React.lazy
const OverviewPage = lazy(() => import('./components/OverviewPage'));
const BaselineReport = lazy(() => import('./components/BaselineReport'));
const DefectsPage = lazy(() => import('./components/DefectsPage'));
const OptimizePage = lazy(() => import('./components/OptimizePage'));
const MemoryPage = lazy(() => import('./components/MemoryPage'));
const PolicyPage = lazy(() => import('./components/PolicyPage'));
const ReportsPage = lazy(() => import('./components/ReportsPage'));
const GlossaryPage = lazy(() => import('./components/GlossaryPage'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const ProjectList = lazy(() => import('./components/ProjectList'));
const NewProjectWizard = lazy(() => import('./components/NewProjectWizard'));
const ExperimentDrawer = lazy(() => import('./components/ExperimentDrawer'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const AuthModal = lazy(() => import('./components/AuthModal'));

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
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [activeRun, setActiveRun] = useState(null);
  const [activeNavTab, setActiveNavTab] = useState('overview'); // overview, baseline, defects, optimize, memory, policy, reports, settings, glossary
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Running jobs tracking
  const [runningJobs, setRunningJobs] = useState([]);

  const { expertMode, setExpertMode, setCurrentPage, theme } = useHelp();

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

  // Fetch all projects from backend
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

          // Verify if activeProject still exists in fresh list from backend
          const activeStillExists = activeProject && data.some(p => (p._id || p.id) === (activeProject._id || activeProject.id));
          if (!activeStillExists || !activeProject) {
            setActiveProject(data[0]);
            if (data[0].baselineRunId) {
              setActiveRun(data[0].baselineRunId);
            }
          } else {
            const fresh = data.find(p => (p._id || p.id) === (activeProject._id || activeProject.id));
            if (fresh) {
              setActiveProject(fresh);
              if (fresh.baselineRunId) setActiveRun(fresh.baselineRunId);
            }
          }
        } else {
          setProjects([DEMO_PROJECT]);
          setActiveProject(DEMO_PROJECT);
          setIsDemoMode(true);
        }
      } else {
        setProjects([DEMO_PROJECT]);
        setActiveProject(DEMO_PROJECT);
        setIsDemoMode(true);
      }
    } catch (e) {
      console.warn('[EVOLVE] Backend unreachable; operating in self-contained demo mode:', e.message);
      setProjects([DEMO_PROJECT]);
      setActiveProject(DEMO_PROJECT);
      setIsDemoMode(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSelectProject = (project) => {
    if (!project) return;
    setActiveProject(project);
    if (project.baselineRunId) {
      setActiveRun(project.baselineRunId);
    } else {
      setActiveRun(null);
    }
  };

  // Self-healing recovery if a child component reports a 404 for a deleted project
  const handleProjectNotFound = (deletedId) => {
    console.warn(`[EVOLVE] Project ${deletedId} was not found on backend. Falling back to active database project.`);
    const remaining = projects.filter(p => (p._id || p.id) !== deletedId);
    if (remaining.length > 0) {
      setProjects(remaining);
      handleSelectProject(remaining[0]);
    } else {
      fetchProjects();
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

  if (showLanding) {
    return (
      <Suspense fallback={<TabSkeletonFallback />}>
        <LandingPage
          onEnterDemo={handleEnterDemo}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onGoToDashboard={() => setShowLanding(false)}
        />
      </Suspense>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'} flex flex-col font-sans selection:bg-indigo-500/30 transition-colors duration-150`}>
      <Header
        projects={projects}
        activeProject={activeProject}
        onSelectProject={handleSelectProject}
        onOpenWizard={() => setIsWizardOpen(true)}
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
        {/* Guided 4-Step Product Journey Bar */}
        <GuidedJourneyBar
          activeNavTab={activeNavTab}
          onNavigateTab={(tab) => setActiveNavTab(tab)}
          projectProgress={{
            step: activeProject?.baselineRunId ? 2 : 1,
            totalDefects: 3,
            acceptedFixes: 2
          }}
        />

        {/* Active Screen Content with Suspense & Zero Layout Shift */}
        <Suspense fallback={<TabSkeletonFallback title="Loading section..." />}>
          {activeNavTab === 'overview' && (
            <OverviewPage
              project={activeProject}
              onOpenDrawer={handleOpenDrawer}
              onNavigateOptimize={() => setActiveNavTab('optimize')}
              onProjectNotFound={handleProjectNotFound}
            />
          )}

          {activeNavTab === 'baseline' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <ProjectList
                  projects={projects}
                  selectedProjectId={activeProject?._id || activeProject?.id}
                  onSelectProject={handleSelectProject}
                />
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 text-xs space-y-2 text-slate-400 shadow-sm">
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
                  onRebenchmark={fetchProjects}
                  onProjectNotFound={handleProjectNotFound}
                />
              </div>
            </div>
          )}

          {activeNavTab === 'defects' && (
            <DefectsPage
              project={activeProject}
              onProjectNotFound={handleProjectNotFound}
              onNavigateOptimize={() => setActiveNavTab('optimize')}
            />
          )}

          {activeNavTab === 'optimize' && (
            <OptimizePage
              projectId={activeProject?._id || activeProject?.id}
              project={activeProject}
              onOpenDrawer={handleOpenDrawer}
              onProjectNotFound={handleProjectNotFound}
            />
          )}

          {activeNavTab === 'memory' && (
            <MemoryPage
              project={activeProject}
              onProjectNotFound={handleProjectNotFound}
            />
          )}

          {activeNavTab === 'policy' && (
            <PolicyPage
              project={activeProject}
              onProjectNotFound={handleProjectNotFound}
            />
          )}

          {activeNavTab === 'reports' && (
            <ReportsPage
              project={activeProject}
              onProjectNotFound={handleProjectNotFound}
            />
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
        </Suspense>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950/80 py-4 text-center text-xs text-slate-500 flex items-center justify-between max-w-7xl w-full mx-auto px-4">
        <span>EVOLVE Autonomous Closed-Loop Optimization Platform</span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsOnboardingTourOpen(true)}
            className="text-indigo-400 hover:text-indigo-300 text-xs font-medium"
          >
            Guided Tour
          </button>
          <button
            onClick={() => setShowLanding(true)}
            className="text-slate-400 hover:text-slate-300 text-xs"
          >
            Landing Page
          </button>
        </div>
      </footer>

      {/* Global Modals, Drawers & Palettes */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tab) => { setActiveNavTab(tab); setIsCommandPaletteOpen(false); }}
      />

      <KeyboardHelpModal
        isOpen={isKeyboardHelpOpen}
        onClose={() => setIsKeyboardHelpOpen(false)}
      />

      <OnboardingTour
        isOpen={isOnboardingTourOpen}
        onClose={() => setIsOnboardingTourOpen(false)}
        onComplete={() => setIsOnboardingTourOpen(false)}
      />

      <Suspense fallback={null}>
        <ExperimentDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          experiment={selectedExperiment}
          onNext={handleDrawerNext}
          onPrev={handleDrawerPrev}
          hasNext={Boolean(selectedExperiment)}
          hasPrev={Boolean(selectedExperiment)}
        />

        {isWizardOpen && (
          <NewProjectWizard
            isOpen={isWizardOpen}
            onClose={() => setIsWizardOpen(false)}
            onProjectCreated={(newProj) => {
              setIsWizardOpen(false);
              fetchProjects();
              handleSelectProject(newProj);
              setActiveNavTab('baseline');
            }}
          />
        )}

        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
          />
        )}
      </Suspense>
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
