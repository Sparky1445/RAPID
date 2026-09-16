import React from 'react';
import { AlertOctagon, Radio, Battery, MapPinned, Plus, Wrench, AlertTriangle } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useRapidStore from '../../store/rapidStore';
import { batteryColor, batteryTier } from '../shared/utils';

// Severity decides which way up a row sorts, and a filled badge means
// critical. Reading the hue is never the only way to tell them apart
// (DIRECTION.md section 3).
const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
const severityTone = (s) =>
  s === 'critical' ? 'critical' : s === 'high' ? 'urgent' : s === 'medium' ? 'warning' : 'normal';

export default function LeftSidebar() {
  const activeState = useRapidStore(s => s.activeState);
  const states = useRapidStore(s => s.states);
  const setActiveState = useRapidStore(s => s.setActiveState);

  const drones = useRapidStore(useShallow(s => s.getVisibleDrones()));
  const incidents = useRapidStore(useShallow(s => s.getVisibleIncidents()));
  const selectedDroneId = useRapidStore(s => s.selectedDroneId);
  const selectedIncidentId = useRapidStore(s => s.selectedIncidentId);
  const selectDrone = useRapidStore(s => s.selectDrone);
  const selectIncident = useRapidStore(s => s.selectIncident);
  const setShowManualForm = useRapidStore(s => s.setShowManualForm);
  const demoGenerating = useRapidStore(s => s.demoGenerating);
  const demoError = useRapidStore(s => s.demoError);
  const generateSimulatedEmergency = useRapidStore(s => s.generateSimulatedEmergency);

  const activeIncidentsList = incidents
    .filter(i => ['reported', 'dispatched', 'active', 'resolved'].includes(i.status))
    .sort((a, b) => {
      const rank = (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9);
      if (rank !== 0) return rank;
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

  return (
    <aside className="order-2 lg:order-none lg:col-span-3 border-t lg:border-t-0 lg:border-r border-border bg-surface flex flex-col min-h-0 z-20">
      {/* State switcher */}
      {states.length > 1 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-page">
          <MapPinned className="h-3.5 w-3.5 text-muted flex-shrink-0" aria-hidden="true" />
          <div className="flex flex-1 gap-1.5" role="group" aria-label="Region">
            {states.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveState(s.code)}
                aria-pressed={activeState === s.code}
                className={`flex-1 min-h-[44px] text-[10px] font-mono font-bold uppercase tracking-wider px-2 rounded-lg border transition-colors duration-150 ${FOCUS} ${
                  activeState === s.code
                    ? 'bg-accent text-on-solid border-accent'
                    : 'bg-surface border-border-strong text-muted hover:text-text'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border">
        <div className="flex items-center gap-1.5">
          <AlertOctagon className="h-4 w-4 text-status-critical" aria-hidden="true" />
          <h2 className="font-bold text-[11px] uppercase tracking-wider text-text">Incoming calls</h2>
        </div>
        <button
          onClick={() => setShowManualForm(true)}
          className={`min-h-[44px] px-3 text-[10px] font-mono uppercase tracking-wider bg-page hover:bg-border text-text border border-border-strong rounded-lg flex items-center gap-1.5 transition-colors duration-150 ${FOCUS}`}
        >
          <Plus className="h-3 w-3" aria-hidden="true" />
          Log call
        </button>
      </div>

      {/* Incidents list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeIncidentsList.map((inc) => {
          const isSelected = selectedIncidentId === inc.id;
          const tone = severityTone(inc.severity);
          return (
            // A button, not a clickable div: this is the only way to reach an
            // incident from the keyboard.
            <button
              key={inc.id}
              type="button"
              onClick={() => selectIncident(inc)}
              aria-pressed={isSelected}
              className={`w-full text-left p-3 rounded-xl border transition-colors duration-150 ${FOCUS} ${
                isSelected ? 'bg-accent/10 border-accent' : 'bg-page border-border-strong hover:border-text'
              }`}
            >
              <div className="flex justify-between items-start gap-2 mb-1">
                <span className={`status-badge status-badge--${tone} ${tone === 'critical' ? 'status-badge--filled' : 'status-badge--outline'} font-mono uppercase`}>
                  {inc.severity}
                </span>
                <span className="text-[10px] text-muted font-mono tabular-nums pt-0.5">
                  {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h3 className="text-xs font-bold text-text truncate">{inc.title}</h3>
              <div className="flex justify-between items-center mt-2 text-[10px] font-mono pt-2 border-t border-border">
                <span className="text-muted">Assigned</span>
                {inc.assigned_drone_id
                  ? <span className="text-text font-bold">{drones.find(d => d.id === inc.assigned_drone_id)?.call_sign || 'UAV'}</span>
                  : <span className="text-muted">Not yet</span>}
              </div>
            </button>
          );
        })}
        {activeIncidentsList.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <Radio className="h-8 w-8 text-muted mb-2" aria-hidden="true" />
            <p className="text-xs font-mono text-muted">No open calls</p>
          </div>
        )}
      </div>

      {/* Simulation trigger */}
      <div className="p-3 border-t border-border">
        <div className="bg-page border border-border p-3 rounded-2xl">
          <span className="text-[10px] font-mono text-muted flex items-center gap-1.5 uppercase tracking-wider mb-2 font-bold">
            <Wrench className="h-3 w-3" aria-hidden="true" />
            Training mode
          </span>
          <button
            onClick={generateSimulatedEmergency}
            disabled={demoGenerating}
            className={`w-full min-h-[44px] bg-accent text-on-solid hover:opacity-90 rounded-xl text-xs font-bold uppercase tracking-wider transition-opacity duration-150 disabled:opacity-60 ${FOCUS}`}
          >
            {demoGenerating ? 'Generating…' : 'Simulate an emergency'}
          </button>
          {demoError && (
            <div role="alert" className="mt-2 p-2 bg-status-critical/10 border border-status-critical/40 rounded-lg text-[10px] font-mono text-status-critical flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>{demoError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Fleet Grid */}
      <div className="p-3 border-t border-border">
        <span className="text-[10px] font-mono text-muted block uppercase tracking-wider mb-2 font-bold">
          Rakshak fleet ({drones.length})
        </span>
        <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
          {drones.map((d) => {
            const tier = batteryTier(d.battery_level);
            const dotTone = d.status === 'Standby' ? 'muted'
              : d.status === 'maintenance' ? 'critical' : 'normal';
            return (
              <button
                key={d.id}
                onClick={() => selectDrone(d)}
                aria-pressed={selectedDroneId === d.id}
                className={`p-2 rounded-xl border text-left flex flex-col gap-1 transition-colors duration-150 ${FOCUS} ${
                  selectedDroneId === d.id ? 'bg-accent/10 border-accent' : 'bg-page border-border-strong hover:border-text'
                }`}
              >
                <div className="flex justify-between items-center w-full gap-1">
                  <span className="text-[10px] font-bold text-text truncate">{d.call_sign}</span>
                  {dotTone === 'muted'
                    ? <span className="h-2 w-2 rounded-full bg-muted flex-shrink-0" aria-hidden="true" />
                    : <span className={`status-dot status-dot--${dotTone}`} aria-hidden="true" />}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <Battery className={`h-3 w-3 ${batteryColor(tier)}`} aria-hidden="true" />
                  <span className={`${batteryColor(tier)} tabular-nums`}>{d.battery_level.toFixed(0)}%</span>
                </div>
                <span className="text-[9px] font-mono text-muted uppercase truncate">{d.status}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
