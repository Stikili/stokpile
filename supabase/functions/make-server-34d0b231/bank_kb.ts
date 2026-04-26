// Curated knowledge base of SA bank accounts relevant to stokvels.
// Structural facts only (fees, signatory rules, withdrawal limits, who it
// suits). Live interest rates are intentionally OMITTED — they change too
// often to maintain here. Pilo enriches with web_search for fresh rates.
//
// Update cadence: review quarterly. Last reviewed: 2026-04-24.
// When updating, bump LAST_REVIEWED so Pilo can flag staleness.

export const LAST_REVIEWED = '2026-04-24';

export type BankAccount = {
  bank: string;
  product: string;
  url: string;
  category: 'stokvel' | 'savings' | 'business' | 'transactional';
  monthlyFeeZar: number | null;     // null = no fee
  signatoriesSupported: number | null;
  minOpeningBalanceZar: number | null;
  joinIntegerSignatoryRequired: boolean;  // does the account require a joint-signatory rule
  withdrawalsRestricted: boolean;          // notice required to access funds
  bestFor: string[];                       // group types / sizes
  watchOuts: string[];
  notes: string;
};

export const BANK_ACCOUNTS: BankAccount[] = [
  {
    bank: 'Standard Bank',
    product: 'Society Scheme Account',
    url: 'https://www.standardbank.co.za/southafrica/personal/products-and-services/bank-with-us/transactional-accounts/society-scheme-account',
    category: 'stokvel',
    monthlyFeeZar: 25,
    signatoriesSupported: 4,
    minOpeningBalanceZar: 0,
    joinIntegerSignatoryRequired: true,
    withdrawalsRestricted: false,
    bestFor: ['burial society', 'rotating stokvel', 'investment club', 'any 5+ member group'],
    watchOuts: ['Monthly fee on small groups eats into yield', 'Branch visit needed for some changes'],
    notes: 'Most-used stokvel account in SA. Strong brand trust. Has a partnership with StokFella, which can complicate switching to Stokpile.',
  },
  {
    bank: 'FNB',
    product: 'Stokvel Account (Pure Save)',
    url: 'https://www.fnb.co.za/savings-investments/savings-account/stokvel-account.html',
    category: 'stokvel',
    monthlyFeeZar: 0,
    signatoriesSupported: 4,
    minOpeningBalanceZar: 0,
    joinIntegerSignatoryRequired: true,
    withdrawalsRestricted: false,
    bestFor: ['burial society', 'grocery stokvel', 'rotating stokvel'],
    watchOuts: ['Interest rate tiered by balance — small groups earn lower rate', 'eWallet limits on withdrawals'],
    notes: 'No monthly fee makes this strong for groups under R20k. Tiered interest rates mean larger groups get better yield.',
  },
  {
    bank: 'Nedbank',
    product: 'Club Account',
    url: 'https://personal.nedbank.co.za/bank/savings-and-investments/club-account.html',
    category: 'stokvel',
    monthlyFeeZar: 0,
    signatoriesSupported: 5,
    minOpeningBalanceZar: 100,
    joinIntegerSignatoryRequired: true,
    withdrawalsRestricted: false,
    bestFor: ['investment clubs', 'larger stokvels (20+)', 'chamas with KYC requirements'],
    watchOuts: ['Higher minimum opening balance', 'Limited branch network in rural areas'],
    notes: 'Targets investment-club style groups with stronger governance. Good for groups planning to formalise.',
  },
  {
    bank: 'Capitec',
    product: 'Savings Plan + linked transactional',
    url: 'https://www.capitecbank.co.za/personal/save/our-savings-plans/',
    category: 'savings',
    monthlyFeeZar: 0,
    signatoriesSupported: null,
    minOpeningBalanceZar: 0,
    joinIntegerSignatoryRequired: false,
    withdrawalsRestricted: false,
    bestFor: ['small stokvels (< 8 members)', 'goal-based savings', 'treasurer-managed accounts'],
    watchOuts: [
      'NO dedicated stokvel/joint-account product yet',
      'Treasurer holds in personal name = trust risk',
      'Use only when group trusts treasurer absolutely',
    ],
    notes: 'Capitec has the strongest interest rates and lowest fees in SA but no group-account product. Common workaround: treasurer opens in personal name. This is what 60%+ of small SA stokvels actually do.',
  },
  {
    bank: 'African Bank',
    product: 'MyWORLD Savings Pocket',
    url: 'https://www.africanbank.co.za/en/home/savings-investments/myworld-account',
    category: 'savings',
    monthlyFeeZar: 0,
    signatoriesSupported: null,
    minOpeningBalanceZar: 0,
    joinIntegerSignatoryRequired: false,
    withdrawalsRestricted: false,
    bestFor: ['small stokvels', 'goal-based savings', 'high-interest small balances'],
    watchOuts: ['No formal stokvel product', 'Pocket is treasurer-controlled, not joint'],
    notes: 'Often the highest interest rate on small balances in SA. No multi-signatory option, so same trust caveat as Capitec.',
  },
  {
    bank: 'TymeBank',
    product: 'GoalSave',
    url: 'https://www.tymebank.co.za/save/goalsave/',
    category: 'savings',
    monthlyFeeZar: 0,
    signatoriesSupported: null,
    minOpeningBalanceZar: 0,
    joinIntegerSignatoryRequired: false,
    withdrawalsRestricted: false,
    bestFor: ['young digital-first stokvels', 'goal-based saving with named pots', 'small groups (< 10 members)'],
    watchOuts: ['No joint-account', 'No branch network if dispute occurs'],
    notes: 'Strong tiered interest after 90/180/365 days. GoalSave pockets useful for visualising progress. Digital-only — older members may struggle.',
  },
  {
    bank: 'Discovery Bank',
    product: 'Vitality Money Suite Account',
    url: 'https://www.discovery.co.za/portal/individual/discovery-bank-suite-account',
    category: 'transactional',
    monthlyFeeZar: 75,
    signatoriesSupported: null,
    minOpeningBalanceZar: 0,
    joinIntegerSignatoryRequired: false,
    withdrawalsRestricted: false,
    bestFor: ['high-income groups', 'investment clubs already in Discovery ecosystem'],
    watchOuts: ['Monthly fee high vs alternatives', 'No native stokvel features', 'Vitality requirements for best rates'],
    notes: 'Only relevant if members are already in the Discovery ecosystem. Otherwise overpriced for stokvel use.',
  },
  {
    bank: 'Absa',
    product: 'Club / Society Account (TruSave)',
    url: 'https://www.absa.co.za/personal/save-and-invest/all-savings-accounts/trusave/',
    category: 'savings',
    monthlyFeeZar: 0,
    signatoriesSupported: 4,
    minOpeningBalanceZar: 250,
    joinIntegerSignatoryRequired: true,
    withdrawalsRestricted: true,
    bestFor: ['burial societies', 'longer-term savings (12+ month cycles)'],
    watchOuts: ['32-day notice on some withdrawals', 'Higher opening minimum'],
    notes: 'Notice-period feature is good for groups that want to enforce discipline. Bad for emergency withdrawals.',
  },
  {
    bank: 'African Bank',
    product: 'Fixed Deposit (3/6/12-month)',
    url: 'https://www.africanbank.co.za/en/home/savings-investments/fixed-deposit',
    category: 'savings',
    monthlyFeeZar: 0,
    signatoriesSupported: null,
    minOpeningBalanceZar: 500,
    joinIntegerSignatoryRequired: false,
    withdrawalsRestricted: true,
    bestFor: ['groups with idle cash they won\'t need for 3+ months', 'burial society reserve funds'],
    watchOuts: ['Locked until maturity', 'Penalty for early withdrawal'],
    notes: 'For end-of-year stokvels: park the pot in a 6-month FD around June, withdraw before December payouts. Often beats normal savings rates significantly.',
  },
];

export function filterAccountsForGroup(opts: {
  groupType?: string;       // 'rotating' | 'burial' | 'grocery' | 'chama' | etc.
  memberCount?: number;
  monthlyVolumeZar?: number;
  needsMultipleSignatories?: boolean;
}): BankAccount[] {
  return BANK_ACCOUNTS.filter((a) => {
    if (opts.needsMultipleSignatories && !a.joinIntegerSignatoryRequired) return false;
    return true;
  });
}

export function bankKbAsTextForLLM(): string {
  return BANK_ACCOUNTS.map((a) => {
    const fee = a.monthlyFeeZar === null ? 'free' : `R${a.monthlyFeeZar}/mo`;
    const sigs = a.signatoriesSupported === null ? 'single' : `${a.signatoriesSupported} signatories`;
    return `${a.bank} — ${a.product}
  fee: ${fee} · ${sigs} · open at ${a.url}
  best for: ${a.bestFor.join(', ')}
  watch-outs: ${a.watchOuts.join('; ')}
  ${a.notes}`;
  }).join('\n\n');
}
