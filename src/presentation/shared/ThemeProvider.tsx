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

function getStoredTheme(defaultTheme: AppTheme): AppTheme {
  if (typeof window === 'undefined') return defaultTheme;
  const stored = localStorage.getItem('stokpile-theme');
  if (stored === 'aurora') return 'navy';
  if (stored === 'navy' || stored === 'light') return stored;
  return defaultTheme;
}

// Apply theme BEFORE first render to prevent flash
if (typeof window !== 'undefined') {
  applyTheme(getStoredTheme('navy'));
}

export function ThemeProvider({
  children,
  defaultTheme = 'navy',
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
