export type Language = 'en';

export const translations = {
  en: {
    // Navigation
    nav_dashboard: 'Dashboard',
    nav_contributions: 'Contributions',
    nav_payouts: 'Payouts',
    nav_meetings: 'Meetings',
    nav_info: 'Info',
    nav_more: 'More',

    // Actions
    action_add_contribution: 'Add Contribution',
    action_schedule_payout: 'Schedule Payout',
    action_create_meeting: 'Create Meeting',
    action_create_group: 'Create Group',
    action_join_group: 'Join Group',
    action_invite_members: 'Invite Members',
    action_export: 'Export',
    action_save: 'Save',
    action_cancel: 'Cancel',
    action_delete: 'Delete',
    action_confirm: 'Confirm',
    action_pay_now: 'Pay Now',

    // Status
    status_paid: 'Paid',
    status_unpaid: 'Unpaid',
    status_scheduled: 'Scheduled',
    status_completed: 'Completed',
    status_cancelled: 'Cancelled',
    status_pending: 'Pending',

    // Group types
    group_type_rotating: 'Rotating (Merry-go-round)',
    group_type_burial: 'Burial Society',
    group_type_grocery: 'Grocery Stokvel',
    group_type_investment: 'Investment Club',
    group_type_chama: 'Chama (Investment Club)',
    group_type_susu: 'Susu (Rotating Savings)',
    group_type_tontine: 'Tontine',
    group_type_vsla: 'VSLA (Village Savings)',
    group_type_goal: 'Goal-Based Savings',

    // Dashboard
    dashboard_total_contributions: 'Total Contributions',
    dashboard_total_payouts: 'Total Payouts',
    dashboard_net_balance: 'Net Balance',
    dashboard_next_payout: 'Next Payout',

    // Notifications
    notify_contribution_added: 'Contribution added',
    notify_payout_scheduled: 'Payout scheduled',
    notify_meeting_created: 'Meeting created',

    // Labels
    label_amount: 'Amount (ZAR)',
    label_date: 'Date',
    label_member: 'Member',
    label_group_name: 'Group Name',
    label_description: 'Description',
    label_phone: 'WhatsApp Number',
    label_group_type: 'Group Type',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function t(lang: Language, key: TranslationKey): string {
  return translations[lang][key] ?? translations.en[key] ?? key;
}
