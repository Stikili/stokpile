import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface PiloState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  openPilo: () => void;
  closePilo: () => void;
}

const PiloCtx = createContext<PiloState | null>(null);

export function PiloProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  const openPilo = useCallback(() => setOpen(true), []);
  const closePilo = useCallback(() => setOpen(false), []);
  return (
    <PiloCtx.Provider value={{ open, setOpen, toggle, openPilo, closePilo }}>
      {children}
    </PiloCtx.Provider>
  );
}

export function usePilo(): PiloState {
  const ctx = useContext(PiloCtx);
  if (!ctx) {
    // Graceful fallback so menus don't crash if Pilo isn't mounted
    return {
      open: false,
      setOpen: () => {},
      toggle: () => {},
      openPilo: () => {},
      closePilo: () => {},
    };
  }
  return ctx;
}
