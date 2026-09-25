import { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'navy' | 'light';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: AppTheme;
};

type ThemeProviderState = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

const CYCLE: AppTheme[] = ['navy', 'light'];

function applyTheme(theme: AppTheme) {
  const root = window.document.documentElement;
  root.classList.remove('dark', 'light', 'theme-aurora');
  if (theme === 'navy') {
    root.classList.add('dark');
  }
}

// 'navy' is the stored value for the dark theme (kept for existing users'
// saved preference). With no saved choice, follow the device setting.
function systemTheme(): AppTheme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'navy' : 'light';
}

function getStoredTheme(defaultTheme?: AppTheme): AppTheme {
  if (typeof window === 'undefined') return defaultTheme ?? 'light';
  let stored: string | null = null;
  try { stored = localStorage.getItem('stokpile-theme'); } catch { /* storage blocked */ }
  if (stored === 'aurora') return 'navy';
  if (stored === 'navy' || stored === 'light') return stored;
  return defaultTheme ?? systemTheme();
}

// Apply theme BEFORE first render to prevent flash
if (typeof window !== 'undefined') {
  applyTheme(getStoredTheme());
}

export function ThemeProvider({
  children,
  defaultTheme,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<AppTheme>(() => getStoredTheme(defaultTheme));

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (newTheme: AppTheme) => {
    localStorage.setItem('stokpile-theme', newTheme);
    setThemeState(newTheme);
  };

  // Cycles navy ↔ light
  const toggleTheme = () => {
    setTheme(theme === 'navy' ? 'light' : 'navy');
  };

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
