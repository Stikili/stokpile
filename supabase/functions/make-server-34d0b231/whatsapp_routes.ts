// WhatsApp Business scaffolding. Works with any BSP that sends JSON webhooks
// (Twilio, 360dialog, Meta Cloud API). Designed to be wired up once the
// user has:
//   1. A Meta Business account
//   2. A BSP provider (Twilio recommended for SA: R0.50-0.80 per session)
//   3. A verified WhatsApp sender number
//   4. Approved template messages for outbound notifications
//
// Environment vars used:
//   WHATSAPP_PROVIDER = 'twilio' | 'meta' | 'dialog360'
//   WHATSAPP_ACCESS_TOKEN
//   WHATSAPP_PHONE_NUMBER_ID      (Meta) or ACCOUNT_SID (Twilio)
//   WHATSAPP_WEBHOOK_VERIFY_TOKEN (Meta)

const PREFIX = '/make-server-34d0b231';

export function registerWhatsappRoutes(app: any, supabaseAdmin: any) {
  const provider = typeof Deno !== 'undefined' ? Deno.env.get('WHATSAPP_PROVIDER') : '';

  // Meta webhook verification handshake (only needed if using Meta Cloud API)
  app.get(`${PREFIX}/whatsapp/webhook`, (c: any) => {
    const verifyToken = typeof Deno !== 'undefined' ? Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN') : '';
    const mode = c.req.query('hub.mode');
    const token = c.req.query('hub.verify_token');
    const challenge = c.req.query('hub.challenge');
    if (mode === 'subscribe' && token && token === verifyToken) {
      return c.text(challenge || 'ok');
    }
    return c.text('Forbidden', 403);
  });

  // Incoming message webhook — parses the payload and dispatches to a
  // command handler. Message format examples the bot understands:
  //   "log R500 Thandi"          — treasurer-solo: log a contribution
  //   "status"                   — group summary
  //   "help"                     — available commands
  app.post(`${PREFIX}/whatsapp/webhook`, async (c: any) => {
    try {
      const payload = await c.req.json().catch(() => ({}));

      // Normalise across providers
      const msg = extractMessage(payload, provider || 'meta');
      if (!msg) return c.json({ received: true });

      // Persist the inbound message for audit
      await supabaseAdmin.from('audit_log').insert({
        group_id: null,
        user_email: msg.fromNumber,
        action: 'whatsapp_incoming',
        details: { text: msg.text, provider },
      }).catch(() => {});

      // Identify which Stokpile user owns the phone
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('phone', msg.fromNumber)
        .maybeSingle();

      if (!profile) {
        await sendWhatsApp(msg.fromNumber, replies.unknown);
        return c.json({ received: true });
      }

      const reply = await handleCommand({
        supabaseAdmin,
        text: msg.text,
        userEmail: profile.email,
        userName: profile.full_name,
      });

      await sendWhatsApp(msg.fromNumber, reply);
      return c.json({ received: true });
    } catch (err: any) {
      console.warn('whatsapp webhook error:', err?.message);
      return c.json({ received: true });
    }
  });
}

// ────────────────────────────────────────────────────────────
// Provider normalisation
// ────────────────────────────────────────────────────────────
function extractMessage(payload: any, provider: string): { fromNumber: string; text: string } | null {
  try {
    if (provider === 'twilio') {
      if (!payload.From || !payload.Body) return null;
      return { fromNumber: payload.From.replace(/^whatsapp:/, '').replace(/\D/g, ''), text: String(payload.Body) };
    }
    // Meta Cloud API default shape
    const entry = payload?.entry?.[0]?.changes?.[0]?.value;
    const message = entry?.messages?.[0];
    if (!message) return null;
    return {
      fromNumber: (message.from || '').replace(/\D/g, ''),
      text: message.text?.body || '',
    };
  } catch { return null; }
}

// ────────────────────────────────────────────────────────────
// Command router
// ────────────────────────────────────────────────────────────
const replies = {
  unknown: `Welcome 👋 I don't recognise this number. Link your WhatsApp in Stokpile (Profile → Edit Profile) so we can help you next time.`,
  help: `Commands I understand:\n\n• log R500 [name] — log a contribution\n• status — your group's balance this month\n• overdue — members who haven't paid\n• help — show this message`,
  ambiguous: `I couldn't understand that. Try "log R500 Thandi" or "status" or "help".`,
  noGroup: `You aren't admin of any group yet. Create one in the app first.`,
};

async function handleCommand(params: {
  supabaseAdmin: any; text: string; userEmail: string; userName?: string;
}): Promise<string> {
  const { supabaseAdmin, text, userEmail } = params;
  const lower = text.trim().toLowerCase();
  if (lower === 'help' || lower === '?') return replies.help;

  // Find an admin group for the user — v1 assumes one. Future: pick by name.
  const { data: admins } = await supabaseAdmin
    .from('group_memberships')
    .select('group_id, groups(name)')
    .eq('user_email', userEmail)
    .eq('role', 'admin')
    .eq('status', 'approved')
    .limit(1);
  const adminRow = admins?.[0];
  if (!adminRow) return replies.noGroup;
  const groupId = adminRow.group_id;
  const groupName = adminRow.groups?.name || 'your group';

  // Status
  if (lower === 'status') {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    const { data: paid } = await supabaseAdmin
      .from('contributions')
      .select('amount, paid, date')
      .eq('group_id', groupId)
      .gte('date', monthStart.toISOString().slice(0, 10));
    const total = (paid || []).filter((c: any) => c.paid).reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
    return `${groupName} — this month\nContributed: R ${total.toFixed(2)}`;
  }

  // Overdue
  if (lower === 'overdue') {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    const { data: members } = await supabaseAdmin
      .from('group_memberships')
      .select('user_email, managed_name')
      .eq('group_id', groupId)
      .in('status', ['approved', 'managed']);
    const { data: paid } = await supabaseAdmin
      .from('contributions')
      .select('user_email')
      .eq('group_id', groupId)
      .gte('date', monthStart.toISOString().slice(0, 10))
      .eq('paid', true);
    const paidSet = new Set((paid || []).map((c: any) => c.user_email));
    const overdue = (members || []).filter((m: any) => !paidSet.has(m.user_email));
    if (overdue.length === 0) return `✅ Everyone in ${groupName} has paid this month.`;
    const names = overdue.map((m: any) => m.managed_name || m.user_email.split('@')[0]).slice(0, 10);
    return `${groupName} — overdue this month:\n${names.map((n: string) => `• ${n}`).join('\n')}`;
  }

  // log R500 Thandi  or  log 500 Thandi
  const logMatch = lower.match(/^log\s+r?\s*(\d+(?:\.\d{1,2})?)\s+(.+)$/i);
  if (logMatch) {
    const amount = Number(logMatch[1]);
    const memberInput = logMatch[2].trim();
    const slug = memberInput.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24);
    const synthesised = `managed+${groupId.slice(0, 8)}+${slug}@stokpile.local`;

    // Try real profile first (by name match), then managed synthesised
    const { data: byName } = await supabaseAdmin
      .from('group_memberships')
      .select('user_email, managed_name, profiles(full_name)')
      .eq('group_id', groupId)
      .in('status', ['approved', 'managed']);
    const match = (byName || []).find((m: any) =>
      m.profiles?.full_name?.toLowerCase().includes(memberInput.toLowerCase()) ||
      m.managed_name?.toLowerCase().includes(memberInput.toLowerCase()) ||
      m.user_email === synthesised,
    );
    if (!match) return `Couldn't find a member named "${memberInput}" in ${groupName}.`;

    const { error } = await supabaseAdmin.from('contributions').insert({
      group_id: groupId,
      user_email: match.user_email,
      amount,
      date: new Date().toISOString().split('T')[0],
      paid: true,
      created_by: userEmail,
    });
    if (error) return `Failed to log: ${error.message}`;
    return `✅ Logged R${amount.toFixed(2)} for ${memberInput} in ${groupName}.`;
  }

  return replies.ambiguous;
}

// ────────────────────────────────────────────────────────────
// Outbound — send a WhatsApp message (used by relay + replies)
// ────────────────────────────────────────────────────────────
export async function sendWhatsApp(toNumber: string, body: string): Promise<void> {
  const provider = typeof Deno !== 'undefined' ? Deno.env.get('WHATSAPP_PROVIDER') : '';
  const token = typeof Deno !== 'undefined' ? Deno.env.get('WHATSAPP_ACCESS_TOKEN') : '';
  if (!provider || !token) {
    console.warn('WhatsApp not configured; skipped send to', toNumber);
    return;
  }
  try {
    if (provider === 'twilio') {
      const sid = typeof Deno !== 'undefined' ? Deno.env.get('TWILIO_ACCOUNT_SID') : '';
      const from = typeof Deno !== 'undefined' ? Deno.env.get('TWILIO_WHATSAPP_FROM') : '';
      if (!sid || !from) return;
      const body_ = new URLSearchParams({
        From: `whatsapp:${from}`,
        To: `whatsapp:+${toNumber}`,
        Body: body,
      });
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body_.toString(),
      });
    } else if (provider === 'meta') {
      const phoneId = typeof Deno !== 'undefined' ? Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') : '';
      if (!phoneId) return;
      await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toNumber,
          type: 'text',
          text: { body },
        }),
      });
    }
  } catch (e: any) {
    console.warn('sendWhatsApp failed:', e?.message);
  }
}

// ────────────────────────────────────────────────────────────
// Announcement relay — push a group's announcement to opted-in phones.
// Called from the announcements POST handler.
// ────────────────────────────────────────────────────────────
export async function relayAnnouncementToWhatsApp(params: {
  supabaseAdmin: any;
  groupId: string;
  title: string;
  content: string;
}) {
  const { supabaseAdmin, groupId, title, content } = params;
  // Collect approved members' phones
  const { data: rows } = await supabaseAdmin
    .from('group_memberships')
    .select('user_email, managed_phone, profiles(phone)')
    .eq('group_id', groupId)
    .in('status', ['approved', 'managed']);

  const phones = (rows || [])
    .map((r: any) => r.managed_phone || r.profiles?.phone)
    .filter((p: string | null): p is string => Boolean(p))
    .map((p: string) => p.replace(/\D/g, ''));

  const body = `📣 ${title}\n\n${content}`;
  for (const phone of phones) {
    await sendWhatsApp(phone, body);
  }
}
