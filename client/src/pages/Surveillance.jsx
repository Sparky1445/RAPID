import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, MapPinned, Play, Pause, Square, RefreshCw, Radar } from 'lucide-react';
import { SkeletonCard } from '../components/shared/Skeleton';

const PATTERNS = ['circular', 'linear', 'grid', 'random'];

// A badge tone plus whether it is filled. Filled reads heavier than
// outline, so "absolute" and "aborted" stand apart from the rest without
// depending on anyone reading red correctly (DIRECTION.md section 3).
const RESTRICTION_BADGE = {
  absolute: 'status-badge--critical status-badge--filled',
  conditional: 'status-badge--urgent status-badge--outline',
  advisory: 'status-badge--warning status-badge--outline'
};

const MISSION_BADGE = {
  active: 'status-badge--normal status-badge--outline',
  paused: 'status-badge--warning status-badge--outline',
  planned: 'border-border text-muted',
  aborted: 'status-badge--critical status-badge--filled',
  complete: 'border-border-strong text-text'
};

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const SELECT = `w-full min-h-[44px] bg-page text-text border border-border-strong rounded-xl px-3 py-2 text-xs outline-none transition-colors duration-150 focus:border-accent focus:ring-2 focus:ring-accent`;
const MISSION_BTN = `flex-1 min-h-[44px] px-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 transition-colors duration-150 ${FOCUS}`;

function Surveillance() {
  const [states, setStates] = useState([]);
  const [activeState, setActiveState] = useState('GA');
  const [zones, setZones] = useState([]);
  const [missions, setMissions] = useState([]);
  const [drones, setDrones] = useState([]);
  const [bases, setBases] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [selectedDroneId, setSelectedDroneId] = useState('');
  const [pattern, setPattern] = useState('circular');
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // Without this, "No patrol missions for this state yet" showed during every
  // fetch, not only when a state genuinely has none. refresh is a useCallback
  // keyed on activeState, so this also toggles on a state switch: a different
  // dataset, not just mount.
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [zonesRes, missionsRes, dronesRes, basesRes] = await Promise.all([
        fetch(`/api/airspace/zones?state=${activeState}`),
        fetch(`/api/surveillance/missions?state=${activeState}`),
        fetch('/api/drones'),
        fetch(`/api/geo/bases?state=${activeState}&limit=200`)
      ]);
      if (zonesRes.ok) setZones(await zonesRes.json());
      if (missionsRes.ok) setMissions(await missionsRes.json());
      if (dronesRes.ok) setDrones(await dronesRes.json());
      if (basesRes.ok) setBases((await basesRes.json()).bases || []);
    } catch (err) {
      console.error('Surveillance refresh error:', err);
    }
  }, [activeState]);

  useEffect(() => {
    let ignore = false;
    const sync = async () => {
      if (ignore) return;
      setLoading(true);
      try { await refresh(); } finally { if (!ignore) setLoading(false); }
    };
    sync();
    return () => { ignore = true; };
  }, [refresh]);

  useEffect(() => {
    let ignore = false;
    const poll = async () => { if (!ignore) await refresh(); };
    const interval = setInterval(poll, 3000);
    return () => { ignore = true; clearInterval(interval); };
  }, [refresh]);

  useEffect(() => {
    fetch('/api/geo/states').then(r => r.ok ? r.json() : []).then(setStates).catch(() => {});
  }, []);

  // Scoped to the active state's own bases — a drone based in another
  // state can't meaningfully patrol this one (matches the same-state
  // rule the server now enforces on both mission start and handoff).
  const baseIdsForState = new Set(bases.map(b => b.id));
  const availableDrones = drones.filter(d => ['Standby', 'Charging'].includes(d.status) && baseIdsForState.has(d.base_id));

  const showFeedback = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleStartMission = async (e) => {
    e.preventDefault();
    if (!selectedZoneId || !selectedDroneId) {
      showFeedback('error', 'Select both a zone and a drone.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/surveillance/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'patrol', zoneId: selectedZoneId, state: activeState, patrolPattern: pattern, droneId: selectedDroneId })
      });
      const data = await res.json();
      if (!res.ok) { showFeedback('error', data.error || 'Failed to start mission.'); return; }
      showFeedback('ok', 'Patrol mission started.');
      setSelectedZoneId(''); setSelectedDroneId('');
      refresh();
    } catch (err) {
      showFeedback('error', 'Network error — mission not started.');
    } finally {
      setSubmitting(false);
    }
  };

  const missionAction = async (missionId, action) => {
    try {
      const res = await fetch(`/api/surveillance/missions/${missionId}/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (!res.ok) { showFeedback('error', data.error || `Failed to ${action}.`); return; }
      showFeedback('ok', `Mission ${action} succeeded.`);
      refresh();
    } catch (err) {
      showFeedback('error', 'Network error.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-accent/10 p-2.5 rounded-xl border border-accent/30">
            <Radar className="h-6 w-6 text-accent" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-wide text-text">Patrols and protected airspace</h2>
            <p className="text-xs text-muted font-mono mt-0.5">Restricted zones, patrols in progress, and who is flying them.</p>
          </div>
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Region">
          {states.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveState(s.code)}
              aria-pressed={activeState === s.code}
              className={`min-h-[44px] text-[10px] font-mono font-bold uppercase tracking-wider px-3 rounded-lg border transition-colors duration-150 ${FOCUS} ${
                activeState === s.code ? 'bg-accent border-accent text-on-solid' : 'bg-surface border-border-strong text-muted hover:text-text'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div role="status" className={`p-3 rounded-xl text-xs font-mono font-bold border ${feedback.type === 'ok' ? 'bg-status-normal/10 border-status-normal/40 text-status-normal' : 'bg-status-critical/10 border-status-critical/40 text-status-critical'}`}>
          {feedback.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Airspace Zones */}
        <div className="bg-surface rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="h-4 w-4 text-muted" aria-hidden="true" />
            <h3 className="font-bold text-sm text-text uppercase tracking-wider">Protected zones</h3>
          </div>
          <div className="space-y-2">
            {zones.map(z => (
              <div key={z.id} className="p-3 rounded-xl border border-border bg-page flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-text truncate">{z.name}</div>
                  <div className="text-[10px] text-muted font-mono uppercase">{z.type.replace(/_/g, ' ')}</div>
                </div>
                <span className={`status-badge font-mono uppercase flex-shrink-0 ${RESTRICTION_BADGE[z.restriction_level] || RESTRICTION_BADGE.advisory}`}>
                  {z.restriction_level}
                </span>
              </div>
            ))}
            {zones.length === 0 && <p className="text-xs text-muted font-mono text-center py-4">No protected zones here.</p>}
          </div>

          {/* Start New Patrol */}
          <form onSubmit={handleStartMission} className="mt-5 pt-5 border-t border-border space-y-3">
            <span className="text-[11px] font-mono text-muted uppercase tracking-wider font-bold block">Send a drone on patrol</span>
            <div>
              <label htmlFor="patrol-zone" className="sr-only">Zone</label>
              <select id="patrol-zone" value={selectedZoneId} onChange={e => setSelectedZoneId(e.target.value)} className={SELECT}>
                <option value="">Choose a zone…</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="patrol-drone" className="sr-only">Drone</label>
              <select id="patrol-drone" value={selectedDroneId} onChange={e => setSelectedDroneId(e.target.value)} className={SELECT}>
                <option value="">Choose a drone…</option>
                {availableDrones.map(d => <option key={d.id} value={d.id}>{d.call_sign} ({d.battery_level.toFixed(0)}%)</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="patrol-pattern" className="sr-only">Patrol pattern</label>
              <select id="patrol-pattern" value={pattern} onChange={e => setPattern(e.target.value)} className={SELECT}>
                {PATTERNS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)} pattern</option>)}
              </select>
            </div>
            <button type="submit" disabled={submitting} className={`w-full min-h-[44px] bg-accent text-on-solid rounded-xl text-xs font-bold uppercase tracking-wider transition-opacity duration-150 hover:opacity-90 disabled:opacity-50 ${FOCUS}`}>
              {submitting ? 'Starting…' : 'Start patrol'}
            </button>
          </form>
        </div>

        {/* Missions */}
        <div className="bg-surface rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-2 mb-4">
            <MapPinned className="h-4 w-4 text-muted" aria-hidden="true" />
            <h3 className="font-bold text-sm text-text uppercase tracking-wider">Patrols</h3>
          </div>
          <div className="space-y-3">
            {loading ? (
              [0, 1, 2].map(i => <SkeletonCard key={i} />)
            ) : missions.map(m => {
              const drone = drones.find(d => d.id === m.current_drone_id);
              return (
                <div key={m.id} className="p-3 rounded-xl border border-border bg-page">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-text truncate">{drone ? drone.call_sign : 'Unassigned'} · {m.patrol_pattern}</span>
                    <span className={`status-badge font-mono uppercase flex-shrink-0 ${MISSION_BADGE[m.status] || MISSION_BADGE.planned}`}>{m.status}</span>
                  </div>
                  <div className="text-[10px] text-muted font-mono mb-2 tabular-nums">Waypoint {m.current_waypoint_index + 1} of {m.waypoints.length} · {m.mission_logs.length} log entries</div>
                  <div className="flex gap-1.5">
                    {m.status === 'active' && (
                      <>
                        <button onClick={() => missionAction(m.id, 'pause')} className={`${MISSION_BTN} bg-surface border border-border-strong text-text hover:bg-border`}><Pause className="h-3 w-3" aria-hidden="true" /> Pause</button>
                        <button onClick={() => missionAction(m.id, 'handoff')} className={`${MISSION_BTN} bg-surface border border-border-strong text-text hover:bg-border`}><RefreshCw className="h-3 w-3" aria-hidden="true" /> Hand off</button>
                      </>
                    )}
                    {m.status === 'paused' && (
                      <button onClick={() => missionAction(m.id, 'resume')} className={`${MISSION_BTN} bg-surface border border-border-strong text-text hover:bg-border`}><Play className="h-3 w-3" aria-hidden="true" /> Resume</button>
                    )}
                    {['active', 'paused'].includes(m.status) && (
                      <button onClick={() => missionAction(m.id, 'abort')} className={`${MISSION_BTN} bg-status-critical border border-status-critical text-on-solid hover:opacity-90`}><Square className="h-3 w-3" aria-hidden="true" /> Stop</button>
                    )}
                  </div>
                </div>
              );
            })}
            {!loading && missions.length === 0 && <p className="text-xs text-muted font-mono text-center py-4">No patrols running here yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Surveillance;
