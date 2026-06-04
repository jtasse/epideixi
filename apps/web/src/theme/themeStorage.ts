import type { ThemePreference } from './types';

export const THEME_STORAGE_KEY = 'epideixi-theme';

const preferences: ThemePreference[] = ['light', 'dark', 'system'];

export function readStoredThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value && preferences.includes(value as ThemePreference)) {
      return value as ThemePreference;
    }
  } catch {
    /* private browsing */
  }
  return 'system';
}

export function writeStoredThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* private browsing */
  }
}
