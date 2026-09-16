import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import useRapidStore from '../../store/rapidStore';

const BTN = 'min-h-[44px] px-3 rounded-xl text-xs font-bold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export default function OverrideModal() {
  const overrideModal = useRapidStore(s => s.overrideModal);
  const setOverrideModal = useRapidStore(s => s.setOverrideModal);
  const handleManualDispatch = useRapidStore(s => s.handleManualDispatch);

  useEffect(() => {
    if (!overrideModal) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOverrideModal(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overrideModal, setOverrideModal]);

  if (!overrideModal) return null;

  return (
    <div
      className="fixed inset-0 bg-text/60 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) setOverrideModal(null); }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="override-title"
        aria-describedby="override-body"
        className="view-enter w-full max-w-sm bg-surface border border-status-critical rounded-3xl p-6 shadow-sm"
      >
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-status-critical flex-shrink-0" aria-hidden="true" />
          <h3 id="override-title" className="font-bold text-sm uppercase tracking-wider text-status-critical">
            Not enough battery
          </h3>
        </div>
        <div id="override-body">
          <p className="text-[11px] font-mono text-text mb-2 leading-relaxed">
            <span className="font-bold">{overrideModal.candidate.callSign}</span> cannot reach this incident and still make it back to base.
          </p>
          <p className="text-[11px] font-mono text-muted mb-4 leading-relaxed">
            Sending it anyway risks losing power mid-flight. Do this only if no other drone can go.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setOverrideModal(null)}
            autoFocus
            className={`${BTN} bg-page border border-border-strong text-text hover:bg-border`}
          >
            Cancel
          </button>
          <button
            onClick={() => handleManualDispatch(overrideModal.candidate, overrideModal.incident, true)}
            className={`${BTN} bg-status-critical text-on-solid hover:opacity-90`}
          >
            Send anyway
          </button>
        </div>
      </div>
    </div>
  );
}
