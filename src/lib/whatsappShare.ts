// Simple helpers for launching WhatsApp with a pre-filled invite message.
// Uses the universal wa.me link so it works across platforms without the
// WhatsApp Business API.

export function openWhatsAppShare(opts: {
  // Optional recipient phone (international, no + or spaces). If omitted,
  // WhatsApp lets the user pick a chat.
  phone?: string;
  message: string;
}) {
  const base = opts.phone ? `https://wa.me/${opts.phone.replace(/\D/g, '')}` : 'https://wa.me/';
  const url = `${base}?text=${encodeURIComponent(opts.message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function buildGroupInviteMessage(params: {
  groupName: string;
  inviteUrl: string;
  contributionHint?: string; // e.g. "R500 monthly"
}) {
  const hint = params.contributionHint ? `\nContribution: ${params.contributionHint}` : '';
  return (
    `Hi — you're invited to join ${params.groupName} on Stokpile 🤝${hint}\n\n` +
    `Tap to join: ${params.inviteUrl}\n\n` +
    `Stokpile runs our stokvel with transparent contributions, payouts and meeting notes.`
  );
}

export function buildPaymentReminderMessage(params: {
  memberName: string;
  groupName: string;
  amount: string; // e.g. "R500"
  period: string; // e.g. "March 2026"
}) {
  return (
    `Hi ${params.memberName} 👋\n\n` +
    `Just a gentle reminder — your ${params.amount} contribution for ${params.period} ` +
    `to ${params.groupName} hasn't come through yet. ` +
    `Let us know if there's an issue.\n\nSiyabonga!`
  );
}
