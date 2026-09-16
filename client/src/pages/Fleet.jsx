import React, { useState, useEffect } from 'react';
import { Layers, Battery, Compass, CheckCircle, AlertTriangle, ShieldCheck, PenTool, Link2, Eye, Cpu, Radio, User } from 'lucide-react';
import { SkeletonCard } from '../components/shared/Skeleton';
import { batteryTier, batteryBg } from '../components/shared/utils';

function Fleet() {
  const [drones, setDrones] = useState([]);
  const [editingDrone, setEditingDrone] = useState(null);
  const [streamUrl, setStreamUrl] = useState('');
  // Without this, an empty `drones` array during the initial fetch rendered a
  // blank grid with no sign anything was loading. Set false only after the
  // mount effect resolves, not inside fetchDrones(): that also runs from
  // toggleMaintenance and handleUpdateStream, and must not flash the skeleton
  // back over already-loaded cards.
  const [loading, setLoading] = useState(true);

  const fetchDrones = async () => {
    try {
      const res = await fetch('/api/fleet/status');
      if (res.ok) {
        const data = await res.json();
        // Map field names if needed or use enriched fleet status
        setDrones(data.map(d => ({
          ...d,
          call_sign: d.callSign || d.call_sign,
          battery_level: d.battery !== undefined ? d.battery : d.battery_level,
          current_incident_id: d.currentMissionId !== undefined ? d.currentMissionId : d.current_incident_id
        })));
      } else {
        const fallbackRes = await fetch('/api/drones');
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          setDrones(fallbackData);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let ignore = false;
    const sync = async () => { if (!ignore) await fetchDrones(); };
    sync().finally(() => { if (!ignore) setLoading(false); });
    const interval = setInterval(sync, 2000);
    return () => { ignore = true; clearInterval(interval); };
  }, []);

  const toggleMaintenance = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'maintenance' ? 'idle' : 'maintenance';
    // Map idle back to Standby in next status if resolving
    const mappedStatus = nextStatus === 'idle' ? 'Standby' : 'maintenance';
    try {
      const res = await fetch(`/api/drones/${id}/maintenance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: mappedStatus })
      });
      if (res.ok) fetchDrones();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStream = async (e) => {
    e.preventDefault();
    if (!editingDrone) return;

    try {
      const res = await fetch(`/api/drones/${editingDrone.id}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: streamUrl })
      });
      if (res.ok) {
        setEditingDrone(null);
        setStreamUrl('');
        fetchDrones();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Close the stream modal on Escape. A modal that cannot be dismissed from
  // the keyboard traps anyone not using a mouse.
  useEffect(() => {
    if (!editingDrone) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setEditingDrone(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingDrone]);

  // Density: cards at p-4 in a gap-4 grid rather than p-5/gap-6. This is a
  // console — at 1080p that fits three columns with the diagnostics block
  // still readable, instead of two with dead space between them.
  const ROW = 'flex justify-between items-center';
  const KEY = 'flex items-center gap-1.5 text-muted';
  const VAL = 'text-text text-[11px] font-medium';
  const ICON = 'h-3.5 w-3.5 text-muted flex-shrink-0';
  const BTN = 'min-h-[44px] px-3 border rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-colors duration-150 flex items-center justify-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="bg-accent/10 p-2.5 rounded-xl border border-accent/30">
          <Layers className="h-6 w-6 text-accent" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-wide text-text">RAPID Operations Fleet</h2>
          <p className="text-xs text-muted font-mono mt-0.5">Control live fleet hardware states, diagnostic streams, and maintenance logs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [0, 1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)
        ) : drones.map((drone) => {
          const tier = batteryTier(drone.battery_level);

          const healthStatus = drone.status === 'maintenance'
            ? 'Maintenance'
            : drone.battery_level < 20
            ? 'Low battery'
            : 'Nominal';
          // Filled vs outline is the shape channel: a card in maintenance
          // reads as more urgent than one merely warning, without relying on
          // hue alone (DIRECTION.md section 3).
          const healthTone = healthStatus === 'Nominal' ? 'normal'
            : healthStatus === 'Maintenance' ? 'critical' : 'warning';

          const returnState = drone.returnStatus || (drone.battery_level > 30 ? 'SAFE' : 'CRITICAL');
          const returnTone = returnState === 'SAFE' ? 'normal'
            : returnState === 'RETURN_RECOMMENDED' ? 'warning' : 'critical';

          const cameraModeStr = !['Standby', 'Charging', 'maintenance'].includes(drone.status)
            ? (drone.camera_mode || 'Auto (Day/Night)')
            : 'Standby / Lens Docked';

          const statusTone = drone.status === 'Standby' ? null
            : drone.status === 'maintenance' ? 'critical' : 'normal';

          return (
            <div
              key={drone.id}
              className={`bg-surface rounded-2xl p-4 border transition-colors duration-150 ${
                drone.status === 'maintenance' ? 'border-status-critical/30' : 'border-border'
              }`}
            >
              <div className="flex justify-between items-start mb-3 gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-base text-text tracking-wide truncate">{drone.call_sign}</h3>
                  <span className="text-[10px] font-mono text-muted">{drone.model}</span>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {statusTone ? (
                    <span className={`status-badge status-badge--${statusTone} status-badge--outline font-mono uppercase`}>
                      <span className={`status-dot status-dot--${statusTone}`} aria-hidden="true" />
                      {drone.status}
                    </span>
                  ) : (
                    <span className="status-badge border-border text-muted font-mono uppercase">{drone.status}</span>
                  )}
                  {drone.is_hardware_active && (
                    <span className="text-[9px] font-mono text-status-normal uppercase font-bold tracking-widest">
                      Live HW link
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs font-mono mb-1 text-muted">
                  <span>Battery reserve</span>
                  <span className="font-bold text-text tabular-nums">{drone.battery_level.toFixed(0)}%</span>
                </div>
                <div
                  className="w-full h-2 bg-border rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={Math.round(drone.battery_level)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${drone.call_sign} battery`}
                >
                  <div style={{ width: `${drone.battery_level}%` }} className={`h-full ${batteryBg(tier)} transition-[width] duration-500`}></div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs font-mono text-muted border-t border-border pt-3 mb-3">
                <div className={ROW}>
                  <span className={KEY}><CheckCircle className={ICON} aria-hidden="true" /> System health</span>
                  <span className={`status-badge status-badge--${healthTone} ${healthTone === 'critical' ? 'status-badge--filled' : 'status-badge--outline'} uppercase`}>
                    {healthStatus}
                  </span>
                </div>

                <div className={ROW}>
                  <span className={KEY}><Radio className={ICON} aria-hidden="true" /> Active mission</span>
                  <span className={VAL}>{drone.current_incident_id ? 'Dispatched' : 'Standby at base'}</span>
                </div>

                <div className={ROW}>
                  <span className={KEY}><Compass className={ICON} aria-hidden="true" /> Flight time</span>
                  <span className={`${VAL} tabular-nums`}>
                    {!['Standby', 'Charging', 'maintenance'].includes(drone.status) ? '03m 42s' : '00m 00s'}
                  </span>
                </div>

                <div className={ROW}>
                  <span className={KEY}><Eye className={ICON} aria-hidden="true" /> Camera</span>
                  <span className={VAL} title={drone.stream_url || 'Unlinked'}>
                    {drone.stream_url ? `Online (${cameraModeStr})` : 'Offline'}
                  </span>
                </div>

                <div className={ROW}>
                  <span className={KEY}><Compass className={ICON} aria-hidden="true" /> GPS lock</span>
                  <span className={`${VAL} tabular-nums`}>Locked, 14 satellites</span>
                </div>

                <div className="flex justify-between pl-5 text-[10px] text-muted">
                  <span>Coordinates</span>
                  <span className="tabular-nums">{drone.latitude.toFixed(4)}, {drone.longitude.toFixed(4)}</span>
                </div>

                <div className={ROW}>
                  <span className={KEY}><Battery className={ICON} aria-hidden="true" /> Return feasibility</span>
                  <span className={`status-badge status-badge--${returnTone} ${returnTone === 'critical' ? 'status-badge--filled' : 'status-badge--outline'} uppercase`}>
                    {returnState}
                  </span>
                </div>

                <div className={ROW}>
                  <span className={KEY}><Compass className={ICON} aria-hidden="true" /> Distance from base</span>
                  <span className={`${VAL} tabular-nums`}>
                    {drone.distToBaseKm !== undefined ? `${drone.distToBaseKm} km` : '0.00 km'}
                  </span>
                </div>

                <div className={ROW}>
                  <span className={KEY}><Cpu className={ICON} aria-hidden="true" /> AI classification</span>
                  <span className={VAL}>
                    {!['Standby', 'Charging', 'maintenance'].includes(drone.status) ? 'Monitoring' : 'Idle'}
                  </span>
                </div>

                <div className={ROW}>
                  <span className={KEY}><User className={ICON} aria-hidden="true" /> Controller</span>
                  <span className={VAL}>Officer Ananya Fernandes</span>
                </div>

                <div className="flex justify-between text-[10px] pt-1.5 text-muted border-t border-border">
                  <span>ESP32 hardware ID</span>
                  <span className="font-mono">{drone.hardware_id || 'Not linked'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => toggleMaintenance(drone.id, drone.status)}
                  disabled={!['Standby', 'maintenance'].includes(drone.status)}
                  className={`${BTN} ${
                    drone.status === 'maintenance'
                      ? 'bg-status-normal/10 border-status-normal text-status-normal hover:bg-status-normal/20'
                      : 'bg-status-critical/10 border-status-critical text-status-critical hover:bg-status-critical/20 disabled:opacity-40'
                  }`}
                >
                  <PenTool className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{drone.status === 'maintenance' ? 'Return to duty' : 'Maintenance'}</span>
                </button>
                <button
                  onClick={() => {
                    setEditingDrone(drone);
                    setStreamUrl(drone.stream_url || '');
                  }}
                  className={`${BTN} bg-page border-border-strong text-text hover:bg-border`}
                >
                  <Link2 className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                  <span>Mount stream</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editingDrone && (
        <div
          className="fixed inset-0 bg-text/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingDrone(null); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mount-stream-title"
            className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 shadow-sm"
          >
            <h3 id="mount-stream-title" className="font-bold text-sm uppercase tracking-wider text-text border-b border-border pb-3 mb-4">
              Mount livestream feed on {editingDrone.call_sign}
            </h3>

            <form onSubmit={handleUpdateStream} className="space-y-4">
              <div>
                <label htmlFor="stream-url" className="block text-xs font-mono uppercase text-muted mb-1">
                  Livestream feed URL (HLS or WebRTC signaller)
                </label>
                <input
                  id="stream-url"
                  type="url"
                  required
                  autoFocus
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                  placeholder="e.g. https://domain.com/live/master.m3u8"
                  className="w-full min-h-[44px] bg-page text-text placeholder:text-muted border border-border-strong rounded-xl px-3 py-2.5 text-xs outline-none transition-colors duration-150 focus:border-accent focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDrone(null)}
                  className="min-h-[44px] px-4 border border-border-strong text-muted hover:text-text rounded-xl text-xs font-mono transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 bg-accent text-on-solid font-medium rounded-xl text-xs font-mono uppercase tracking-wider transition-colors duration-150 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Mount stream link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Fleet;
