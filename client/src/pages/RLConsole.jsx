import React, { useState, useEffect, useCallback } from 'react';
import { BrainCircuit, Zap, History, Radio, CheckCircle2, XCircle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import useRapidStore from '../store/rapidStore';
import { SkeletonRow, SkeletonChart } from '../components/shared/Skeleton';
import useThemeTokens from '../components/shared/useThemeTokens';

// Mirrors the server-side requireRole lists in routes/rl.js — duplicated
// client-side (same pattern as App.jsx's ROLE_LABELS) purely to disable
// controls a request would 403 on anyway; the server remains the real
// authority, this is UX only.
const MODE_SWITCH_ROLES = ['NATIONAL_COMMANDER', 'STATE_COMMANDER'];

// The three mode names are API values and are sent back verbatim on switch,
// so they are displayed as-is rather than reworded. The tone is about what
// the mode does to live dispatch: LIVE is the frozen engine, TRAINING lets a
// policy that is still changing drive real decisions, EVALUATION only watches.
const MODE_TONE = {
  LIVE: 'normal',
  TRAINING: 'warning',
  EVALUATION: 'accent',
};

const MODE_PANEL = {
  normal: 'bg-status-normal/10 border-status-normal/40 text-status-normal',
  warning: 'bg-status-warning/10 border-status-warning/40 text-status-warning',
  accent: 'bg-accent/10 border-accent/40 text-accent',
};

const MODE_TEXT = {
  normal: 'text-status-normal',
  warning: 'text-status-warning',
  accent: 'text-accent',
};

const MODE_DESCRIPTIONS = {
  LIVE: 'Real dispatch, handled by the fixed rules engine. Nothing learns in this mode.',
  TRAINING: 'The neural policy makes the real dispatch calls and keeps learning from them, roughly every 8 seconds.',
  EVALUATION: 'The neural policy makes the real dispatch calls, and what the rules engine would have picked is logged beside each one.',
};

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const STAT = 'p-2.5 rounded-lg bg-page border border-border text-center';
const STAT_VALUE = 'text-lg font-bold text-text tabular-nums';
const STAT_LABEL = 'text-[10px] text-muted uppercase font-mono tracking-wide';

function RLConsole() {
  const currentUser = useRapidStore(s => s.currentUser);
  const canSwitchMode = currentUser && MODE_SWITCH_ROLES.includes(currentUser.role);

  const [mode, setMode] = useState('LIVE');
  const [history, setHistory] = useState([]);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [experience, setExperience] = useState([]);
  const [drones, setDrones] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [switching, setSwitching] = useState(false);
  const [training, setTraining] = useState(false);
  // Without this, "No completed-mission experience yet" showed during the
  // initial fetch too, indistinguishable from a genuinely empty buffer.
  const [loading, setLoading] = useState(true);

  const t = useThemeTokens();

  const showFeedback = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 5000);
  };

  const refresh = useCallback(async () => {
    try {
      const [modeRes, statusRes, expRes, dronesRes] = await Promise.all([
        fetch('/api/rl/mode'),
        fetch('/api/rl/training-status'),
        fetch('/api/rl/experience?limit=8'),
        fetch('/api/drones')
      ]);
      if (modeRes.ok) { const m = await modeRes.json(); setMode(m.mode); setHistory(m.history || []); }
      if (statusRes.ok) setTrainingStatus(await statusRes.json());
      if (expRes.ok) setExperience(await expRes.json());
      if (dronesRes.ok) setDrones(await dronesRes.json());
    } catch (err) {
      console.error('RL console refresh error:', err);
    }
  }, []);

  // refresh is also called from switchMode/triggerTraining after an action
  // completes, so it stays a shared useCallback rather than moving inline -
  // these two effects each wrap it in a small effect-local function instead,
  // which also lets the poll stop cleanly if the component unmounts
  // mid-request instead of setting state afterwards.
  useEffect(() => {
    let ignore = false;
    const sync = async () => { if (!ignore) await refresh(); };
    sync().finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [refresh]);

  useEffect(() => {
    let ignore = false;
    const poll = async () => { if (!ignore) await refresh(); };
    const interval = setInterval(poll, 4000);
    return () => { ignore = true; clearInterval(interval); };
  }, [refresh]);

  const callSignFor = (droneId) => drones.find(d => d.id === droneId)?.call_sign || droneId?.slice(0, 8) || '—';

  const switchMode = async (newMode) => {
    setSwitching(true);
    try {
      const res = await fetch('/api/rl/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode, reason: `Switched from RL Console by ${currentUser?.fullName || 'operator'}.` })
      });
      const data = await res.json();
      if (!res.ok) { showFeedback('error', data.error || 'Mode switch failed.'); return; }
      showFeedback('ok', `Switched to ${newMode}.`);
      refresh();
    } catch {
      showFeedback('error', 'Network error — mode not switched.');
    } finally {
      setSwitching(false);
    }
  };

  const triggerTraining = async () => {
    setTraining(true);
    try {
      const res = await fetch('/api/rl/train', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (!res.ok) { showFeedback('error', data.error || 'Training failed.'); return; }
      if (!data.trained) { showFeedback('error', data.reason); return; }
      showFeedback('ok', `Trained on ${data.batchSize} samples — loss ${data.loss.toFixed(4)}.`);
      refresh();
    } catch {
      showFeedback('error', 'Network error — training not triggered.');
    } finally {
      setTraining(false);
    }
  };

  const lossChartData = (trainingStatus?.neuralPolicy?.lossHistory || []).map(h => ({ step: h.step, loss: h.loss }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="bg-accent/10 p-2.5 rounded-xl border border-accent/30">
          <BrainCircuit className="h-6 w-6 text-accent" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-wide text-text">Dispatch policy</h2>
          <p className="text-xs text-muted font-mono mt-0.5">Which engine picks the drone, how the learned one is training, and where the two disagree.</p>
        </div>
      </div>

      {feedback && (
        <div role="status" className={`p-3 rounded-xl text-xs font-mono font-bold border ${feedback.type === 'ok' ? 'bg-status-normal/10 border-status-normal/40 text-status-normal' : 'bg-status-critical/10 border-status-critical/40 text-status-critical'}`}>
          {feedback.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mode Control */}
        <div className="bg-surface rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="h-4 w-4 text-muted" aria-hidden="true" />
            <h3 className="font-bold text-sm text-text uppercase tracking-wider">Dispatch mode</h3>
          </div>

          <div className={`p-3 rounded-xl border mb-4 ${MODE_PANEL[MODE_TONE[mode]]}`}>
            <div className="text-sm font-bold uppercase tracking-wider">{mode}</div>
            <p className="text-[11px] font-mono mt-1 text-text leading-relaxed">{MODE_DESCRIPTIONS[mode]}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2" role="group" aria-label="Dispatch mode">
            {['LIVE', 'TRAINING', 'EVALUATION'].map(m => (
              <button
                key={m}
                disabled={!canSwitchMode || switching || m === mode}
                onClick={() => switchMode(m)}
                aria-pressed={m === mode}
                title={!canSwitchMode ? 'Commander role required to change mode.' : ''}
                className={`min-h-[44px] px-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border transition-colors duration-150 disabled:cursor-not-allowed ${FOCUS} ${
                  m === mode
                    ? 'bg-accent border-accent text-on-solid'
                    : 'bg-page border-border-strong text-text hover:bg-border disabled:opacity-40'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          {!canSwitchMode && (
            <p className="text-[11px] text-muted font-mono">Signed in as {currentUser?.role || '—'}. Changing the mode needs a commander account.</p>
          )}

          <div className="mt-5 pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <History className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
              <span className="text-[11px] font-mono text-muted uppercase tracking-wider font-bold">Recent changes</span>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {history.slice(0, 6).map((h, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] font-mono">
                  <span className={`font-bold ${MODE_TEXT[MODE_TONE[h.mode]] || 'text-text'}`}>{h.mode}</span>
                  <span className="text-muted tabular-nums">{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
              ))}
              {history.length === 0 && <p className="text-[11px] font-mono text-muted">No changes recorded.</p>}
            </div>
          </div>
        </div>

        {/* Neural Policy Training Status */}
        <div className="bg-surface rounded-2xl p-5 border border-border">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <Zap className="h-4 w-4 text-muted flex-shrink-0" aria-hidden="true" />
              <h3 className="font-bold text-sm text-text uppercase tracking-wider truncate">Learned policy — {trainingStatus?.neuralPolicy?.name || 'neural-dqn-v1'}</h3>
            </div>
            <button
              onClick={triggerTraining}
              disabled={!canSwitchMode || training || mode !== 'TRAINING'}
              title={mode !== 'TRAINING' ? 'Switch to TRAINING mode first.' : ''}
              className={`min-h-[44px] px-4 bg-accent text-on-solid rounded-xl text-[10px] font-bold uppercase tracking-wider transition-opacity duration-150 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed ${FOCUS}`}
            >
              {training ? 'Training…' : 'Train now'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className={STAT}>
              <div className={STAT_VALUE}>{trainingStatus?.neuralPolicy?.episodesTrained ?? 0}</div>
              <div className={STAT_LABEL}>Episodes</div>
            </div>
            <div className={STAT}>
              <div className={STAT_VALUE}>{trainingStatus?.neuralPolicy?.trainSteps ?? 0}</div>
              <div className={STAT_LABEL}>Steps</div>
            </div>
            <div className={STAT}>
              <div className={STAT_VALUE}>{trainingStatus?.neuralPolicy?.lastLoss != null ? trainingStatus.neuralPolicy.lastLoss.toFixed(4) : '—'}</div>
              <div className={STAT_LABEL}>Last loss</div>
            </div>
          </div>

          <div className="h-32">
            {loading ? (
              <SkeletonChart />
            ) : lossChartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lossChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
                  <XAxis dataKey="step" tick={{ fontSize: 10, fill: t.muted }} stroke={t.muted} />
                  <YAxis tick={{ fontSize: 10, fill: t.muted }} stroke={t.muted} />
                  <Tooltip contentStyle={{ background: t.surface, border: `1px solid ${t.borderStrong}`, borderRadius: 12, color: t.text, fontSize: 12 }} />
                  <Line type="monotone" dataKey="loss" name="Loss" stroke={t.accent} strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted font-mono text-center py-10 leading-relaxed">Nothing trained yet. Switch to TRAINING and finish a few missions.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Experience */}
      <div className="bg-surface rounded-2xl p-5 border border-border">
        <h3 className="font-bold text-sm text-text uppercase tracking-wider mb-4">Recent decisions</h3>
        <div className="space-y-2">
          {loading ? (
            [0, 1, 2, 3].map(i => <SkeletonRow key={i} />)
          ) : experience.map(e => (
            <div key={e.id} className="p-3 rounded-xl border border-border bg-page flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold text-text truncate">{callSignFor(e.action?.droneId)} — {e.action?.type}</div>
                <div className="text-[10px] text-muted font-mono">{new Date(e.timestamp).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-3">
                {e.shadow_comparison && (
                  <span className={`status-badge font-mono uppercase ${
                    e.shadow_comparison.agree ? 'status-badge--normal status-badge--outline' : 'status-badge--warning status-badge--outline'
                  }`}>
                    {e.shadow_comparison.agree
                      ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      : <XCircle className="h-3 w-3" aria-hidden="true" />}
                    {e.shadow_comparison.agree ? 'Same as the rules engine' : `Rules engine picked ${e.shadow_comparison.heuristicCallSign}`}
                  </span>
                )}
                {/* The sign carries the meaning; the colour only reinforces it. */}
                <span className={`text-xs font-mono font-bold tabular-nums ${e.reward >= 0 ? 'text-status-normal' : 'text-status-critical'}`}>
                  {e.reward >= 0 ? '+' : ''}{e.reward?.toFixed(3)}
                </span>
              </div>
            </div>
          ))}
          {!loading && experience.length === 0 && <p className="text-xs text-muted font-mono text-center py-4">No finished missions to learn from yet.</p>}
        </div>
      </div>
    </div>
  );
}

export default RLConsole;
