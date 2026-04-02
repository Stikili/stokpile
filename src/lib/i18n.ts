export type Language = 'en' | 'zu' | 'xh' | 'st' | 'tn' | 'sw' | 'sn' | 'fr' | 'pt';

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
    group_type_chama: 'Chama (Ikilabhu Yokutshalwa Kwemali)',
    group_type_susu: 'Susu (Ukuphendukana Kwemali)',
    group_type_tontine: 'Tontine',
    group_type_vsla: 'VSLA (Ukugcinwa Kwemali Emizini)',
    group_type_goal: 'Ukugcina Ngenjongo',

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
    group_type_chama: 'Chama (Iclubhu Yokutyala Imali)',
    group_type_susu: 'Susu (Ukujikeleza Koonga)',
    group_type_tontine: 'Tontine',
    group_type_vsla: 'VSLA (Ukonga Emaphandleni)',
    group_type_goal: 'Ukonga Ngenjongo',

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
    group_type_chama: 'Chama (Mokgatlo wa Matsete)',
    group_type_susu: 'Susu (Phepho ya Chelete)',
    group_type_tontine: 'Tontine',
    group_type_vsla: 'VSLA (Poloko ya Chelete Metse-Metse)',
    group_type_goal: 'Poloko ya Morero',

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
  tn: {
    // Navigation
    nav_dashboard: 'Letlapa la Tiro',
    nav_contributions: 'Dithuelo',
    nav_payouts: 'Dituelo',
    nav_meetings: 'Dikopano',
    nav_info: 'Tshedimosetso',
    nav_more: 'Go tswelela',

    // Actions
    action_add_contribution: 'Tlhomamisa Thuelo',
    action_schedule_payout: 'Beela Tuelo Nako',
    action_create_meeting: 'Simolola Kopano',
    action_create_group: 'Bopa Sehlopha',
    action_join_group: 'Tsena mo Sehlopeng',
    action_invite_members: 'Laletsa Maloko',
    action_export: 'Ntsha Faele',
    action_save: 'Boloka',
    action_cancel: 'Emisa',
    action_delete: 'Phimola',
    action_confirm: 'Netefatsa',
    action_pay_now: 'Duela Jaanong',

    // Status
    status_paid: 'Go Duetswe',
    status_unpaid: 'Ga Go Duetswe',
    status_scheduled: 'Go Beetsweng',
    status_completed: 'Go Feditswe',
    status_cancelled: 'Go Emisiwa',
    status_pending: 'Go Letetswe',

    // Group types
    group_type_rotating: 'E Phirololang (Merry-go-round)',
    group_type_burial: 'Mokgatlho wa Poloko',
    group_type_grocery: 'Stokvel ya Dijo',
    group_type_investment: 'Sehlopha sa Matseno',
    group_type_chama: 'Chama (Sehlopha sa Matseno)',
    group_type_susu: 'Susu (Go Phirola ga Madi)',
    group_type_tontine: 'Tontine',
    group_type_vsla: 'VSLA (Poloko ya Madi Metse-Metse)',
    group_type_goal: 'Poloko ya Maikaelelo',

    // Dashboard
    dashboard_total_contributions: 'Dithuelo Tsotlhe',
    dashboard_total_payouts: 'Dituelo Tsotlhe',
    dashboard_net_balance: 'Tekanyo ya Madi',
    dashboard_next_payout: 'Tuelo e e Latelang',

    // Notifications
    notify_contribution_added: 'Thuelo e tlhomamisitswe',
    notify_payout_scheduled: 'Tuelo e beetsweng nako',
    notify_meeting_created: 'Kopano e simololwa',

    // Labels
    label_amount: 'Tshimo ya Madi (ZAR)',
    label_date: 'Letsatsi',
    label_member: 'Leloko',
    label_group_name: 'Leina la Sehlopha',
    label_description: 'Tlhaloso',
    label_phone: 'Nomoro ya WhatsApp',
    label_group_type: 'Mofuta wa Sehlopha',
  },
  sw: {
    // Navigation
    nav_dashboard: 'Dashibodi',
    nav_contributions: 'Michango',
    nav_payouts: 'Malipo',
    nav_meetings: 'Mikutano',
    nav_info: 'Habari',
    nav_more: 'Zaidi',

    // Actions
    action_add_contribution: 'Ongeza Mchango',
    action_schedule_payout: 'Panga Malipo',
    action_create_meeting: 'Unda Mkutano',
    action_create_group: 'Unda Kikundi',
    action_join_group: 'Jiunge na Kikundi',
    action_invite_members: 'Alika Wanachama',
    action_export: 'Hamisha',
    action_save: 'Hifadhi',
    action_cancel: 'Ghairi',
    action_delete: 'Futa',
    action_confirm: 'Thibitisha',
    action_pay_now: 'Lipa Sasa',

    // Status
    status_paid: 'Amelipwa',
    status_unpaid: 'Hajalipwa',
    status_scheduled: 'Imepangwa',
    status_completed: 'Imekamilika',
    status_cancelled: 'Imeghairiwa',
    status_pending: 'Inasubiri',

    // Group types
    group_type_rotating: 'Inayozunguka (Merry-go-round)',
    group_type_burial: 'Chama cha Mazishi',
    group_type_grocery: 'Stokvel ya Vyakula',
    group_type_investment: 'Klabu ya Uwekezaji',
    group_type_chama: 'Chama (Klabu ya Uwekezaji)',
    group_type_susu: 'Susu (Akiba ya Kuzunguka)',
    group_type_tontine: 'Tontine',
    group_type_vsla: 'VSLA (Akiba ya Kijiji)',
    group_type_goal: 'Akiba yenye Lengo',

    // Dashboard
    dashboard_total_contributions: 'Jumla ya Michango',
    dashboard_total_payouts: 'Jumla ya Malipo',
    dashboard_net_balance: 'Salio Halisi',
    dashboard_next_payout: 'Malipo Yajayo',

    // Notifications
    notify_contribution_added: 'Mchango umeongezwa',
    notify_payout_scheduled: 'Malipo yamepangwa',
    notify_meeting_created: 'Mkutano umeundwa',

    // Labels
    label_amount: 'Kiasi (ZAR)',
    label_date: 'Tarehe',
    label_member: 'Mwanachama',
    label_group_name: 'Jina la Kikundi',
    label_description: 'Maelezo',
    label_phone: 'Nambari ya WhatsApp',
    label_group_type: 'Aina ya Kikundi',
  },
  sn: {
    // Navigation
    nav_dashboard: 'Peji Guru',
    nav_contributions: 'Mipiro',
    nav_payouts: 'Mibairo',
    nav_meetings: 'Misangano',
    nav_info: 'Ruzivo',
    nav_more: 'Zvimwe',

    // Actions
    action_add_contribution: 'Wedzera Mupiro',
    action_schedule_payout: 'Rongera Mubayiro',
    action_create_meeting: 'Gadzira Musangano',
    action_create_group: 'Gadzira Boka',
    action_join_group: 'Pinda muBoka',
    action_invite_members: 'Koka Nhengo',
    action_export: 'Budisa Faira',
    action_save: 'Chengetedza',
    action_cancel: 'Dzima',
    action_delete: 'Bvisa',
    action_confirm: 'Simbisa',
    action_pay_now: 'Bhadara Iye zvino',

    // Status
    status_paid: 'Rabhadharwa',
    status_unpaid: 'Harabhadharwi',
    status_scheduled: 'Yarongwa',
    status_completed: 'Yapera',
    status_cancelled: 'Yadzimwa',
    status_pending: 'Yakamirira',

    // Group types
    group_type_rotating: 'Inotevedzerana (Merry-go-round)',
    group_type_burial: 'Sangano reMariro',
    group_type_grocery: 'Stokvel yeZvokudya',
    group_type_investment: 'Kirabhu yeKuisa Mari',
    group_type_chama: 'Chama (Kirabhu yeKuisa Mari)',
    group_type_susu: 'Susu (Kuchengeta Kutevedzerana)',
    group_type_tontine: 'Tontine',
    group_type_vsla: 'VSLA (Kuchengeta muKamusha)',
    group_type_goal: 'Kuchengeta Chikonzero',

    // Dashboard
    dashboard_total_contributions: 'Mipiro Yose',
    dashboard_total_payouts: 'Mibairo Yose',
    dashboard_net_balance: 'Huwandu Hwakasara',
    dashboard_next_payout: 'Mubayiro Unotevera',

    // Notifications
    notify_contribution_added: 'Mupiro wawedzerwa',
    notify_payout_scheduled: 'Mubayiro warongwa',
    notify_meeting_created: 'Musangano wagadzirwa',

    // Labels
    label_amount: 'Huwandu (ZAR)',
    label_date: 'Zuva',
    label_member: 'Nhengo',
    label_group_name: 'Zita reBoka',
    label_description: 'Tsananguro',
    label_phone: 'Nhamba yeWhatsApp',
    label_group_type: 'Rudzi rweBoka',
  },
  fr: {
    // Navigation
    nav_dashboard: 'Tableau de bord',
    nav_contributions: 'Cotisations',
    nav_payouts: 'Versements',
    nav_meetings: 'Réunions',
    nav_info: 'Infos',
    nav_more: 'Plus',

    // Actions
    action_add_contribution: 'Ajouter une cotisation',
    action_schedule_payout: 'Planifier un versement',
    action_create_meeting: 'Créer une réunion',
    action_create_group: 'Créer un groupe',
    action_join_group: 'Rejoindre un groupe',
    action_invite_members: 'Inviter des membres',
    action_export: 'Exporter',
    action_save: 'Enregistrer',
    action_cancel: 'Annuler',
    action_delete: 'Supprimer',
    action_confirm: 'Confirmer',
    action_pay_now: 'Payer maintenant',

    // Status
    status_paid: 'Payé',
    status_unpaid: 'Non payé',
    status_scheduled: 'Planifié',
    status_completed: 'Terminé',
    status_cancelled: 'Annulé',
    status_pending: 'En attente',

    // Group types
    group_type_rotating: 'Rotatif (Merry-go-round)',
    group_type_burial: 'Tontine funéraire',
    group_type_grocery: 'Tontine alimentaire',
    group_type_investment: 'Club d\'investissement',
    group_type_chama: 'Chama (Club d\'investissement)',
    group_type_susu: 'Susu (Épargne rotative)',
    group_type_tontine: 'Tontine',
    group_type_vsla: 'AVEC (Épargne villageoise)',
    group_type_goal: 'Épargne par objectif',

    // Dashboard
    dashboard_total_contributions: 'Total des cotisations',
    dashboard_total_payouts: 'Total des versements',
    dashboard_net_balance: 'Solde net',
    dashboard_next_payout: 'Prochain versement',

    // Notifications
    notify_contribution_added: 'Cotisation ajoutée',
    notify_payout_scheduled: 'Versement planifié',
    notify_meeting_created: 'Réunion créée',

    // Labels
    label_amount: 'Montant (ZAR)',
    label_date: 'Date',
    label_member: 'Membre',
    label_group_name: 'Nom du groupe',
    label_description: 'Description',
    label_phone: 'Numéro WhatsApp',
    label_group_type: 'Type de groupe',
  },
  pt: {
    // Navigation
    nav_dashboard: 'Painel',
    nav_contributions: 'Contribuições',
    nav_payouts: 'Pagamentos',
    nav_meetings: 'Reuniões',
    nav_info: 'Informações',
    nav_more: 'Mais',

    // Actions
    action_add_contribution: 'Adicionar Contribuição',
    action_schedule_payout: 'Agendar Pagamento',
    action_create_meeting: 'Criar Reunião',
    action_create_group: 'Criar Grupo',
    action_join_group: 'Entrar no Grupo',
    action_invite_members: 'Convidar Membros',
    action_export: 'Exportar',
    action_save: 'Guardar',
    action_cancel: 'Cancelar',
    action_delete: 'Eliminar',
    action_confirm: 'Confirmar',
    action_pay_now: 'Pagar Agora',

    // Status
    status_paid: 'Pago',
    status_unpaid: 'Não pago',
    status_scheduled: 'Agendado',
    status_completed: 'Concluído',
    status_cancelled: 'Cancelado',
    status_pending: 'Pendente',

    // Group types
    group_type_rotating: 'Rotativo (Xitique)',
    group_type_burial: 'Associação Funerária',
    group_type_grocery: 'Poupança Alimentar',
    group_type_investment: 'Clube de Investimento',
    group_type_chama: 'Chama (Clube de Investimento)',
    group_type_susu: 'Susu (Poupança Rotativa)',
    group_type_tontine: 'Tontina',
    group_type_vsla: 'VSLA (Poupança Comunitária)',
    group_type_goal: 'Poupança por Objetivo',

    // Dashboard
    dashboard_total_contributions: 'Total de Contribuições',
    dashboard_total_payouts: 'Total de Pagamentos',
    dashboard_net_balance: 'Saldo Líquido',
    dashboard_next_payout: 'Próximo Pagamento',

    // Notifications
    notify_contribution_added: 'Contribuição adicionada',
    notify_payout_scheduled: 'Pagamento agendado',
    notify_meeting_created: 'Reunião criada',

    // Labels
    label_amount: 'Valor (ZAR)',
    label_date: 'Data',
    label_member: 'Membro',
    label_group_name: 'Nome do Grupo',
    label_description: 'Descrição',
    label_phone: 'Número de WhatsApp',
    label_group_type: 'Tipo de Grupo',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function t(lang: Language, key: TranslationKey): string {
  return translations[lang][key] ?? translations.en[key] ?? key;
}
