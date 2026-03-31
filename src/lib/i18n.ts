export type Language = 'en' | 'zu' | 'xh' | 'st';

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
    label_group_type: 'Uhlobo Lweqembu',
  },
  xh: {
    // Navigation
    nav_dashboard: 'Ikhasi',
    nav_contributions: 'Iminikelo',
    nav_payouts: 'Intlawulo',
    nav_meetings: 'Iintlanganiso',
    nav_info: 'Ulwazi',
    nav_more: 'Okunye',

    // Actions
    action_add_contribution: 'Yongeza Umnikelo',
    action_schedule_payout: 'Hlela Intlawulo',
    action_create_meeting: 'Yenza Intlanganiso',
    action_create_group: 'Yenza Iqela',
    action_join_group: 'Joyina Iqela',
    action_invite_members: 'Mema Amalungu',
    action_export: 'Khuphumla',
    action_save: 'Gcina',
    action_cancel: 'Rhoxisa',
    action_delete: 'Cima',
    action_confirm: 'Qinisekisa',
    action_pay_now: 'Hlawula Ngoku',

    // Status
    status_paid: 'Kuhlawuliwe',
    status_unpaid: 'Akuhlawuliwanga',
    status_scheduled: 'Kuhleliwe',
    status_completed: 'Kuphelisiwe',
    status_cancelled: 'Kurhoxisiwe',
    status_pending: 'Kulindwe',

    // Group types
    group_type_rotating: 'Iguquguqukayo (Merry-go-round)',
    group_type_burial: 'Inhlangano Yokungcwaba',
    group_type_grocery: 'Stokvel Yokutya',
    group_type_investment: 'Iclubhu Yokutyala Imali',

    // Dashboard
    dashboard_total_contributions: 'Yonke Iminikelo',
    dashboard_total_payouts: 'Yonke Intlawulo',
    dashboard_net_balance: 'Ibhalansi',
    dashboard_next_payout: 'Intlawulo Elandelayo',

    // Notifications
    notify_contribution_added: 'Umnikelo uongezwe',
    notify_payout_scheduled: 'Intlawulo ihlelelwe',
    notify_meeting_created: 'Intlanganiso yenziwe',

    // Labels
    label_amount: 'Imali (ZAR)',
    label_date: 'Umhla',
    label_member: 'Ilungu',
    label_group_name: 'Igama Leqela',
    label_description: 'Inkcazelo',
    label_phone: 'Inombolo ye-WhatsApp',
    label_group_type: 'Uhlobo Lweqela',
  },
  st: {
    // Navigation
    nav_dashboard: 'Letlapa la Tshebetso',
    nav_contributions: 'Ditjhefo',
    nav_payouts: 'Ditshehelo',
    nav_meetings: 'Dikopano',
    nav_info: 'Tsebo',
    nav_more: 'Tse ding',

    // Actions
    action_add_contribution: 'Kenya Tjhefo',
    action_schedule_payout: 'Beha Tshehetso',
    action_create_meeting: 'Theha Kopano',
    action_create_group: 'Theha Sehlopha',
    action_join_group: 'Kena Setjhabeng',
    action_invite_members: 'Mema Maloko',
    action_export: 'Romella Kantle',
    action_save: 'Boloka',
    action_cancel: 'Hana',
    action_delete: 'Hlakola',
    action_confirm: 'Netefatsa',
    action_pay_now: 'Lefa Jwale',

    // Status
    status_paid: 'Ho Lefetswe',
    status_unpaid: 'Ha Ho Lefuwe',
    status_scheduled: 'Ho Behilwe',
    status_completed: 'Ho Phethilwe',
    status_cancelled: 'Ho Hanilwe',
    status_pending: 'Ho Emetse',

    // Group types
    group_type_rotating: 'E Phepholang (Merry-go-round)',
    group_type_burial: 'Mokgatlo wa Diphulo',
    group_type_grocery: 'Stokvel ya Dijo',
    group_type_investment: 'Kalafo ya Tjhelete',

    // Dashboard
    dashboard_total_contributions: 'Ditjhefo Tsohle',
    dashboard_total_payouts: 'Ditshehelo Tsohle',
    dashboard_net_balance: 'Tekanyo',
    dashboard_next_payout: 'Tshehetso e Latelang',

    // Notifications
    notify_contribution_added: 'Tjhefo e kenyeletsitswe',
    notify_payout_scheduled: 'Tshehetso e behilwe',
    notify_meeting_created: 'Kopano e thehilwe',

    // Labels
    label_amount: 'Tjhelete (ZAR)',
    label_date: 'Letsatsi',
    label_member: 'Setho',
    label_group_name: 'Lebitso la Sehlopha',
    label_description: 'Tlhaloso',
    label_phone: 'Nomoro ya WhatsApp',
    label_group_type: 'Mofuta wa Sehlopha',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function t(lang: Language, key: TranslationKey): string {
  return translations[lang][key] ?? translations.en[key] ?? key;
}
