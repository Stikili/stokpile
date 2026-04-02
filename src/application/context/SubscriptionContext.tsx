import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '@/infrastructure/api';
import type { Subscription, SubscriptionTier, SubscriptionFeature } from '@/domain/types';
import { TIER_FEATURES } from '@/domain/types';

interface SubscriptionContextValue {
  subscription: Subscription | null;
  tier: SubscriptionTier;
  loading: boolean;
  isTrialActive: boolean;
  daysLeftInTrial: number | null;
  isTrialExpired: boolean;
  hasFeature: (feature: SubscriptionFeature) => boolean;
  refresh: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscription: null,
  tier: 'free',
  loading: false,
  isTrialActive: false,
  daysLeftInTrial: null,
  isTrialExpired: false,
  hasFeature: () => true,
  refresh: () => {},
});

export function SubscriptionProvider({
  groupId,
  children,
}: {
  groupId: string | null;
  children: React.ReactNode;
}) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!groupId) { setSubscription(null); return; }
    setLoading(true);
    try {
      const sub = await api.getSubscription(groupId);
      setSubscription(sub);
    } catch {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  const derived = useMemo(() => {
    const tier: SubscriptionTier = subscription?.tier ?? 'free';
    const isTrialActive = tier === 'trial';
    const daysLeftInTrial = isTrialActive && subscription?.trialEndsAt
      ? Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / 86400000)
      : null;
    const isTrialExpired =
      tier === 'free' &&
      !!subscription?.trialStartedAt &&
      !!subscription?.trialEndsAt &&
      new Date(subscription.trialEndsAt) < new Date();

    const hasFeature = (feature: SubscriptionFeature) =>
      (TIER_FEATURES[tier] as string[]).includes(feature);

    return { tier, isTrialActive, daysLeftInTrial, isTrialExpired, hasFeature };
  }, [subscription]);

  return (
    <SubscriptionContext.Provider value={{ subscription, loading, refresh: load, ...derived }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);
