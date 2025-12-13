export const THEME_STORAGE_KEY = 'theme'

export function getThemeInitScript() {
  // Runs before React hydration to avoid a flash of incorrect theme.
  return `
  (function () {
    try {
      var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
      var theme = (stored === 'dark' || stored === 'light') ? stored
        : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      if (theme === 'dark') document.documentElement.classList.add('dark');
    } catch (e) {}
  })();
  `
}


