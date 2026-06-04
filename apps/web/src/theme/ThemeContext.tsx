import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { applyThemePreference, resolveTheme } from './resolveTheme';
import { readStoredThemePreference, writeStoredThemePreference } from './themeStorage';
import type { ResolvedTheme, ThemePreference } from './types';

export type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    readStoredThemePreference(),
  );
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    resolveTheme(readStoredThemePreference()),
  );

  const setPreference = useCallback((next: ThemePreference) => {
    writeStoredThemePreference(next);
    setPreferenceState(next);
    setResolved(applyThemePreference(next));
  }, []);

  useEffect(() => {
    setResolved(applyThemePreference(preference));
  }, [preference]);

  useEffect(() => {
    if (preference !== 'system') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      setResolved(applyThemePreference('system'));
    };

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
