/* ==================================================================
   Stellar · Hell/Dunkel-Umschaltung
   Die Wahl wird im Browser gespeichert; ohne Wahl gilt die Systemeinstellung.
   ================================================================== */

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'stellar-theme';

export function loadTheme(): Theme {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') return stored;
    } catch {
        // Speicher nicht verfügbar (z. B. privater Modus) → Systemeinstellung
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
    document.documentElement.dataset.theme = theme;
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch {
        // ignorieren – die Wahl gilt dann nur bis zum Neuladen
    }
}
