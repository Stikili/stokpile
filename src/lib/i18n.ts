export type Language = 'en' | 'zu';

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
  zu: {
    // Navigation
    nav_dashboard: 'Ikhasi',
    nav_contributions: 'Iminikelo',
    nav_payouts: 'Inkokhelo',
    nav_meetings: 'Imihlangano',
    nav_info: 'Ulwazi',
    nav_more: 'Okunye',

    // Actions
    action_add_contribution: 'Engeza Umnikelo',
    action_schedule_payout: 'Hlela Inkokhelo',
    action_create_meeting: 'Yenza Umhlangano',
    action_create_group: 'Yenza Iqembu',
    action_join_group: 'Joyina Iqembu',
    action_invite_members: 'Mema Amalungu',
    action_export: 'Khipha',
    action_save: 'Gcina',
    action_cancel: 'Khansela',
    action_delete: 'Susa',
    action_confirm: 'Qinisekisa',
    action_pay_now: 'Khokha Manje',

    // Status
    status_paid: 'Kukhokhiwe',
    status_unpaid: 'Akukhokhiwe',
    status_scheduled: 'Kuhlelelwe',
    status_completed: 'Kuqediwe',
    status_cancelled: 'Kukhanselwe',
    status_pending: 'Kulindile',

    // Group types
    group_type_rotating: 'Ukusatshalaliswa (Merry-go-round)',
    group_type_burial: 'Inhlangano Yokungcwaba',
    group_type_grocery: 'Stokvel Yokudla',
    group_type_investment: 'Ikilabhu Yokutshalwa Kwemali',

    // Dashboard
    dashboard_total_contributions: 'Iminikelo Yonke',
    dashboard_total_payouts: 'Inkokhelo Yonke',
    dashboard_net_balance: 'Ibhalansi',
    dashboard_next_payout: 'Inkokhelo Elandelayo',

    // Notifications
    notify_contribution_added: 'Umnikelo uengeziwe',
    notify_payout_scheduled: 'Inkokhelo ihlelelwe',
    notify_meeting_created: 'Umhlangano wenziwe',

    // Labels
    label_amount: 'Inani (ZAR)',
    label_date: 'Usuku',
    label_member: 'Ilungu',
    label_group_name: 'Igama Leqembu',
    label_description: 'Incazelo',
    label_phone: 'Inombolo ye-WhatsApp',
    label_group_type: 'Uhlobo Lwequembu',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function t(lang: Language, key: TranslationKey): string {
  return translations[lang][key] ?? translations.en[key] ?? key;
}
