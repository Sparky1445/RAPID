import React from 'react';
import {
  Activity, Camera, Clock, BarChart2, Sliders, X, Sun, Moon,
  Maximize2, Mic, Volume2, Radio, Zap, Film, Lock, Image as ImageIcon,
  Map as MapIcon, ListChecks, Search, Gamepad2, AlertTriangle
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import useRapidStore from '../../store/rapidStore';
import { haversineDistance } from '../../config/geoConfig';
import {
  ACTIVE_STATUSES, FLYING_STATUSES,
  formatDuration, formatEtaShort, batteryColor, batteryBg, batteryTier
} from '../shared/utils';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const CARD = 'bg-page border border-border p-3 rounded-2xl';
const SECTION = 'text-[11px] font-mono text-muted uppercase tracking-wider font-bold flex items-center gap-1.5 mb-2';
const KEY = 'text-muted';
const VAL = 'text-text font-medium';
// Every command in this panel moves a real aircraft, so none of them is a
// 24px target. 44px is the floor even in a dense rail.
const CMD = `min-h-[44px] px-2 rounded-xl border font-bold uppercase tracking-wider text-[10px] font-mono transition-colors duration-150 disabled:opacity-40 ${FOCUS}`;
const CMD_QUIET = `${CMD} bg-surface border-border-strong text-text hover:bg-border`;

// Tailwind reads class names as literal strings out of the source. A template
// like `bg-status-${tone}/10` compiles to nothing at all, so tinted panels are
// looked up here instead of built by interpolation.
const TONE_PANEL = {
  normal: 'bg-status-normal/10 border-status-normal/40 text-status-normal',
  warning: 'bg-status-warning/10 border-status-warning/40 text-status-warning',
  urgent: 'bg-status-urgent/10 border-status-urgent/40 text-status-urgent',
  critical: 'bg-status-critical/10 border-status-critical/40 text-status-critical',
};

export default function MissionControlPanel() {
  const selectedDrone = useRapidStore(s => s.getSelectedDrone());
  const selectedIncident = useRapidStore(s => s.getSelectedIncident());
  const incidents = useRapidStore(s => s.incidents);
  const drones = useRapidStore(useShallow(s => s.getVisibleDrones()));
  const mcTab = useRapidStore(s => s.mcTab);
  const setMcTab = useRapidStore(s => s.setMcTab);
  const cmdFeedback = useRapidStore(s => s.cmdFeedback);
  const selectDrone = useRapidStore(s => s.selectDrone);

  // Telemetry tab data
  const batteryStatus = useRapidStore(s => s.batteryStatus);
  const flightTimeSec = useRapidStore(s => s.flightTimeSec);
  const recording = useRapidStore(s => s.recording);
  const recordingTick = useRapidStore(s => s.recordingTick);

  // Camera
  const cameraMode = useRapidStore(s => s.cameraMode);
  const handleCameraMode = useRapidStore(s => s.handleCameraMode);
  const toggleFullscreen = useRapidStore(s => s.toggleFullscreen);
  const isNightVisionActive = useRapidStore(s => s.isNightVisionActive);
  const handleSnapshot = useRapidStore(s => s.handleSnapshot);

  // PTT
  const pttActive = useRapidStore(s => s.pttActive);
  const pttLog = useRapidStore(s => s.pttLog);
  const micActive = useRapidStore(s => s.micActive);
  const speakerActive = useRapidStore(s => s.speakerActive);
  const speakerVol = useRapidStore(s => s.speakerVol);
  const handlePttDown = useRapidStore(s => s.handlePttDown);
  const handlePttUp = useRapidStore(s => s.handlePttUp);
  const setMicActive = useRapidStore(s => s.setMicActive);
  const setSpeakerActive = useRapidStore(s => s.setSpeakerActive);
  const setSpeakerVol = useRapidStore(s => s.setSpeakerVol);

  // Flight ops
  const handleUavCommand = useRapidStore(s => s.handleUavCommand);

  // Fleet eval
  const fleetEval = useRapidStore(s => s.fleetEval);
  const handleManualDispatch = useRapidStore(s => s.handleManualDispatch);

  // Evidence
  const snapshots = useRapidStore(s => s.snapshots);
  const evidenceChain = useRapidStore(s => s.evidenceChain);
  const droneHistory = useRapidStore(s => s.droneHistory);

  // Log
  const incidentLogs = useRapidStore(s => s.incidentLogs);
  const controllerActions = useRapidStore(s => s.controllerActions);

  const feedbackTone = cmdFeedback?.type === 'ok' ? 'normal'
    : cmdFeedback?.type === 'warn' ? 'warning' : 'critical';

  return (
    <aside className="order-3 lg:order-none lg:col-span-3 border-t lg:border-t-0 border-border bg-surface flex flex-col min-h-0 z-20">

      {/* Selected Rakshak Header */}
      <div className="px-4 py-2 border-b border-border flex-shrink-0">
        {selectedDrone ? (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-mono text-muted uppercase tracking-widest">Selected drone</div>
              <div className="text-sm font-bold text-text truncate">{selectedDrone.call_sign}</div>
              <div className="text-[10px] text-muted font-mono truncate">{selectedDrone.model}</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {recording?.status === 'recording' && (
                <span className="status-badge status-badge--critical status-badge--outline font-mono tabular-nums">
                  <span className="status-dot status-dot--critical" aria-hidden="true" />
                  REC {formatDuration(recordingTick)}
                </span>
              )}
              {recording?.status === 'finalized' && (
                <span className="status-badge border-border text-muted font-mono">Recording saved</span>
              )}
              <button
                onClick={() => selectDrone(null)}
                aria-label="Clear drone selection"
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted hover:text-text hover:bg-border transition-colors duration-150 ${FOCUS}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-h-[44px]">
            <Activity className="h-4 w-4 text-accent" aria-hidden="true" />
            <h2 className="font-bold text-[11px] uppercase tracking-wider text-text">Mission control</h2>
          </div>
        )}
      </div>

      {/* Tab Bar */}
      {selectedDrone && (
        <div className="flex border-b border-border flex-shrink-0" role="tablist" aria-label="Mission control sections">
          {[
            { id: 'telemetry', label: 'Telemetry', icon: Activity },
            { id: 'fleet', label: 'Fleet', icon: BarChart2 },
            { id: 'evidence', label: 'Evidence', icon: Camera },
            { id: 'log', label: 'Log', icon: Clock }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={mcTab === id}
              onClick={() => setMcTab(id)}
              className={`flex-1 min-h-[44px] py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 border-b-2 transition-colors duration-150 ${FOCUS} ${
                mcTab === id ? 'text-accent border-accent' : 'text-muted border-transparent hover:text-text'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Command Feedback */}
      {cmdFeedback && (
        <div
          role="status"
          className={`mx-3 mt-2 p-2 rounded-lg text-[11px] font-mono font-bold flex-shrink-0 border ${TONE_PANEL[feedbackTone]}`}
        >
          {cmdFeedback.msg}
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {!selectedDrone && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <Sliders className="h-8 w-8 text-muted mb-3" aria-hidden="true" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-text">No drone selected</h3>
            <p className="text-[11px] text-muted mt-1 font-mono max-w-[200px]">Pick a drone on the map or in the fleet grid to see its telemetry.</p>
          </div>
        )}

        {/* ─── TELEMETRY TAB ─────────────────────── */}
        {selectedDrone && mcTab === 'telemetry' && (
          <div className="p-3 space-y-3">
            {/* Core Telemetry */}
            <div className={CARD}>
              <span className={SECTION}>
                <Radio className="h-3 w-3" aria-hidden="true" />
                Live telemetry
              </span>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] font-mono">
                <div className={KEY}>Status <span className={`${VAL} block`}>{selectedDrone.status}</span></div>
                <div className={KEY}>Incident <span className={`${VAL} block`}>{selectedDrone.current_incident_id?.slice(0, 8).toUpperCase() || 'None'}</span></div>
                <div className={KEY}>Latitude <span className={`${VAL} block tabular-nums`}>{selectedDrone.latitude.toFixed(4)}°N</span></div>
                <div className={KEY}>Longitude <span className={`${VAL} block tabular-nums`}>{selectedDrone.longitude.toFixed(4)}°E</span></div>
                <div className={KEY}>Altitude <span className={`${VAL} block tabular-nums`}>{selectedDrone.altitude.toFixed(0)} m</span></div>
                <div className={KEY}>Speed <span className={`${VAL} block tabular-nums`}>{selectedDrone.speed.toFixed(0)} m/s</span></div>
                <div className={KEY}>Heading <span className={`${VAL} block tabular-nums`}>{selectedDrone.heading.toFixed(0)}°</span></div>
                <div className={KEY}>In flight <span className={`${VAL} block tabular-nums`}>{formatDuration(flightTimeSec)}</span></div>
                <div className={`col-span-2 ${KEY}`}>Arrival <span className={`${VAL} tabular-nums`}>{(() => {
                  if (['On Scene', 'AI Monitoring', 'Hovering', 'Orbiting', 'Following Target', 'Awaiting Controller'].includes(selectedDrone.status)) return 'On scene';
                  if (['Dispatched', 'En Route'].includes(selectedDrone.status) && selectedDrone.current_incident_id) {
                    const inc = incidents.find(i => i.id === selectedDrone.current_incident_id);
                    if (inc && selectedDrone.speed > 0) return formatEtaShort(Math.round(haversineDistance(selectedDrone.latitude, selectedDrone.longitude, inc.latitude, inc.longitude) / selectedDrone.speed));
                    return 'Calculating…';
                  }
                  if (selectedDrone.status === 'Returning' && selectedDrone.speed > 0) {
                    return formatEtaShort(Math.round(haversineDistance(selectedDrone.latitude, selectedDrone.longitude, selectedDrone.base_latitude, selectedDrone.base_longitude) / selectedDrone.speed));
                  }
                  return 'Not flying';
                })()}</span></div>
              </div>
            </div>

            {/* Battery & Energy Panel */}
            {batteryStatus && (
              <div className={CARD}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`${SECTION} mb-0`}>
                    <Zap className="h-3 w-3" aria-hidden="true" />
                    Energy
                  </span>
                  <span className="text-[10px] font-mono text-muted">Simulated</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[11px] font-mono mb-1">
                      <span className={KEY}>Battery</span>
                      <span className={`font-bold tabular-nums ${batteryColor(batteryStatus.batteryTier)}`}>{batteryStatus.battery}%</span>
                    </div>
                    <div
                      className="h-2 bg-border rounded-full overflow-hidden"
                      role="progressbar"
                      aria-valuenow={Math.round(batteryStatus.battery)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${selectedDrone.call_sign} battery`}
                    >
                      <div className={`h-full rounded-full transition-[width] duration-500 ${batteryBg(batteryStatus.batteryTier)}`} style={{ width: `${batteryStatus.battery}%` }}></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono">
                    <div className={KEY}>Needed to return <span className={`${VAL} tabular-nums`}>{batteryStatus.returnRequired}%</span></div>
                    <div className={KEY}>Left after return <span className={`font-bold tabular-nums ${batteryStatus.projectedAfterReturn >= 20 ? 'text-status-normal' : 'text-status-critical'}`}>{batteryStatus.projectedAfterReturn}%</span></div>
                    <div className={KEY}>Distance to base <span className={`${VAL} tabular-nums`}>{batteryStatus.distToBaseKm} km</span></div>
                    <div className={KEY}>Reserve <span className={`${VAL} tabular-nums`}>{batteryStatus.safetyReserve}%</span></div>
                  </div>
                  {(() => {
                    const tone = batteryStatus.returnStatus === 'SAFE' ? 'normal'
                      : batteryStatus.returnStatus === 'RETURN_RECOMMENDED' ? 'warning' : 'critical';
                    const text = batteryStatus.returnStatus === 'SAFE' ? 'Safe to finish and return'
                      : batteryStatus.returnStatus === 'RETURN_RECOMMENDED' ? 'Return recommended'
                      : 'Critical — returning automatically';
                    return (
                      <div className={`flex items-center justify-center gap-2 text-center font-mono font-bold text-[11px] py-2 rounded-lg border ${TONE_PANEL[tone]}`}>
                        <span className={`status-dot status-dot--${tone}`} aria-hidden="true" />
                        {text}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Live Feed */}
            <div className="bg-black border border-border rounded-2xl overflow-hidden relative">
              <div className="absolute top-2 left-2 z-30 max-w-[45%] flex items-center gap-1.5 bg-black/80 border border-white/60 px-2 py-1 rounded font-mono text-[10px] text-white">
                <span className="status-dot status-dot--normal" aria-hidden="true" />
                <span className="truncate">Live · {selectedDrone.call_sign}</span>
              </div>

              <div className="absolute top-2 right-2 z-30 flex gap-1">
                <div className="flex bg-black/70 border border-white/60 rounded-lg" role="group" aria-label="Camera mode">
                  {[['auto', 'Auto'], ['day', 'Day'], ['night', 'Night']].map(([mode, label]) => (
                    <button
                      key={mode}
                      onClick={() => handleCameraMode(mode)}
                      aria-pressed={cameraMode === mode}
                      aria-label={`${label} camera mode`}
                      className={`min-h-[44px] min-w-[44px] px-1.5 rounded-lg text-[10px] font-mono flex items-center justify-center transition-colors duration-150 ${FOCUS} ${
                        cameraMode === mode ? 'text-white font-bold bg-white/20' : 'text-white/70 hover:text-white'
                      }`}
                    >
                      {mode === 'day' ? <Sun className="h-3.5 w-3.5" aria-hidden="true" /> : mode === 'night' ? <Moon className="h-3.5 w-3.5" aria-hidden="true" /> : label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={toggleFullscreen}
                  aria-label="Full screen feed"
                  className={`min-h-[44px] min-w-[44px] flex items-center justify-center bg-black/70 border border-white/60 rounded-lg text-white/80 hover:text-white transition-colors duration-150 ${FOCUS}`}
                >
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>

              <div className={`aspect-video w-full overflow-hidden relative bg-black flex flex-col items-center justify-center ${isNightVisionActive() ? 'night-vision-feed' : ''}`}>
                {selectedDrone.stream_url && FLYING_STATUSES.includes(selectedDrone.status) ? (
                  <video src={selectedDrone.stream_url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <Sliders className="h-7 w-7 text-white/60 mx-auto mb-1.5" aria-hidden="true" />
                    <span className="text-[11px] font-mono tracking-wide text-white/80">
                      {selectedDrone.status === 'Standby' ? 'Docked — no feed' : 'Feed unavailable'}
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-page border-t border-border px-3 py-1.5 flex items-center justify-between text-[11px] font-mono">
                <span className={KEY}>Camera <span className={VAL}>{cameraMode === 'night' ? 'Night vision (prototype)' : cameraMode === 'day' ? 'Day' : 'Auto'}</span></span>
                <button
                  onClick={handleSnapshot}
                  className={`min-h-[44px] px-2 flex items-center gap-1.5 text-accent hover:underline font-bold rounded-lg transition-colors duration-150 ${FOCUS}`}
                >
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" /> Snapshot
                </button>
              </div>
            </div>

            {/* PTT Panel */}
            <div className={CARD}>
              <div className="flex justify-between items-center mb-2">
                <span className={`${SECTION} mb-0`}>
                  <Mic className="h-3 w-3" aria-hidden="true" />
                  Radio
                </span>
                <span className="text-[10px] font-mono text-muted">Simulated</span>
              </div>

              <button
                onMouseDown={handlePttDown}
                onMouseUp={handlePttUp}
                onMouseLeave={handlePttUp}
                onTouchStart={handlePttDown}
                onTouchEnd={handlePttUp}
                className={`w-full min-h-[48px] rounded-xl border font-bold uppercase transition-colors duration-150 tracking-wider text-[11px] flex items-center justify-center gap-2 mb-2 ${FOCUS} ${
                  pttActive
                    ? 'bg-status-critical border-status-critical text-on-solid ptt-transmitting'
                    : 'bg-surface border-border-strong text-text hover:bg-border'
                }`}
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
                {pttActive ? `Transmitting to ${selectedDrone.call_sign}` : 'Hold to talk'}
              </button>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <button
                  onClick={() => setMicActive(!micActive)}
                  aria-pressed={micActive}
                  className={`min-h-[44px] px-2 rounded-xl border flex items-center justify-between transition-colors duration-150 ${FOCUS} ${
                    micActive ? 'bg-status-normal/10 border-status-normal text-status-normal' : 'bg-status-critical/10 border-status-critical text-status-critical'
                  }`}
                >
                  <span>Mic</span><span className="font-bold">{micActive ? 'On' : 'Muted'}</span>
                </button>
                <button
                  onClick={() => setSpeakerActive(!speakerActive)}
                  aria-pressed={speakerActive}
                  className={`min-h-[44px] px-2 rounded-xl border flex items-center justify-between transition-colors duration-150 ${FOCUS} ${
                    speakerActive ? 'bg-status-normal/10 border-status-normal text-status-normal' : 'bg-status-critical/10 border-status-critical text-status-critical'
                  }`}
                >
                  <span>Speaker</span><span className="font-bold">{speakerActive ? 'On' : 'Muted'}</span>
                </button>
                <div className="col-span-2 flex items-center gap-2 min-h-[44px]">
                  <Volume2 className="h-4 w-4 text-muted flex-shrink-0" aria-hidden="true" />
                  {/* h-11 keeps the whole drag area 44px tall; the native track
                      still renders thin and centred inside it. */}
                  <input
                    id="speaker-volume"
                    type="range"
                    min="0"
                    max="100"
                    value={speakerVol}
                    onChange={e => setSpeakerVol(e.target.value)}
                    aria-label="Speaker volume"
                    className={`w-full h-11 bg-transparent cursor-pointer accent-accent ${FOCUS}`}
                  />
                  <span className="text-[11px] w-9 text-right tabular-nums text-text">{speakerVol}%</span>
                </div>
              </div>

              {pttLog.length > 0 && (
                <div className="mt-2 space-y-0.5 max-h-16 overflow-y-auto">
                  {pttLog.slice(0, 4).map((entry, i) => (
                    <div key={i} className="text-[10px] font-mono text-muted flex gap-2">
                      <span className="tabular-nums">{entry.time}</span>
                      <span>{entry.event}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Flight Ops Controller */}
            <div className={CARD}>
              <span className={SECTION}>
                <Gamepad2 className="h-3 w-3" aria-hidden="true" />
                Flight commands
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleUavCommand('follow')} disabled={!ACTIVE_STATUSES.includes(selectedDrone.status)} className={CMD_QUIET}>Follow</button>
                <button onClick={() => handleUavCommand('orbit')} disabled={!ACTIVE_STATUSES.includes(selectedDrone.status)} className={CMD_QUIET}>Orbit</button>
                <button onClick={() => handleUavCommand('hover')} disabled={!ACTIVE_STATUSES.includes(selectedDrone.status)} className={CMD_QUIET}>Hover</button>
                <button onClick={() => handleUavCommand('dispatch')} disabled={selectedDrone.status !== 'Standby'} className={`${CMD} bg-accent border-accent text-on-solid hover:opacity-90`}>Dispatch</button>
                <button onClick={() => handleUavCommand('return_home')} disabled={['Standby', 'Charging', 'maintenance', 'Returning'].includes(selectedDrone.status)} className={`${CMD} col-span-2 bg-status-warning border-status-warning text-on-solid hover:opacity-90`}>Return to base</button>
                <button onClick={() => handleUavCommand('emergency_land')} disabled={['Standby', 'Charging', 'maintenance'].includes(selectedDrone.status)} className={`${CMD} col-span-2 bg-status-critical border-status-critical text-on-solid hover:opacity-90`}>Emergency land</button>
              </div>
            </div>
          </div>
        )}

        {/* ─── FLEET TAB ─────────────────────────── */}
        {selectedDrone && mcTab === 'fleet' && (
          <div className="p-3 space-y-3">
            <div className={CARD}>
              <div className="flex items-center justify-between mb-2">
                <span className={`${SECTION} mb-0`}>
                  <Search className="h-3 w-3" aria-hidden="true" />
                  Which drone to send
                </span>
              </div>
              {selectedIncident ? (
                fleetEval ? (
                  <div className="space-y-2">
                    {fleetEval.best && (
                      <div className="p-2 bg-accent/10 border border-accent/40 rounded-xl text-[11px] font-mono">
                        <div className="text-accent font-bold uppercase mb-1">Recommended</div>
                        <div className="text-text font-bold">{fleetEval.best.callSign}</div>
                        <div className={`${KEY} mt-0.5`}>Score {fleetEval.best.score}/100 ({fleetEval.best.suitabilityLabel})</div>
                        <div className={KEY}>Arrives in {formatEtaShort(fleetEval.best.etaSeconds)} · {fleetEval.best.surplusBattery}% battery to spare</div>
                      </div>
                    )}
                    {!fleetEval.best && (
                      <div role="status" className="p-2 bg-status-critical/10 border border-status-critical/40 rounded-xl text-[11px] font-mono text-status-critical font-bold text-center">
                        No drone can safely take this call
                      </div>
                    )}

                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {fleetEval.ranked.map((c) => (
                        <div key={c.droneId} className={`p-2 rounded-xl border text-[11px] font-mono ${c.canComplete ? 'border-status-normal/30 bg-status-normal/5' : 'border-border bg-surface'}`}>
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <span className="text-text font-bold">{c.callSign}</span>
                            <span className={`status-badge status-badge--${c.canComplete ? 'normal' : 'critical'} ${c.canComplete ? 'status-badge--outline' : 'status-badge--filled'} uppercase`}>
                              {c.canComplete ? c.suitabilityLabel : 'Cannot go'}
                            </span>
                          </div>
                          <div className={`grid grid-cols-2 gap-x-2 ${KEY}`}>
                            <span>Distance {c.distanceToIncidentKm?.toFixed(1) ?? '--'} km</span>
                            <span>Battery <span className={batteryColor(c.batteryTier)}>{c.battery}%</span></span>
                            <span>Needs {c.totalRequired ?? '--'}%</span>
                            <span>Arrives {c.etaSeconds ? formatEtaShort(c.etaSeconds) : '--'}</span>
                            <span className="col-span-2 text-[10px]">{c.canComplete ? `Return: ${c.returnFeasibility}` : c.rejectionReason}</span>
                          </div>
                          {c.canComplete && c.droneId !== selectedDrone?.id && (
                            <button
                              onClick={() => selectedIncident && handleManualDispatch(c, selectedIncident)}
                              className={`mt-1.5 w-full ${CMD_QUIET}`}
                            >
                              Send {c.callSign}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted text-[11px] font-mono py-4">Working out the options…</div>
                )
              ) : (
                <div className="text-center text-muted text-[11px] font-mono py-4">Pick an incident to compare drones.</div>
              )}
            </div>

            {/* All drone energy status */}
            <div className={CARD}>
              <span className={SECTION}>
                <Zap className="h-3 w-3" aria-hidden="true" />
                Fleet battery
              </span>
              <div className="space-y-2">
                {drones.map(d => {
                  const tier = batteryTier(d.battery_level);
                  return (
                    <div key={d.id} className="flex items-center gap-2 text-[11px] font-mono">
                      <span className="text-text font-bold w-24 truncate">{d.call_sign}</span>
                      <div
                        className="flex-1 h-2 bg-border rounded-full overflow-hidden"
                        role="progressbar"
                        aria-valuenow={Math.round(d.battery_level)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${d.call_sign} battery`}
                      >
                        <div className={`h-full rounded-full ${batteryBg(tier)}`} style={{ width: `${d.battery_level}%` }}></div>
                      </div>
                      <span className={`w-10 text-right tabular-nums ${batteryColor(tier)} font-bold`}>{d.battery_level.toFixed(0)}%</span>
                      <span className="text-muted w-12 truncate uppercase">{d.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── EVIDENCE TAB ──────────────────────── */}
        {selectedDrone && mcTab === 'evidence' && (
          <div className="p-3 space-y-3">
            {/* Recording status */}
            <div className={CARD}>
              <span className={SECTION}>
                <Film className="h-3 w-3" aria-hidden="true" />
                Mission recording
              </span>
              {recording && recording.status !== 'none' ? (
                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className={`flex items-center gap-2 py-1.5 px-2 rounded-lg border ${recording.status === 'recording' ? 'bg-status-critical/10 border-status-critical/40' : 'bg-surface border-border'}`}>
                    {recording.status === 'recording'
                      ? <span className="status-dot status-dot--critical" aria-hidden="true" />
                      : <span className="h-2 w-2 rounded-full bg-muted" aria-hidden="true" />}
                    <span className={`font-bold ${recording.status === 'recording' ? 'text-status-critical' : 'text-muted'}`}>
                      {recording.status === 'recording' ? `Recording ${formatDuration(recordingTick)}` : 'Saved'}
                    </span>
                    <span className="text-muted ml-auto">{recording.source}</span>
                  </div>
                  <div className={KEY}>Drone <span className={VAL}>{recording.rakshak_id}</span></div>
                  <div className={KEY}>Started <span className={VAL}>{new Date(recording.recording_start).toLocaleTimeString([], { hour12: false })}</span></div>
                  {recording.status === 'finalized' && recording.duration_seconds && (
                    <div className={KEY}>Length <span className={VAL}>{formatDuration(recording.duration_seconds)}</span></div>
                  )}
                  <div className="mt-1 p-2 bg-status-warning/10 border border-status-warning/40 rounded-lg text-status-warning text-[10px] flex items-start gap-1.5">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span>Simulated. No video file is written yet — the plumbing for real stream recording is in place.</span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted text-[11px] font-mono py-3">Nothing recording. It starts on its own when a mission begins.</div>
              )}
            </div>

            {/* Evidence Integrity (Phase 4 hash chain) */}
            {evidenceChain && (evidenceChain.snapshots.count > 0 || evidenceChain.recordings.count > 0) && (
              <div className={CARD}>
                <span className={SECTION}>
                  <Lock className="h-3 w-3" aria-hidden="true" />
                  Evidence integrity
                </span>
                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex items-center justify-between gap-2">
                    <span className={KEY}>Snapshots ({evidenceChain.snapshots.count})</span>
                    <span className={`status-badge status-badge--${evidenceChain.snapshots.chainValid ? 'normal' : 'critical'} ${evidenceChain.snapshots.chainValid ? 'status-badge--outline' : 'status-badge--filled'}`}>
                      {evidenceChain.snapshots.chainValid ? 'Verified' : 'Broken'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={KEY}>Recordings ({evidenceChain.recordings.count})</span>
                    <span className={`status-badge status-badge--${evidenceChain.recordings.chainValid ? 'normal' : 'critical'} ${evidenceChain.recordings.chainValid ? 'status-badge--outline' : 'status-badge--filled'}`}>
                      {evidenceChain.recordings.chainValid ? 'Verified' : 'Broken'}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted mt-1 leading-relaxed">Each file is hashed and linked to the one before it, so anything altered after capture stops verifying.</div>
                </div>
              </div>
            )}

            {/* Snapshots */}
            {snapshots.length > 0 && (
              <div className={CARD}>
                <span className={SECTION}>
                  <ImageIcon className="h-3 w-3" aria-hidden="true" />
                  Snapshots ({snapshots.length})
                </span>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {snapshots.map((snap) => (
                    <div key={snap.id} className="relative rounded-xl overflow-hidden border border-border">
                      {/* This grid holds up to 200 snapshots. Without
                          loading="lazy" every one starts downloading the
                          moment the panel renders. */}
                      <img src={snap.image_url} loading="lazy" className="w-full aspect-video object-cover" alt={snap.label} />
                      <div className="absolute bottom-0 left-0 w-full bg-black/80 px-1.5 py-1">
                        <div className="text-[10px] text-white font-mono font-bold truncate">{snap.label}</div>
                        {snap.heading != null && (
                          <div className="text-[9px] text-white/80 font-mono tabular-nums">Hdg {snap.heading?.toFixed(0)}° · Alt {snap.altitude?.toFixed(0)}m · {snap.reason}</div>
                        )}
                        <div className="text-[9px] text-white/70 font-mono tabular-nums">{new Date(snap.timestamp).toLocaleTimeString([], { hour12: false })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GPS Trail */}
            {droneHistory.length > 0 && (
              <div className={CARD}>
                <span className={SECTION}>
                  <MapIcon className="h-3 w-3" aria-hidden="true" />
                  Flight path ({droneHistory.length} points)
                </span>
                <div className="max-h-28 overflow-y-auto space-y-0.5">
                  {droneHistory.slice(0, 10).map((h, i) => (
                    <div key={h.id} className="text-[10px] font-mono text-muted flex gap-2 tabular-nums">
                      <span className="w-5">{i + 1}</span>
                      <span>{h.latitude.toFixed(4)}°N, {h.longitude.toFixed(4)}°E</span>
                      <span className="ml-auto">{h.altitude?.toFixed(0)}m</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── LOG TAB ──────────────────────────── */}
        {selectedDrone && mcTab === 'log' && (
          <div className="p-3 space-y-3">
            {incidentLogs.length > 0 && (
              <div className={CARD}>
                <span className={SECTION}>
                  <ListChecks className="h-3 w-3" aria-hidden="true" />
                  What happened
                </span>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {incidentLogs.map((log) => (
                    <div key={log.id} className="relative pl-4 border-l border-border text-[11px] font-mono py-0.5">
                      <div className="absolute -left-[4px] top-2 h-2 w-2 bg-accent rounded-full" aria-hidden="true"></div>
                      <div className="flex justify-between items-center gap-2 text-[10px]">
                        <span className={`font-bold uppercase ${log.action === 'launch' ? 'text-accent' : log.action === 'arrival' ? 'text-status-normal' : log.action === 'snapshot' ? 'text-status-warning' : 'text-muted'}`}>{log.action}</span>
                        <span className="text-muted tabular-nums">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}</span>
                      </div>
                      <p className="text-text mt-0.5 text-[10px] leading-relaxed">{log.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Controller Action Log */}
            <div className={CARD}>
              <span className={SECTION}>
                <Gamepad2 className="h-3 w-3" aria-hidden="true" />
                Commands sent
              </span>
              {controllerActions.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {controllerActions.slice(0, 20).map((act) => (
                    <div key={act.id} className="text-[11px] font-mono border-l-2 border-border-strong pl-2">
                      <div className="flex justify-between gap-2">
                        <span className="text-text font-bold uppercase">{act.action.replace(/_/g, ' ')}</span>
                        <span className="text-muted tabular-nums">{new Date(act.timestamp).toLocaleTimeString([], { hour12: false })}</span>
                      </div>
                      <div className={KEY}>{act.rakshak_id} · {act.result}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted text-[11px] font-mono py-3">No commands sent yet.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
