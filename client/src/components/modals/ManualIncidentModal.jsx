import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import useRapidStore from '../../store/rapidStore';

const LABEL = 'block font-mono uppercase text-muted mb-1 text-[11px] tracking-wide';
const FIELD = 'w-full min-h-[44px] bg-page text-text placeholder:text-muted border border-border-strong rounded-xl px-3 py-2 outline-none transition-colors duration-150 focus:border-accent focus:ring-2 focus:ring-accent';

export default function ManualIncidentModal() {
  const showManualForm = useRapidStore(s => s.showManualForm);
  const setShowManualForm = useRapidStore(s => s.setShowManualForm);
  const manualTitle = useRapidStore(s => s.manualTitle);
  const setManualTitle = useRapidStore(s => s.setManualTitle);
  const manualCategory = useRapidStore(s => s.manualCategory);
  const setManualCategory = useRapidStore(s => s.setManualCategory);
  const manualSeverity = useRapidStore(s => s.manualSeverity);
  const setManualSeverity = useRapidStore(s => s.setManualSeverity);
  const manualLat = useRapidStore(s => s.manualLat);
  const setManualLat = useRapidStore(s => s.setManualLat);
  const manualLng = useRapidStore(s => s.manualLng);
  const setManualLng = useRapidStore(s => s.setManualLng);
  const handleManualIncidentSubmit = useRapidStore(s => s.handleManualIncidentSubmit);

  useEffect(() => {
    if (!showManualForm) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setShowManualForm(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showManualForm, setShowManualForm]);

  if (!showManualForm) return null;

  return (
    <div
      className="fixed inset-0 bg-text/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) setShowManualForm(false); }}
    >
      {/* view-enter is the one-keyframe replacement for framer-motion; it is
          guarded for prefers-reduced-motion in index.css. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-incident-title"
        className="view-enter w-full max-w-md bg-surface border border-border rounded-3xl p-6 shadow-sm max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4 border-b border-border pb-3 gap-2">
          <h3 id="log-incident-title" className="font-bold text-sm uppercase tracking-wider text-text">Log an incident</h3>
          <button
            onClick={() => setShowManualForm(false)}
            aria-label="Close"
            className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-xl text-muted hover:text-text hover:bg-border transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={handleManualIncidentSubmit} className="space-y-4 text-xs">
          <div>
            <label htmlFor="manual-title" className={LABEL}>What happened</label>
            <input
              id="manual-title"
              type="text"
              required
              autoFocus
              value={manualTitle}
              onChange={e => setManualTitle(e.target.value)}
              placeholder="e.g. Trespass near Panaji"
              className={FIELD}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="manual-category" className={LABEL}>Category</label>
              <select id="manual-category" value={manualCategory} onChange={e => setManualCategory(e.target.value)} className={FIELD}>
                {['trespass', 'fire', 'theft', 'assault', 'traffic', 'medical', 'other'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="manual-severity" className={LABEL}>Severity</label>
              <select id="manual-severity" value={manualSeverity} onChange={e => setManualSeverity(e.target.value)} className={FIELD}>
                {['low', 'medium', 'high', 'critical'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="manual-lat" className={LABEL}>Latitude</label>
              <input id="manual-lat" type="number" step="0.000001" required value={manualLat} onChange={e => setManualLat(e.target.value)} className={`${FIELD} tabular-nums`} />
            </div>
            <div>
              <label htmlFor="manual-lng" className={LABEL}>Longitude</label>
              <input id="manual-lng" type="number" step="0.000001" required value={manualLng} onChange={e => setManualLng(e.target.value)} className={`${FIELD} tabular-nums`} />
            </div>
          </div>
          <button
            type="submit"
            className="w-full mt-2 min-h-[44px] bg-accent text-on-solid font-bold rounded-xl hover:opacity-90 transition-opacity duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Log incident
          </button>
        </form>
      </div>
    </div>
  );
}
