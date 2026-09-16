import { useEffect, useState } from 'react';

// Recharts paints SVG, so it takes literal colour values rather than Tailwind
// classes. Reading the tokens off :root keeps the charts on the same palette
// as everything else and, because the values are re-read whenever the
// data-theme attribute flips, keeps them following the theme toggle too.
const TOKENS = {
  page: '--color-page',
  surface: '--color-surface',
  border: '--color-border',
  borderStrong: '--color-border-strong',
  text: '--color-text',
  muted: '--color-text-muted',
  accent: '--color-accent',
  onSolid: '--color-text-on-solid',
  normal: '--status-normal',
  warning: '--status-warning',
  urgent: '--status-urgent',
  critical: '--status-critical',
};

const read = () => {
  if (typeof document === 'undefined') return {};
  const cs = getComputedStyle(document.documentElement);
  const out = {};
  for (const [key, prop] of Object.entries(TOKENS)) {
    out[key] = cs.getPropertyValue(prop).trim();
  }
  out.chart = [1, 2, 3, 4, 5, 6, 7].map(n => cs.getPropertyValue(`--chart-${n}`).trim());
  return out;
};

export default function useThemeTokens() {
  const [tokens, setTokens] = useState(read);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setTokens(read()));
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    // No read here: the stylesheet is render-blocking, so the lazy useState
    // above already saw the resolved values on the first render.
    return () => observer.disconnect();
  }, []);

  return tokens;
}
