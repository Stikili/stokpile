import { useState, useEffect } from 'react';

export function useInviteToken() {
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [showAuthForInvite, setShowAuthForInvite] = useState(false);

  useEffect(() => {
    // Check for invite token in URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (token) {
      setInviteToken(token);
    }
  }, []);

  const clearInviteToken = () => {
    setInviteToken(null);
    setShowAuthForInvite(false);
    window.history.replaceState({}, '', '/');
  };

  const requireAuth = () => {
    setShowAuthForInvite(true);
  };

  return {
    inviteToken,
    showAuthForInvite,
    clearInviteToken,
    requireAuth,
  };
}
