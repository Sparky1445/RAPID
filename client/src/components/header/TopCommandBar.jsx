import React, { useState } from 'react';
import { Shield, Sun, Moon } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useRapidStore from '../../store/rapidStore';
import { getTheme, toggleTheme } from '../../store/theme';

const STAT_LABEL = 'text-[10px] uppercase text-muted font-bold tracking-wide';

export default function TopCommandBar() {
  const stats = useRapidStore(useShallow(s => s.getVisibleStats()));
  const currentTime = useRapidStore(s => s.currentTime);
  const wsConnected = useRapidStore(s => s.wsConnected);
  const activeState = useRapidStore(s => s.activeState);
  const states = useRapidStore(s => s.states);
  const activeStateName = states.find(s => s.code === activeState)?.name || 'GOA';
  const [theme, setThemeState] = useState(getTheme);

  return (
    // pl-16 below lg leaves room for the shell's drawer toggle, which is fixed
    // at the same corner; z-40 keeps this bar under it rather than over it.
    <header className="min-h-16 bg-surface border-b border-border pl-16 pr-4 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 select-none relative z-40 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="bg-accent/10 p-2 rounded-lg border border-accent/30">
          <Shield className="h-6 w-6 text-accent" aria-hidden="true" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold tracking-wider text-text text-base">RAPID</h1>
            <span className="text-[10px] font-mono border border-accent/30 px-1.5 py-0.5 rounded text-accent bg-accent/10 uppercase tracking-widest">v2.0</span>
          </div>
          <p className="text-[10px] text-muted font-mono tracking-wide">Rapid Aerial Police Incident Dispatch</p>
        </div>
      </div>

      <div className="hidden xl:flex flex-col items-center">
        <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-text">Emergency command centre</span>
        <span className="text-[10px] font-mono text-muted tracking-wider">{activeStateName} Police HQ</span>
      </div>

      <div className="flex items-center gap-4 lg:gap-5 font-mono text-xs text-muted">
        <div className="hidden sm:flex flex-col items-end">
          <span className={STAT_LABEL}>In the air</span>
          <span className="text-text font-bold flex items-center gap-1.5 tabular-nums">
            {/* Live-telemetry heartbeat: motion says "still counting right
                now", a static dot can't. Zero missions gets no heartbeat —
                there's nothing live to indicate. Guarded globally for
                prefers-reduced-motion in index.css. */}
            <span className={`h-2 w-2 rounded-full ${stats.activeMissions > 0 ? 'bg-status-normal animate-pulse' : 'bg-border-strong'}`} aria-hidden="true"></span>
            {stats.activeMissions}
          </span>
        </div>
        <div className="hidden sm:flex flex-col items-end">
          <span className={STAT_LABEL}>Standby</span>
          <span className="text-text font-bold tabular-nums">{stats.availableFleet}</span>
        </div>
        <div className="hidden md:flex flex-col items-end">
          <span className={STAT_LABEL}>Link</span>
          <span className={`font-bold ${wsConnected ? 'text-status-normal' : 'text-status-warning'}`}>{wsConnected ? 'Live' : 'Polling'}</span>
        </div>
        <div className="hidden md:flex flex-col items-end">
          <span className={STAT_LABEL}>Health</span>
          <span className={`font-bold ${stats.healthStatus === 'NOMINAL' ? 'text-status-normal' : 'text-status-critical'}`}>{stats.healthStatus}</span>
        </div>
        <div className="sm:border-l sm:border-border sm:pl-4 flex flex-col items-end">
          <span className={STAT_LABEL}>Time</span>
          <span className="text-text font-bold tracking-widest text-xs tabular-nums">
            {(currentTime instanceof Date ? currentTime : new Date(currentTime)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </span>
        </div>
        <button
          onClick={() => setThemeState(toggleTheme())}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-lg border border-border-strong text-muted hover:text-accent hover:border-accent transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}
