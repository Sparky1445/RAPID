import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, User, AlertTriangle } from 'lucide-react';
import useRapidStore from '../store/rapidStore';

// One shared field shell. Focus is drawn on the wrapper because the input
// inside it is borderless, and the ring has to read against both
// --color-page and --color-surface.
const FIELD =
  'flex items-center gap-2 min-h-[44px] bg-page border border-border-strong rounded-lg px-3 ' +
  'transition-colors duration-150 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent';

export default function Login() {
  const login = useRapidStore(s => s.login);
  const authError = useRapidStore(s => s.authError);
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const ok = await login(username, password);
    setSubmitting(false);
    if (ok) {
      const dest = location.state?.from || '/dashboard';
      navigate(dest, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-accent/10 p-3 rounded-xl border border-accent/30 mb-4">
            <Shield className="h-8 w-8 text-accent" aria-hidden="true" />
          </div>
          <h1 className="font-bold text-2xl tracking-wider text-text">R.A.P.I.D.</h1>
          <p className="text-[11px] text-accent font-mono tracking-widest uppercase mt-1">
            Police Dispatch — Command Centre
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <div>
            <label htmlFor="username" className="text-[10px] uppercase text-muted font-bold tracking-wider mb-1 block">
              Username
            </label>
            <div className={FIELD}>
              <User className="h-4 w-4 text-muted flex-shrink-0" aria-hidden="true" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                className="bg-transparent outline-none text-text placeholder:text-muted text-sm flex-1 min-w-0 py-2"
                placeholder="e.g. goa.commander"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="text-[10px] uppercase text-muted font-bold tracking-wider mb-1 block">
              Password
            </label>
            <div className={FIELD}>
              <Lock className="h-4 w-4 text-muted flex-shrink-0" aria-hidden="true" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="bg-transparent outline-none text-text placeholder:text-muted text-sm flex-1 min-w-0 py-2"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* The icon carries the state alongside the colour, and role="alert"
              announces it. A sign-in failure read by colour alone is the case
              DIRECTION.md §3 rules out. */}
          {authError && (
            <div
              role="alert"
              className="flex items-start gap-2 text-status-critical text-xs bg-status-critical/10 border border-status-critical/30 rounded-lg px-3 py-2"
            >
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-px" aria-hidden="true" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !username || !password}
            className="w-full min-h-[44px] bg-accent hover:bg-accent/90 border border-accent text-on-solid font-medium text-sm rounded-lg px-4 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-[10px] text-muted font-mono mt-4">
          Demo prototype — credentials issued by system administrator
        </p>
      </div>
    </div>
  );
}
