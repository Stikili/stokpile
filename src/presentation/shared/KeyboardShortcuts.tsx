import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/presentation/ui/dialog';
import { Kbd } from '@/presentation/ui/kbd';

interface KeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcuts({ open, onOpenChange }: KeyboardShortcutsProps) {
  const shortcuts = [
    { keys: ['Ctrl', 'N'], description: 'New Contribution' },
    { keys: ['Ctrl', 'P'], description: 'New Payout' },
    { keys: ['Ctrl', 'M'], description: 'Schedule Meeting' },
    { keys: ['?'], description: 'Show shortcuts' },
    { keys: ['Esc'], description: 'Close dialog' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate faster
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm">{shortcut.description}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, i) => (
                  <Kbd key={i}>{key}</Kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useKeyboardShortcuts(handlers: {
  onNewContribution?: () => void;
  onNewPayout?: () => void;
  onNewMeeting?: () => void;
  onShowShortcuts?: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handlers.onNewContribution?.();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlers.onNewPayout?.();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        handlers.onNewMeeting?.();
      } else if (e.key === '?') {
        e.preventDefault();
        handlers.onShowShortcuts?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
