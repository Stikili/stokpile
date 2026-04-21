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
  paystackSubscriptionCode: string | null;
  paystackCustomerCode: string | null;
  nextBillingDate: string | null;
  updatedAt: string;
}

// Free gets rotation because it's the core SA stokvel pattern — gating it
// would send new users away before they see value. The gate is the 8-member
// cap (hit fast) and lack of governance tools (audit/penalties/reports).
export const TIER_FEATURES: Record<SubscriptionTier, SubscriptionFeature[]> = {
  free:       ['announcements', 'rotation'],
  community:  ['announcements', 'rotation', 'payment-proofs', 'grocery', 'burial', 'sms', 'flutterwave'],
  pro:        ['announcements', 'rotation', 'payment-proofs', 'grocery', 'burial', 'sms', 'flutterwave', 'reports', 'analytics', 'penalties', 'audit'],
  enterprise: ['announcements', 'rotation', 'payment-proofs', 'grocery', 'burial', 'sms', 'flutterwave', 'reports', 'analytics', 'penalties', 'audit'],
  trial:      ['announcements', 'rotation', 'payment-proofs', 'grocery', 'burial', 'sms', 'flutterwave', 'reports', 'analytics', 'penalties', 'audit'],
};

// `smsPerMonth` — outbound SMS notifications per group per month.
// `piloPerMonth` — Pilo AI queries per user per month.
// `piloSonnet` — whether Pilo auto-upgrades to Sonnet 4.6 on analytical questions.
export const TIER_LIMITS: Record<SubscriptionTier, {
  groups: number | null;
  members: number | null;
  smsPerMonth: number | null;
  piloPerMonth: number;
  piloSonnet: boolean;
}> = {
  free:       { groups: 1,    members: 8,    smsPerMonth: 0,    piloPerMonth: 5,    piloSonnet: false },
  community:  { groups: 2,    members: 30,   smsPerMonth: 50,   piloPerMonth: 30,   piloSonnet: false },
  pro:        { groups: null, members: 100,  smsPerMonth: null, piloPerMonth: 200,  piloSonnet: true  },
  enterprise: { groups: null, members: null, smsPerMonth: null, piloPerMonth: 1000, piloSonnet: true  },
  trial:      { groups: null, members: 100,  smsPerMonth: null, piloPerMonth: 200,  piloSonnet: true  },
};

export const TIER_PRICES: Record<SubscriptionTier, string> = {
  free:       'Free',
  trial:      'Free (3-month trial)',
  community:  'R19 / month',
  pro:        'R39 / month',
  enterprise: 'Contact us',
};

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  free:       'Free',
  trial:      'Trial',
  community:  'Starter',
  pro:        'Pro',
  enterprise: 'Enterprise',
};
