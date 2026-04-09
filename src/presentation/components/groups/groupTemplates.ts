// Pre-configured templates for common group types.
// Users can pick a template and only edit the name.

export interface GroupTemplate {
  id: string;
  label: string;
  emoji: string;
  groupType: string;
  description: string;
  contributionFrequency: 'weekly' | 'monthly' | 'yearly';
  defaultContribution?: number;
  hint: string;
}

export const GROUP_TEMPLATES: GroupTemplate[] = [
  {
    id: 'monthly-rotating',
    label: 'Monthly Rotating Stokvel',
    emoji: '🔄',
    groupType: 'rotating',
    description: 'Members take turns receiving the full pot each month.',
    contributionFrequency: 'monthly',
    defaultContribution: 500,
    hint: 'Most common SA stokvel format',
  },
  {
    id: 'burial-society',
    label: 'Burial Society',
    emoji: '🕊️',
    groupType: 'burial',
    description: 'Members pool monthly levies to cover funeral costs.',
    contributionFrequency: 'monthly',
    defaultContribution: 100,
    hint: 'Includes beneficiary and claim management',
  },
  {
    id: 'grocery-stokvel',
    label: 'Grocery Stokvel',
    emoji: '🛒',
    groupType: 'grocery',
    description: 'Save weekly to bulk-buy groceries at year-end.',
    contributionFrequency: 'weekly',
    defaultContribution: 50,
    hint: 'Includes shopping list coordination',
  },
  {
    id: 'investment-club',
    label: 'Investment Club',
    emoji: '📈',
    groupType: 'investment',
    description: 'Pool monthly contributions to invest collectively.',
    contributionFrequency: 'monthly',
    defaultContribution: 1000,
    hint: 'For shares, property, or business ventures',
  },
  {
    id: 'goal-savings',
    label: 'Goal-Based Savings',
    emoji: '🎯',
    groupType: 'goal',
    description: 'Save toward a shared target — school fees, holiday, equipment.',
    contributionFrequency: 'monthly',
    defaultContribution: 200,
    hint: 'Set a target amount and deadline',
  },
  {
    id: 'chama-kenya',
    label: 'Chama (Kenya)',
    emoji: '🤝',
    groupType: 'chama',
    description: 'East African investment group with lending facility.',
    contributionFrequency: 'monthly',
    defaultContribution: 500,
    hint: 'Common in Kenya and Uganda',
  },
  {
    id: 'susu-west',
    label: 'Susu (West Africa)',
    emoji: '💰',
    groupType: 'susu',
    description: 'Daily/weekly contributions, one member collects each round.',
    contributionFrequency: 'weekly',
    defaultContribution: 100,
    hint: 'Common in Ghana, Nigeria',
  },
  {
    id: 'tontine-fr',
    label: 'Tontine (Francophone)',
    emoji: '🌍',
    groupType: 'tontine',
    description: 'Francophone African savings circle with rotating payouts.',
    contributionFrequency: 'monthly',
    defaultContribution: 300,
    hint: 'Common in Senegal, DRC, Cameroon',
  },
  {
    id: 'vsla',
    label: 'VSLA (Village Savings & Loan)',
    emoji: '🌱',
    groupType: 'vsla',
    description: 'Save together and access small loans from the shared fund.',
    contributionFrequency: 'weekly',
    defaultContribution: 50,
    hint: 'Rural community savings model',
  },
  {
    id: 'custom',
    label: 'Custom (start blank)',
    emoji: '⚙️',
    groupType: 'rotating',
    description: 'Configure everything from scratch.',
    contributionFrequency: 'monthly',
    hint: 'Full control over all settings',
  },
];
