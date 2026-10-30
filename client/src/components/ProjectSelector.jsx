import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Folder, ChevronDown, Search, Plus, Check, Globe, Server, AlertCircle } from 'lucide-react';

/**
 * Deduplicated, Searchable Project Selector Dropdown
 * Solves duplicate project chips, adds search, status dots, and clear distinguishing tags.
 */
export function ProjectSelector({
  projects = [],
  activeProject = null,
  onSelectProject,
  onOpenWizard
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Deduplicate and decorate project items
  const decoratedProjects = useMemo(() => {
    const nameCounts = {};
    projects.forEach(p => {
      nameCounts[p.name] = (nameCounts[p.name] || 0) + 1;
    });

    return projects.map((p, idx) => {
      const isDuplicateName = nameCounts[p.name] > 1;
      const shortId = (p._id || p.id || `idx-${idx}`).slice(-4);
      const displayName = isDuplicateName ? `${p.name} (ID: ${shortId})` : p.name;
      const hasBaseline = Boolean(p.baselineRunId);
      const isLive = p.sourceType === 'live_url';

      return {
        ...p,
        uniqueKey: p._id || p.id || `proj-${idx}`,
        displayName,
        hasBaseline,
        isLive
      };
    });
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return decoratedProjects;
    const q = search.toLowerCase();
    return decoratedProjects.filter(p =>
      p.displayName.toLowerCase().includes(q) ||
      (p._id && p._id.toLowerCase().includes(q))
    );
  }, [decoratedProjects, search]);

  const activeDecorated = decoratedProjects.find(
    p => (p._id || p.id) === (activeProject?._id || activeProject?.id)
  ) || decoratedProjects[0] || null;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium transition shadow-sm"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${activeDecorated?.hasBaseline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span className="font-semibold text-slate-100 truncate max-w-[150px] sm:max-w-[200px]">
            {activeDecorated?.displayName || 'Select Project'}
          </span>
          {activeDecorated?.isLive && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
              LIVE
            </span>
          )}
        </div>
        <ChevronDown size={14} className="text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md p-2 z-50 text-xs space-y-2 animate-in fade-in duration-100">
          {/* Search Bar */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
              autoFocus
            />
          </div>

          {/* Project List */}
          <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-slate-800/40">
            {filteredProjects.length === 0 ? (
              <div className="py-4 text-center text-slate-500 text-xs">
                No matching projects found.
              </div>
            ) : (
              filteredProjects.map((p) => {
                const isSelected = (activeProject?._id || activeProject?.id) === (p._id || p.id);
                return (
                  <button
                    key={p.uniqueKey}
                    onClick={() => {
                      onSelectProject(p);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between group ${
                      isSelected
                        ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${p.hasBaseline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <div className="min-w-0">
                        <span className="block truncate text-xs">{p.displayName}</span>
                        <span className="block text-[10px] text-slate-500 font-mono">
                          {p.detectedRoutes?.length || 0} routes • {p.isLive ? 'Live Deployment' : 'Docker Container'}
                        </span>
                      </div>
                    </div>

                    {isSelected && <Check size={14} className="text-indigo-400 shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenWizard?.();
              }}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
            >
              <Plus size={14} />
              <span>Connect New Project</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectSelector;
