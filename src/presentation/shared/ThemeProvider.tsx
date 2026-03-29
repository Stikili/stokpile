import { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'navy' | 'aurora' | 'light';

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

const CYCLE: AppTheme[] = ['navy', 'aurora', 'light'];

function applyTheme(theme: AppTheme) {
  const root = window.document.documentElement;
  // Remove all theme-related classes
  root.classList.remove('dark', 'light', 'theme-aurora');

  if (theme === 'navy') {
    root.classList.add('dark');
  } else if (theme === 'aurora') {
    root.classList.add('dark', 'theme-aurora');
  }
  // 'light' — no dark class, clean :root styles apply
}

export function ThemeProvider({
  children,
  defaultTheme = 'navy',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('stokpile-theme') as AppTheme;
      if (stored && CYCLE.includes(stored)) return stored;
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

  // Cycles navy → aurora → light → navy
  const toggleTheme = () => {
    const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length];
    setTheme(next);
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
