// Global listener: when any API call returns 402 (Payment Required), the
// fetch client fires a stokpile:upgrade-prompt event. This provider catches
// the event and opens the UpgradeDialog with a reason banner so users see
// what they hit and have a direct path to fix it.

import { useEffect, useState, ReactNode, useCallback } from 'react';
import { UpgradeDialog } from './UpgradeDialog';
import { UPGRADE_PROMPT_EVENT, UpgradePromptDetail } from '@/infrastructure/api/client';

interface UpgradePromptProviderProps {
  // Fallback groupId used when the 402 payload didn't include one (e.g. a
  // platform-wide limit such as AI quota). The upgrade flow needs *some*
  // group to subscribe against, so we fall back to the currently selected one.
  fallbackGroupId?: string;
  children: ReactNode;
}

export function UpgradePromptProvider({ fallbackGroupId, children }: UpgradePromptProviderProps) {
  const [prompt, setPrompt] = useState<UpgradePromptDetail | null>(null);

  const handleEvent = useCallback((e: Event) => {
    const custom = e as CustomEvent<UpgradePromptDetail>;
    if (custom.detail) setPrompt(custom.detail);
  }, []);

  useEffect(() => {
    window.addEventListener(UPGRADE_PROMPT_EVENT, handleEvent as EventListener);
    return () => window.removeEventListener(UPGRADE_PROMPT_EVENT, handleEvent as EventListener);
  }, [handleEvent]);

  const groupId = prompt?.groupId || fallbackGroupId || '';

  return (
    <>
      {children}
      {prompt && groupId && (
        <UpgradeDialog
          open
          onOpenChange={(o) => { if (!o) setPrompt(null); }}
          groupId={groupId}
          reason={prompt.message}
        />
      )}
    </>
  );
}
