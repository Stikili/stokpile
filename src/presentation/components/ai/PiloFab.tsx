// Global floating-action-button that opens the Pilo panel.
// Appears on every logged-in screen; adapts to mobile/desktop.

import { useEffect, useState } from 'react';
import { PiloPanel } from './PiloPanel';
import { Sparkles } from 'lucide-react';

interface PiloFabProps {
  groupId?: string;
  groupName?: string;
  isAdmin?: boolean;
  tier?: string;
  lifetimePoints?: number;
  commissionRate?: number;
}

export function PiloFab(props: PiloFabProps) {
  const [open, setOpen] = useState(false);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open Pilo AI assistant"
        className="group fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40
                   h-12 w-12 md:h-14 md:w-14 rounded-full
                   bg-gradient-to-br from-primary via-primary to-emerald-500
                   shadow-xl shadow-primary/30
                   flex items-center justify-center
                   transition-transform hover:scale-105 active:scale-95
                   ring-4 ring-background"
      >
        <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-white transition-transform group-hover:rotate-12" />
        <span className="sr-only">Pilo</span>
        {/* Subtle pulse halo */}
        <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping opacity-20 pointer-events-none" />
      </button>
      <PiloPanel open={open} onOpenChange={setOpen} context={props} />
    </>
  );
}
