import type { ResolvedTheme, ThemePreference } from './types';

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'dark') {
    return 'dark';
  }
  if (preference === 'light') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function applyResolvedTheme(resolved: ResolvedTheme): void {
  document.documentElement.dataset.theme = resolved;
}

export function applyThemePreference(preference: ThemePreference): ResolvedTheme {
  document.documentElement.dataset.themePreference = preference;
  const resolved = resolveTheme(preference);
  applyResolvedTheme(resolved);
  return resolved;
}
