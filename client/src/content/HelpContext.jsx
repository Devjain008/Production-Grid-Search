import React, { createContext, useContext, useState, useEffect } from 'react';

const HelpContext = createContext(null);

export function HelpProvider({ children, onNavigateTab }) {
  // Simple Mode vs Expert Mode
  const [expertMode, setExpertModeState] = useState(() => {
    try {
      return localStorage.getItem('evolve_expert_mode') === 'true';
    } catch (e) {
      return false;
    }
  });

  // Always show '?' help icons toggle (in Expert mode, can hide until hover unless enabled)
  const [alwaysShowIcons, setAlwaysShowIconsState] = useState(() => {
    try {
      const stored = localStorage.getItem('evolve_always_show_icons');
      return stored !== null ? stored === 'true' : true;
    } catch (e) {
      return true;
    }
  });

  // Active popover ID to guarantee ONLY ONE popover is open at any time
  const [activePopoverId, setActivePopoverId] = useState(null);

  // Current page tracking to support "Used on this page" glossary filtering
  const [currentPage, setCurrentPage] = useState('overview');

  const setExpertMode = (val) => {
    setExpertModeState(val);
    try {
      localStorage.setItem('evolve_expert_mode', val ? 'true' : 'false');
    } catch (e) {}
  };

  const setAlwaysShowIcons = (val) => {
    setAlwaysShowIconsState(val);
    try {
      localStorage.setItem('evolve_always_show_icons', val ? 'true' : 'false');
    } catch (e) {}
  };

  const navigateToGlossary = (termId) => {
    setActivePopoverId(null);
    if (onNavigateTab) {
      onNavigateTab('glossary');
    }
    if (termId) {
      setTimeout(() => {
        const el = document.getElementById(`term-${termId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-cyan-400', 'ring-offset-2', 'ring-offset-slate-900');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-cyan-400', 'ring-offset-2', 'ring-offset-slate-900');
          }, 2500);
        }
      }, 150);
    }
  };

  return (
    <HelpContext.Provider
      value={{
        expertMode,
        setExpertMode,
        alwaysShowIcons,
        setAlwaysShowIcons,
        activePopoverId,
        setActivePopoverId,
        currentPage,
        setCurrentPage,
        navigateToGlossary
      }}
    >
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const ctx = useContext(HelpContext);
  if (!ctx) {
    // Graceful fallback if rendered outside provider
    return {
      expertMode: false,
      setExpertMode: () => {},
      alwaysShowIcons: true,
      setAlwaysShowIcons: () => {},
      activePopoverId: null,
      setActivePopoverId: () => {},
      currentPage: 'overview',
      setCurrentPage: () => {},
      navigateToGlossary: () => {}
    };
  }
  return ctx;
}
