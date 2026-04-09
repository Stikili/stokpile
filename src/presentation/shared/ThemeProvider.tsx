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
  // Remove all theme-related classes (legacy 'theme-aurora' is also stripped
  // in case a user has an older value persisted in localStorage).
  root.classList.remove('dark', 'light', 'theme-aurora');

  if (theme === 'navy') {
    root.classList.add('dark');
  }
  // 'light' — no dark class, clean :root styles apply
}

export function ThemeProvider({
  children,
  defaultTheme = 'navy',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('stokpile-theme') as AppTheme | 'aurora';
      if (stored === 'aurora') return 'navy'; // migrate stale aurora users
      if (stored && CYCLE.includes(stored as AppTheme)) return stored as AppTheme;
    }
    return defaultTheme;
  });

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
