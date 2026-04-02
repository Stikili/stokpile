export type SubscriptionTier = 'trial' | 'free' | 'community' | 'pro' | 'enterprise';

export type SubscriptionFeature =
  | 'announcements'
  | 'payment-proofs'
  | 'rotation'
  | 'grocery'
  | 'burial'
  | 'sms'
  | 'flutterwave'
  | 'reports'
  | 'analytics'
  | 'penalties'
  | 'audit';

export interface Subscription {
  groupId: string;
  tier: SubscriptionTier;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  updatedAt: string;
}

export const TIER_FEATURES: Record<SubscriptionTier, SubscriptionFeature[]> = {
  free:       ['announcements'],
  community:  ['announcements', 'payment-proofs', 'rotation', 'grocery', 'burial', 'sms', 'flutterwave'],
  pro:        ['announcements', 'payment-proofs', 'rotation', 'grocery', 'burial', 'sms', 'flutterwave', 'reports', 'analytics', 'penalties', 'audit'],
  enterprise: ['announcements', 'payment-proofs', 'rotation', 'grocery', 'burial', 'sms', 'flutterwave', 'reports', 'analytics', 'penalties', 'audit'],
  trial:      ['announcements', 'payment-proofs', 'rotation', 'grocery', 'burial', 'sms', 'flutterwave', 'reports', 'analytics', 'penalties', 'audit'],
};

export const TIER_LIMITS: Record<SubscriptionTier, { groups: number | null; members: number | null }> = {
  free:       { groups: 1,    members: 10   },
  community:  { groups: 3,    members: 30   },
  pro:        { groups: null, members: 100  },
  enterprise: { groups: null, members: null },
  trial:      { groups: null, members: 100  },
};

export const TIER_PRICES: Record<SubscriptionTier, string> = {
  free:       'Free',
  trial:      'Free (3-month trial)',
  community:  'R49 / month',
  pro:        'R149 / month',
  enterprise: 'Contact us',
};

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  free:       'Free',
  trial:      'Trial',
  community:  'Community',
  pro:        'Pro',
  enterprise: 'Enterprise',
};
