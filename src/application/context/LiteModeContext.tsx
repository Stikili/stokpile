import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LiteModeContextValue {
  liteMode: boolean;
  toggleLiteMode: () => void;
}

const LiteModeContext = createContext<LiteModeContextValue>({ liteMode: false, toggleLiteMode: () => {} });

export function LiteModeProvider({ children }: { children: ReactNode }) {
  const [liteMode, setLiteMode] = useState(() => localStorage.getItem('liteMode') === 'true');

  useEffect(() => {
    localStorage.setItem('liteMode', String(liteMode));
    if (liteMode) {
      document.documentElement.classList.add('lite-mode');
    } else {
      document.documentElement.classList.remove('lite-mode');
    }
  }, [liteMode]);

  const toggleLiteMode = () => setLiteMode(v => !v);

  return (
    <LiteModeContext.Provider value={{ liteMode, toggleLiteMode }}>
      {children}
    </LiteModeContext.Provider>
  );
}

export const useLiteMode = () => useContext(LiteModeContext);
