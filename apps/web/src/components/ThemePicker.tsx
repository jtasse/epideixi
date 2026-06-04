import { useTheme } from '@/theme/useTheme';
import type { ThemePreference } from '@/theme/types';

const options: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function ThemePicker() {
  const { preference, setPreference } = useTheme();

  return (
    <label className="theme-picker">
      <span className="theme-picker-label">Theme</span>
      <select
        className="theme-picker-select"
        value={preference}
        onChange={(event) =>
          setPreference(event.target.value as ThemePreference)
        }
        aria-label="Color theme"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
