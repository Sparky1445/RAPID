// Theme persistence — reads/writes the same 'rapid-theme' key that
// index.html's inline hydration script checks before first paint, and the
// same 'data-theme' attribute RapidMap.jsx's MutationObserver already
// watches (see useIsDarkTheme). This is the only place that should ever
// write the attribute, so those two stay in sync with localStorage.
const STORAGE_KEY = 'rapid-theme';

export function getTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch (e) {
    return 'light';
  }
}

export function setTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private browsing and blocked site data both throw here. The theme still
    // applies for this page load; it just will not be remembered.
  }
}

export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}
