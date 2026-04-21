// Global floating-action-button that opens the Pilo panel.
// Appears on every logged-in screen; adapts to mobile/desktop.

import { useEffect } from 'react';
import { PiloPanel } from './PiloPanel';
import { usePilo } from './PiloContext';
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
  const { open, setOpen, toggle } = usePilo();

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  return (
    <>
      {/* FAB shown on desktop only — mobile has Pilo in the bottom nav */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open Pilo AI assistant"
        className="group hidden lg:flex fixed bottom-6 right-6 z-40
                   h-14 w-14 rounded-full
                   bg-gradient-to-br from-primary via-primary to-emerald-500
                   shadow-xl shadow-primary/30
                   items-center justify-center
                   transition-transform hover:scale-105 active:scale-95
                   ring-4 ring-background"
      >
        <Sparkles className="h-6 w-6 text-white transition-transform group-hover:rotate-12" />
        <span className="sr-only">Pilo</span>
        <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping opacity-20 pointer-events-none" />
      </button>
      <PiloPanel open={open} onOpenChange={setOpen} context={props} />
    </>
  );
}
