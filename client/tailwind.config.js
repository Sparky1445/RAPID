/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens — named for what a colour is FOR, backed by CSS
        // custom properties in src/index.css so [data-theme="dark"] can
        // redefine the values without touching a single component class.
        //
        // Wrapped in color-mix so Tailwind's /NN opacity modifier works.
        // A bare var() cannot carry an alpha channel, and Tailwind 3.4
        // responds by emitting no rule at all — bg-accent/10 silently
        // produced no background. The tokens stay hex because index.css
        // reads them directly with var() in a dozen places.
        page: 'color-mix(in srgb, var(--color-page) calc(<alpha-value> * 100%), transparent)',
        surface: 'color-mix(in srgb, var(--color-surface) calc(<alpha-value> * 100%), transparent)',
        border: 'color-mix(in srgb, var(--color-border) calc(<alpha-value> * 100%), transparent)',
        'border-strong': 'color-mix(in srgb, var(--color-border-strong) calc(<alpha-value> * 100%), transparent)',
        text: 'color-mix(in srgb, var(--color-text) calc(<alpha-value> * 100%), transparent)',
        muted: 'color-mix(in srgb, var(--color-text-muted) calc(<alpha-value> * 100%), transparent)',
        accent: 'color-mix(in srgb, var(--color-accent) calc(<alpha-value> * 100%), transparent)',
        'on-solid': 'color-mix(in srgb, var(--color-text-on-solid) calc(<alpha-value> * 100%), transparent)',
        status: {
          normal: 'color-mix(in srgb, var(--status-normal) calc(<alpha-value> * 100%), transparent)',
          warning: 'color-mix(in srgb, var(--status-warning) calc(<alpha-value> * 100%), transparent)',
          urgent: 'color-mix(in srgb, var(--status-urgent) calc(<alpha-value> * 100%), transparent)',
          critical: 'color-mix(in srgb, var(--status-critical) calc(<alpha-value> * 100%), transparent)',
        },
      },
      fontFamily: {
        // Paper Command (docs/research/DIRECTION.md, direction A): one text
        // family, one accent (mono, for anything tabular — coordinates,
        // timestamps, IDs, battery/telemetry readouts).
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
