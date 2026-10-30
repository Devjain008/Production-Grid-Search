import React, { useState, useMemo, useEffect } from 'react';
import { Search, BookOpen, Sparkles, Filter, Hash, Check, Lightbulb, ExternalLink } from 'lucide-react';
import { GLOSSARY } from '../content/glossary';
import { useHelp } from '../content/HelpContext';

export default function GlossaryPage() {
  const { currentPage, expertMode } = useHelp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedLetter, setSelectedLetter] = useState('ALL');
  const [onlyCurrentPage, setOnlyCurrentPage] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Extract all entries sorted A-Z
  const allEntries = useMemo(() => {
    return Object.values(GLOSSARY).sort((a, b) => a.title.localeCompare(b.title));
  }, []);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set(allEntries.map(e => e.category));
    return ['ALL', ...Array.from(set)];
  }, [allEntries]);

  // Unique starting letters
  const letters = useMemo(() => {
    const set = new Set(allEntries.map(e => e.title.charAt(0).toUpperCase()));
    return ['ALL', ...Array.from(set).sort()];
  }, [allEntries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return allEntries.filter(entry => {
      // Current page filter
      if (onlyCurrentPage && currentPage) {
        if (!entry.tags || !entry.tags.includes(currentPage)) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'ALL' && entry.category !== selectedCategory) {
        return false;
      }

      // Letter filter
      if (selectedLetter !== 'ALL' && entry.title.charAt(0).toUpperCase() !== selectedLetter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = entry.title.toLowerCase().includes(q);
        const matchesSimple = entry.simple.toLowerCase().includes(q);
        const matchesWhy = entry.why.toLowerCase().includes(q);
        const matchesTech = entry.technical?.toLowerCase().includes(q);
        const matchesId = entry.id.toLowerCase().includes(q);
        return matchesTitle || matchesSimple || matchesWhy || matchesTech || matchesId;
      }

      return true;
    });
  }, [allEntries, searchQuery, selectedCategory, selectedLetter, onlyCurrentPage, currentPage]);

  const handleCopyLink = (id) => {
    const url = `${window.location.origin}${window.location.pathname}#term-${id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      });
    }
  };

  // Check URL hash on mount to jump to anchor
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-cyan-400');
          setTimeout(() => el.classList.remove('ring-2', 'ring-cyan-400'), 2500);
        }, 150);
      }
    }
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-cyan-400" />
            <span>Interactive Technical &amp; NFR Glossary</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Plain-language definitions, everyday analogies, real-world business impacts, and rule-of-thumb benchmarks for non-technical stakeholders and engineers.
          </p>
        </div>

        {currentPage && (
          <button
            type="button"
            onClick={() => setOnlyCurrentPage(!onlyCurrentPage)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              onlyCurrentPage
                ? 'bg-cyan-500 text-black shadow-md'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Used on "{currentPage.toUpperCase()}" page</span>
          </button>
        )}
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search terms, concepts, metrics, strategies (e.g. p95, throughput, batching, event loop)..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap mr-1">Categories:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat === 'ALL' ? 'All Categories' : cat}
            </button>
          ))}
        </div>

        {/* A-Z Index Bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-1 border-t border-slate-800/80 scrollbar-thin">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap mr-1">A-Z:</span>
          {letters.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => setSelectedLetter(letter)}
              className={`w-6 h-6 rounded text-[11px] font-mono font-bold flex items-center justify-center transition flex-shrink-0 ${
                selectedLetter === letter
                  ? 'bg-cyan-500 text-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Terms Count */}
      <div className="text-xs text-slate-400 px-1 flex items-center justify-between">
        <span>Showing {filteredEntries.length} of {allEntries.length} technical terms</span>
        {onlyCurrentPage && (
          <span className="text-cyan-400 font-mono text-[11px]">Filtered to active screen: {currentPage}</span>
        )}
      </div>

      {/* Terms Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            id={`term-${entry.id}`}
            className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 space-y-3 transition duration-150 shadow-md relative"
          >
            {/* Top Bar */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 inline-block mb-1">
                  {entry.category}
                </span>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{entry.title}</span>
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">id: {entry.id}</span>
              </div>

              <button
                type="button"
                onClick={() => handleCopyLink(entry.id)}
                title="Copy anchor link to this term"
                className="text-slate-500 hover:text-cyan-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
                aria-label={`Copy link for ${entry.title}`}
              >
                {copiedId === entry.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Hash className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* In simple words */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>In simple words</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-normal">
                {entry.simple}
              </p>
            </div>

            {/* Why it matters here */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Why it matters
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {entry.why}
              </p>
            </div>

            {/* Rule of thumb */}
            {entry.goodHint && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200">Rule of thumb: </strong>
                  <span>{entry.goodHint}</span>
                </div>
              </div>
            )}

            {/* Technical Detail (Formula / Spec) */}
            {entry.technical && (
              <div className="pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 leading-relaxed">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5 font-sans">Technical specification:</span>
                <code>{entry.technical}</code>
              </div>
            )}

            {/* Screen tags */}
            {entry.tags && entry.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <span className="text-[10px] text-slate-500">Used on:</span>
                {entry.tags.map(t => (
                  <span key={t} className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
