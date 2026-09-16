import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, Lock, RefreshCw } from 'lucide-react';
import useRapidStore from '../store/rapidStore';
import { SkeletonRow } from '../components/shared/Skeleton';

// Mirrors routes/security.js's AUDIT_READ_ROLES — client-side gate is UX
// only, the server is the real authority (a non-commander hitting the API
// directly still gets a real 403, logged as its own unauthorized_attempt).
const AUDIT_READ_ROLES = ['NATIONAL_COMMANDER', 'STATE_COMMANDER'];

// The two events an auditor is actually hunting for -- a rate-limited login
// and a refused request -- are the two filled badges, so they stand out of a
// long list by weight and not only by hue.
const ACTION_BADGE = {
  login_success: 'status-badge--normal status-badge--outline',
  login_failure: 'status-badge--warning status-badge--outline',
  login_rate_limited: 'status-badge--critical status-badge--filled',
  logout: 'border-border text-muted',
  zone_created: 'border-border-strong text-text',
  zone_updated: 'border-border-strong text-text',
  zone_deleted: 'status-badge--warning status-badge--outline',
  rl_mode_changed: 'status-badge--urgent status-badge--outline',
  unauthorized_attempt: 'status-badge--critical status-badge--filled'
};

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

function describe(entry) {
  const who = entry.actor?.username || 'unknown';
  switch (entry.action) {
    case 'login_success': return `${who} logged in.`;
    case 'login_failure': return `Failed login attempt for "${entry.details?.username || 'unknown'}".`;
    case 'login_rate_limited': return `Login rate limit hit for "${entry.details?.username || 'unknown'}" (${entry.details?.ip || 'unknown IP'}).`;
    case 'logout': return `${who} logged out.`;
    case 'zone_created': return `${who} created airspace zone "${entry.target?.name || entry.target?.zoneId}".`;
    case 'zone_updated': return `${who} updated airspace zone "${entry.target?.name || entry.target?.zoneId}".`;
    case 'zone_deleted': return `${who} deactivated airspace zone "${entry.target?.name || entry.target?.zoneId}".`;
    case 'rl_mode_changed': return `${who} switched RL mode ${entry.target?.from} → ${entry.target?.to}.`;
    case 'unauthorized_attempt': return `${who} attempted ${entry.target?.method} ${entry.target?.path} without permission (requires ${entry.details?.requiredRoles?.join('/')}).`;
    default: return entry.action;
  }
}

function SecurityAudit() {
  const currentUser = useRapidStore(s => s.currentUser);
  const allowed = currentUser && AUDIT_READ_ROLES.includes(currentUser.role);

  const [entries, setEntries] = useState([]);
  const [chainStatus, setChainStatus] = useState(null);
  const [verifying, setVerifying] = useState(false);
  // Without this, "No security events logged yet" showed during every fetch,
  // not only when the log is genuinely empty. refresh depends on `allowed`,
  // which flips once currentUser loads, so this legitimately toggles again
  // then: a real refetch, not just mount.
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!allowed) return;
    try {
      const res = await fetch('/api/security/audit-log?limit=50');
      if (res.ok) setEntries(await res.json());
    } catch (err) {
      console.error('Audit log refresh error:', err);
    }
  }, [allowed]);

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
    const interval = setInterval(poll, 5000);
    return () => { ignore = true; clearInterval(interval); };
  }, [refresh]);

  const verifyChain = async () => {
    setVerifying(true);
    try {
      const res = await fetch('/api/security/audit-log/verify');
      if (res.ok) setChainStatus(await res.json());
    } catch (err) {
      console.error('Chain verify error:', err);
    } finally {
      setVerifying(false);
    }
  };

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Lock className="h-10 w-10 text-muted mb-4" aria-hidden="true" />
        <h2 className="text-lg font-bold text-text">You need a commander account</h2>
        <p className="text-xs text-muted font-mono mt-2 max-w-md leading-relaxed">
          This log holds usernames, IP addresses and refused requests, so only NATIONAL_COMMANDER and STATE_COMMANDER accounts can open it.
          You are signed in as {currentUser?.role || '—'}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-accent/10 p-2.5 rounded-xl border border-accent/30">
            <ShieldCheck className="h-6 w-6 text-accent" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-wide text-text">Security log</h2>
            <p className="text-xs text-muted font-mono mt-0.5">Every sign-in, zone change, mode switch and refused request, each one hashed to the one before it.</p>
          </div>
        </div>
        <button
          onClick={verifyChain}
          disabled={verifying}
          className={`flex items-center gap-2 min-h-[44px] px-4 bg-accent text-on-solid rounded-xl text-[10px] font-bold uppercase tracking-wider transition-opacity duration-150 hover:opacity-90 disabled:opacity-50 ${FOCUS}`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${verifying ? 'animate-spin' : ''}`} aria-hidden="true" />
          {verifying ? 'Checking…' : 'Check for tampering'}
        </button>
      </div>

      {chainStatus && (
        <div role="status" className={`p-3 rounded-xl text-xs font-mono font-bold flex items-center gap-2 border ${
          chainStatus.valid ? 'bg-status-normal/10 border-status-normal/40 text-status-normal' : 'bg-status-critical/10 border-status-critical/40 text-status-critical'
        }`}>
          {chainStatus.valid
            ? <ShieldCheck className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            : <ShieldAlert className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
          {chainStatus.valid ? 'Checked — nothing has been altered.' : `Broken at entry ${chainStatus.brokenAt}: ${chainStatus.reason}`}
        </div>
      )}

      <div className="bg-surface rounded-2xl p-5 border border-border">
        <div className="space-y-2">
          {loading ? (
            [0, 1, 2, 3].map(i => <SkeletonRow key={i} />)
          ) : entries.map(e => (
            <div key={e.id} className="p-3 rounded-xl border border-border bg-page flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-text truncate">{describe(e)}</div>
                <div className="text-[10px] text-muted font-mono">{new Date(e.timestamp).toLocaleString()}</div>
              </div>
              <span className={`status-badge flex-shrink-0 font-mono uppercase ${ACTION_BADGE[e.action] || 'border-border text-muted'}`}>
                {e.action.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
          {!loading && entries.length === 0 && <p className="text-xs text-muted font-mono text-center py-4">Nothing logged yet.</p>}
        </div>
      </div>
    </div>
  );
}

export default SecurityAudit;
