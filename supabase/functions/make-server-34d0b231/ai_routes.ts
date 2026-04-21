// ai_routes.ts — AI assistant endpoints + Anthropic integration.
// Separate file to keep the AI plumbing isolated from the rest of the server.

const PREFIX = '/make-server-34d0b231';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Token pricing as of Claude 4.x (USD per MTok, then converted to ZAR at a
// fixed ~18.5 rate for display. Adjust if ZAR shifts materially).
const ZAR_PER_USD = 18.5;
const PRICING: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  // Haiku 4.5
  'claude-haiku-4-5-20251001': { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
  // Sonnet 4.6
  'claude-sonnet-4-6':         { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
};

// Monthly caps per tier
const MONTHLY_CAPS: Record<string, number> = {
  free:       5,
  community: 30,
  pro:       200,
  trial:     200,
  enterprise: 1000,
};

// ────────────────────────────────────────────────────────────
// Tool definitions — Claude can call these to fetch live data
// ────────────────────────────────────────────────────────────
type ToolResult = { ok: boolean; data?: unknown; error?: string };

function makeTools(supabaseAdmin: any, userEmail: string) {
  return {
    definitions: [
      {
        name: 'get_members',
        description: 'List approved members of a specific group. Returns array of {email, fullName, role, joinedAt}.',
        input_schema: {
          type: 'object',
          properties: { groupId: { type: 'string' } },
          required: ['groupId'],
        },
      },
      {
        name: 'get_contributions',
        description: 'List contributions for a group within a date window. Returns array of {userEmail, amount, paid, date, paystackRef}.',
        input_schema: {
          type: 'object',
          properties: {
            groupId: { type: 'string' },
            since: { type: 'string', description: 'ISO date, inclusive' },
            until: { type: 'string', description: 'ISO date, exclusive' },
          },
          required: ['groupId'],
        },
      },
      {
        name: 'get_payouts',
        description: 'List payouts for a group. Returns array of {recipientEmail, amount, status, scheduledFor, completedAt}.',
        input_schema: {
          type: 'object',
          properties: { groupId: { type: 'string' }, status: { type: 'string' } },
          required: ['groupId'],
        },
      },
      {
        name: 'get_meetings',
        description: 'List meetings for a group. Returns array of {title, scheduledFor, location, attendance}.',
        input_schema: {
          type: 'object',
          properties: { groupId: { type: 'string' } },
          required: ['groupId'],
        },
      },
      {
        name: 'get_audit_log',
        description: 'Recent audit log entries for a group. Returns array of {action, userEmail, details, timestamp}.',
        input_schema: {
          type: 'object',
          properties: { groupId: { type: 'string' }, limit: { type: 'number' } },
          required: ['groupId'],
        },
      },
      {
        name: 'get_rotation_order',
        description: 'Get the current payout rotation order for a rotating/susu group.',
        input_schema: {
          type: 'object',
          properties: { groupId: { type: 'string' } },
          required: ['groupId'],
        },
      },
      {
        name: 'get_group',
        description: 'Get group metadata: name, type, tier, currency, member count, created date, description.',
        input_schema: {
          type: 'object',
          properties: { groupId: { type: 'string' } },
          required: ['groupId'],
        },
      },
      {
        name: 'get_constitution',
        description: 'Get the group constitution/rules document if one exists.',
        input_schema: {
          type: 'object',
          properties: { groupId: { type: 'string' } },
          required: ['groupId'],
        },
      },
      {
        name: 'get_member_history',
        description: 'Full contribution history for one member in one group.',
        input_schema: {
          type: 'object',
          properties: { groupId: { type: 'string' }, memberEmail: { type: 'string' } },
          required: ['groupId', 'memberEmail'],
        },
      },
    ],

    async run(name: string, input: any): Promise<ToolResult> {
      try {
        // Guard: user must be a member of the target group for any group-scoped call
        if (input?.groupId) {
          const { data: m } = await supabaseAdmin
            .from('memberships')
            .select('role, status')
            .eq('group_id', input.groupId)
            .eq('user_email', userEmail)
            .maybeSingle();
          if (!m || m.status !== 'approved') {
            return { ok: false, error: 'Not a member of that group' };
          }
        }

        switch (name) {
          case 'get_members': {
            const { data } = await supabaseAdmin
              .from('memberships')
              .select('user_email, role, status, joined_at')
              .eq('group_id', input.groupId)
              .eq('status', 'approved')
              .order('joined_at');
            return { ok: true, data };
          }
          case 'get_contributions': {
            let q = supabaseAdmin
              .from('contributions')
              .select('user_email, amount, paid, date, paystack_ref')
              .eq('group_id', input.groupId)
              .order('date', { ascending: false })
              .limit(500);
            if (input.since) q = q.gte('date', input.since);
            if (input.until) q = q.lt('date', input.until);
            const { data } = await q;
            return { ok: true, data };
          }
          case 'get_payouts': {
            let q = supabaseAdmin
              .from('payouts')
              .select('recipient_email, amount, status, scheduled_for, completed_at')
              .eq('group_id', input.groupId)
              .order('scheduled_for', { ascending: false })
              .limit(200);
            if (input.status) q = q.eq('status', input.status);
            const { data } = await q;
            return { ok: true, data };
          }
          case 'get_meetings': {
            const { data } = await supabaseAdmin
              .from('meetings')
              .select('title, scheduled_for, location, attendance')
              .eq('group_id', input.groupId)
              .order('scheduled_for', { ascending: false })
              .limit(50);
            return { ok: true, data };
          }
          case 'get_audit_log': {
            const { data } = await supabaseAdmin
              .from('audit_log')
              .select('action, user_email, details, timestamp')
              .eq('group_id', input.groupId)
              .order('timestamp', { ascending: false })
              .limit(input.limit || 50);
            return { ok: true, data };
          }
          case 'get_rotation_order': {
            const { data } = await supabaseAdmin
              .from('rotation_orders')
              .select('slots, current_position, current_cycle')
              .eq('group_id', input.groupId)
              .maybeSingle();
            return { ok: true, data };
          }
          case 'get_group': {
            const { data } = await supabaseAdmin
              .from('groups')
              .select('name, group_type, description, currency, created_at')
              .eq('id', input.groupId)
              .maybeSingle();
            const { count } = await supabaseAdmin
              .from('memberships')
              .select('id', { count: 'exact', head: true })
              .eq('group_id', input.groupId)
              .eq('status', 'approved');
            const { data: sub } = await supabaseAdmin
              .from('subscriptions').select('tier').eq('group_id', input.groupId).maybeSingle();
            return { ok: true, data: { ...data, member_count: count, tier: sub?.tier } };
          }
          case 'get_constitution': {
            const { data } = await supabaseAdmin
              .from('constitutions')
              .select('content, version, updated_at')
              .eq('group_id', input.groupId)
              .maybeSingle();
            return { ok: true, data };
          }
          case 'get_member_history': {
            const { data } = await supabaseAdmin
              .from('contributions')
              .select('amount, paid, date')
              .eq('group_id', input.groupId)
              .eq('user_email', input.memberEmail)
              .order('date', { ascending: false })
              .limit(100);
            return { ok: true, data };
          }
          default:
            return { ok: false, error: `Unknown tool: ${name}` };
        }
      } catch (e: any) {
        return { ok: false, error: e?.message || 'Tool error' };
      }
    },
  };
}

// ────────────────────────────────────────────────────────────
// Anthropic call with tool loop + usage logging
// ────────────────────────────────────────────────────────────
type AiCallOptions = {
  model: string;
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: any }>;
  tools?: any[];
  maxTokens?: number;
  // Enable prompt caching on the system prompt
  cacheSystem?: boolean;
};

async function callAnthropic(apiKey: string, opts: AiCallOptions): Promise<any> {
  const systemBlocks = opts.cacheSystem
    ? [{ type: 'text', text: opts.system, cache_control: { type: 'ephemeral' } }]
    : [{ type: 'text', text: opts.system }];

  const body: any = {
    model: opts.model,
    max_tokens: opts.maxTokens || 2000,
    system: systemBlocks,
    messages: opts.messages,
  };
  if (opts.tools?.length) body.tools = opts.tools;

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err}`);
  }
  return res.json();
}

function calculateCost(model: string, usage: any): number {
  const p = PRICING[model] || PRICING['claude-haiku-4-5-20251001'];
  const inputTok = (usage.input_tokens || 0);
  const outputTok = (usage.output_tokens || 0);
  const cacheWriteTok = (usage.cache_creation_input_tokens || 0);
  const cacheReadTok = (usage.cache_read_input_tokens || 0);
  const usdPerMTok = 1 / 1_000_000;
  const usd =
    inputTok * p.input * usdPerMTok +
    outputTok * p.output * usdPerMTok +
    cacheWriteTok * p.cacheWrite * usdPerMTok +
    cacheReadTok * p.cacheRead * usdPerMTok;
  return Math.round(usd * ZAR_PER_USD * 10000) / 10000; // 4dp ZAR
}

// Public entrypoint: one shot, may loop through tool calls up to 5 times
export async function runAiTask(params: {
  supabaseAdmin: any;
  apiKey: string;
  user: { id: string; email: string };
  task: string;
  groupId?: string;
  model?: string;
  system: string;
  userMessage: string;
  language?: string;
  tier: string;
  useTools?: boolean;
  maxTokens?: number;
}) {
  const {
    supabaseAdmin, apiKey, user, task, groupId, system, userMessage,
    language, tier,
  } = params;
  const model = params.model || 'claude-haiku-4-5-20251001';
  const maxTokens = params.maxTokens || 2000;
  const started = Date.now();

  // Budget check
  const { data: usageRows } = await supabaseAdmin.rpc('ai_usage_this_month', { p_user_id: user.id });
  const callsThisMonth = Number(usageRows?.[0]?.call_count || 0);
  const cap = MONTHLY_CAPS[tier] ?? MONTHLY_CAPS.free;
  if (callsThisMonth >= cap) {
    throw Object.assign(new Error(`Monthly AI cap reached (${cap}). Upgrade for more.`), { status: 429 });
  }

  const tools = params.useTools !== false ? makeTools(supabaseAdmin, user.email) : null;

  const messages: Array<{ role: 'user' | 'assistant'; content: any }> = [
    { role: 'user', content: userMessage },
  ];

  let response: any;
  let totalUsage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
  let finalText = '';

  for (let loop = 0; loop < 5; loop++) {
    response = await callAnthropic(apiKey, {
      model,
      system,
      messages,
      tools: tools?.definitions,
      maxTokens,
      cacheSystem: true,
    });

    const u = response.usage || {};
    totalUsage.input_tokens += u.input_tokens || 0;
    totalUsage.output_tokens += u.output_tokens || 0;
    totalUsage.cache_creation_input_tokens += u.cache_creation_input_tokens || 0;
    totalUsage.cache_read_input_tokens += u.cache_read_input_tokens || 0;

    if (response.stop_reason === 'tool_use') {
      // Execute tool calls and feed results back
      messages.push({ role: 'assistant', content: response.content });
      const toolResults: any[] = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = await tools!.run(block.name, block.input);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
            is_error: !result.ok,
          });
        }
      }
      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Extract text
    for (const block of response.content) {
      if (block.type === 'text') finalText += block.text;
    }
    break;
  }

  const cost = calculateCost(model, totalUsage);
  const latency = Date.now() - started;

  // Log usage (best-effort, don't fail the call if logging fails)
  await supabaseAdmin.from('ai_usage').insert({
    user_id: user.id,
    user_email: user.email,
    group_id: groupId || null,
    task,
    model,
    input_tokens: totalUsage.input_tokens,
    output_tokens: totalUsage.output_tokens,
    cached_tokens: totalUsage.cache_read_input_tokens,
    cost_zar: cost,
    latency_ms: latency,
    success: true,
    language: language || 'en',
  }).then(() => {}, (e: any) => console.warn('ai_usage log failed:', e?.message));

  return { text: finalText, usage: totalUsage, costZar: cost, latencyMs: latency, callsThisMonth: callsThisMonth + 1, cap };
}

// ────────────────────────────────────────────────────────────
// Task registry — named prompts + model selection per task
// ────────────────────────────────────────────────────────────
export const TASKS: Record<string, {
  model: 'haiku' | 'sonnet';
  system: (ctx: any) => string;
  userPrompt: (ctx: any) => string;
  useTools?: boolean;
  maxTokens?: number;
  adminOnly?: boolean;
  requiresGroup?: boolean;
}> = {
  // ───── Phase 2: Member Q&A ─────
  ask_group: {
    model: 'haiku',
    requiresGroup: true,
    useTools: true,
    system: (ctx) => `You are a helpful assistant for a stokvel/savings group called "${ctx.groupName}".
The user is asking questions about the group. Use the available tools to fetch real data — never guess numbers.
Answer in ${ctx.language || 'English'}. Be concise, friendly, and culturally respectful (ubuntu principles).
If the question is about another group, politely decline.
When you use tool data, cite it briefly (e.g. "Based on contributions this month…").`,
    userPrompt: (ctx) => ctx.question,
  },
  tier_explainer: {
    model: 'haiku',
    useTools: false,
    maxTokens: 800,
    system: (ctx) => `Explain Stokpile rewards tiers to a member in ${ctx.language || 'English'}.
The member is currently ${ctx.tier || 'bronze'} with ${ctx.lifetimePoints || 0} lifetime points.
Tiers: Bronze (0 pts, 15% referral), Silver (500 pts, 18%), Gold (2000 pts, 20%), Platinum (10000 pts, 22%).
100 points = R1 subscription credit. Referral commissions paid monthly.
Be warm, specific to their position, and end with a concrete next step.`,
    userPrompt: (ctx) => ctx.question || 'Explain what my tier means and how to level up.',
  },
  rewards_calculator: {
    model: 'haiku',
    useTools: false,
    maxTokens: 600,
    system: (ctx) => `You calculate hypothetical rewards for a Stokpile user.
Current tier: ${ctx.tier}. Commission rate: ${ctx.commissionRate}%. Paid subscription months grant 50 pts each.
First-time referral conversion: +300 pts. Commissions: % of referred group's monthly subscription (R19 Community, R39 Pro).
100 points = R1 credit. Answer in ${ctx.language || 'English'}. Show your math briefly.`,
    userPrompt: (ctx) => ctx.scenario,
  },
  stokvel_quiz: {
    model: 'haiku',
    useTools: false,
    maxTokens: 900,
    system: (ctx) => `You help someone choose the right type of stokvel/savings group.
Types: rotating (members take turns receiving pot), susu (West African rotating), chama (East African investment club),
tontine (Francophone rotating), VSLA (village savings & loans), burial (funeral cover), grocery (bulk buying), goal-based, investment club.
Ask clarifying questions if the user's goal is unclear. Recommend ONE primary type + one alternative. Language: ${ctx.language || 'English'}.`,
    userPrompt: (ctx) => ctx.goal,
  },
  contribution_projection: {
    model: 'haiku',
    requiresGroup: true,
    useTools: true,
    maxTokens: 600,
    system: (ctx) => `Project a single member's savings in a group. Use get_member_history to get past contributions.
Extrapolate based on their pattern, the group's contribution frequency, and the months until the target date.
Answer concisely in ${ctx.language || 'English'}: current total, projection, confidence level.`,
    userPrompt: (ctx) => `Project what ${ctx.memberEmail} will have saved by ${ctx.targetDate}.`,
  },
  payout_predictor: {
    model: 'haiku',
    requiresGroup: true,
    useTools: true,
    maxTokens: 500,
    system: (ctx) => `Predict when a specific member receives their payout in a rotating-style group.
Use get_group + get_rotation_order + get_meetings to determine cadence and position.
Answer in ${ctx.language || 'English'} with the estimated date and any caveats.`,
    userPrompt: (ctx) => `When is ${ctx.memberEmail} scheduled to receive a payout?`,
  },
  join_advisor: {
    model: 'haiku',
    useTools: false,
    maxTokens: 700,
    system: (ctx) => `Help a user evaluate whether a public group listing is trustworthy.
Red flags: unrealistic returns, admin not verified, very new group, pressure tactics, vague rules, no constitution.
Green flags: long history, verified admin, clear constitution, transparent fee structure, reasonable contribution amounts.
Language: ${ctx.language || 'English'}. Give a clear verdict (Safe / Caution / Avoid) with reasons.`,
    userPrompt: (ctx) => `Evaluate this group listing:\n${JSON.stringify(ctx.groupListing, null, 2)}`,
  },
  member_faq: {
    model: 'haiku',
    useTools: true,
    maxTokens: 700,
    system: (ctx) => `Answer general questions about Stokpile, stokvels, and how this app works.
Available in ${ctx.language || 'English'}. If the question is group-specific and a groupId is available, use tools.
For billing/subscription questions, direct users to Profile → Subscription. For account deletion, Profile → Delete Account.`,
    userPrompt: (ctx) => ctx.question,
  },

  // ───── Phase 1: Admin content generators ─────
  announcement_drafter: {
    model: 'haiku',
    adminOnly: true,
    requiresGroup: true,
    useTools: true,
    maxTokens: 800,
    system: (ctx) => `Draft a short announcement for a stokvel group. Tone: ${ctx.tone || 'warm and respectful'}.
Language: ${ctx.language || 'English'}. Length: ${ctx.length || 'short (under 80 words)'}.
Respect isihlonipho (cultural respect protocols). Use the group name naturally.
If the topic references data (payouts, contributions), call tools to get accurate numbers.`,
    userPrompt: (ctx) => `Topic: ${ctx.topic}\nAdditional context: ${ctx.context || 'none'}`,
  },
  nudge_writer: {
    model: 'haiku',
    adminOnly: true,
    requiresGroup: true,
    useTools: true,
    maxTokens: 400,
    system: (ctx) => `Craft a personalized reminder for a specific member about an overdue contribution.
Use get_member_history to see their pattern — gentler for normally-reliable members, firmer for repeat skippers.
Language: ${ctx.language || 'English'}. 2-3 sentences max. End with a clear ask.`,
    userPrompt: (ctx) => `Nudge ${ctx.memberEmail} about their overdue contribution of ${ctx.amount} for ${ctx.period}.`,
  },
  agenda_generator: {
    model: 'haiku',
    adminOnly: true,
    requiresGroup: true,
    useTools: true,
    maxTokens: 800,
    system: (ctx) => `Generate a meeting agenda for a stokvel group. Use get_audit_log and get_meetings to identify open items from the last meeting.
Language: ${ctx.language || 'English'}. Output: numbered agenda with ~5-8 items, time estimates in minutes.
Standard items: welcome, minutes review, financial report, open items, new business, AOB, close.`,
    userPrompt: (ctx) => `Draft agenda for meeting on ${ctx.meetingDate}.`,
  },
  absence_apology: {
    model: 'haiku',
    useTools: false,
    maxTokens: 300,
    system: (ctx) => `Draft a polite apology for missing a stokvel meeting or contribution.
Tone: sincere, respectful, culturally appropriate. Language: ${ctx.language || 'English'}. Under 60 words.`,
    userPrompt: (ctx) => `Reason: ${ctx.reason}. Event: ${ctx.event}.`,
  },
  agm_minutes: {
    model: 'sonnet',
    adminOnly: true,
    requiresGroup: true,
    useTools: true,
    maxTokens: 2000,
    system: (ctx) => `Draft formal AGM minutes from meeting notes. Standard sections:
1. Attendance (use get_members + attendance field) 2. Apologies 3. Minutes of previous AGM 4. Matters arising
5. Chairperson's report 6. Treasurer's report (use get_contributions + get_payouts for the year)
7. Election of office bearers 8. Any other business 9. Close & next AGM date.
Language: ${ctx.language || 'English'}. Formal register. Include specific numbers where possible.`,
    userPrompt: (ctx) => `AGM date: ${ctx.date}. Notes:\n${ctx.notes}`,
  },
  treasurer_handover: {
    model: 'sonnet',
    adminOnly: true,
    requiresGroup: true,
    useTools: true,
    maxTokens: 1500,
    system: (ctx) => `Draft a one-page treasurer handover document. Use tools to fetch:
current balances (from contributions & payouts), outstanding items, bank account details, pending disputes, upcoming obligations.
Sections: Summary · Finances snapshot · Outstanding items · Key contacts · Calendar · Passwords/access (placeholders only).
Language: ${ctx.language || 'English'}.`,
    userPrompt: (ctx) => `Outgoing treasurer: ${ctx.from}. Incoming: ${ctx.to}.`,
  },
  cycle_closure_report: {
    model: 'sonnet',
    adminOnly: true,
    requiresGroup: true,
    useTools: true,
    maxTokens: 1500,
    system: (ctx) => `Produce an end-of-cycle report. Sections:
1. Cycle summary (dates, total contributed, total paid out, member count)
2. Per-member contribution totals and compliance (use get_members + get_contributions)
3. Payouts completed (use get_payouts)
4. Achievements (streaks, full-cycle payers)
5. Issues (missed contributions, disputes — use get_audit_log)
6. Next cycle start date + welcome note.
Language: ${ctx.language || 'English'}. Be data-driven, not fluffy.`,
    userPrompt: (ctx) => `Cycle: ${ctx.cycleStart} to ${ctx.cycleEnd}.`,
  },
  weekly_digest: {
    model: 'haiku',
    adminOnly: true,
    requiresGroup: true,
    useTools: true,
    maxTokens: 700,
    system: (ctx) => `Draft a weekly digest for the admin. Pull this week's contributions, payouts, audit events, overdue items.
Bullet format. Highlight anything needing admin action with "⚠️". Language: ${ctx.language || 'English'}.`,
    userPrompt: () => `Generate this week's digest.`,
  },

  // ───── Phase 3: Advisory / reasoning ─────
  penalty_advisor: {
    model: 'sonnet',
    adminOnly: true,
    requiresGroup: true,
    useTools: true,
    maxTokens: 800,
    system: (ctx) => `You're a fairness advisor. Read the group's constitution (get_constitution) and the incident.
Apply the rules. If the constitution is silent, say so — don't invent penalties.
Output: (1) whether a penalty applies, (2) the exact clause cited, (3) recommended amount/action, (4) mitigating factors.
Language: ${ctx.language || 'English'}.`,
    userPrompt: (ctx) => `Incident: ${ctx.incident}\nMember: ${ctx.memberEmail}`,
  },
  constitution_builder: {
    model: 'sonnet',
    adminOnly: true,
    requiresGroup: false,
    useTools: false,
    maxTokens: 3000,
    system: (ctx) => `Draft a complete stokvel constitution from the user's answers.
Required sections: Name and purpose · Membership (joining, resigning, expulsion) · Contributions (amount, frequency, penalties)
· Payouts · Meetings · Office bearers (roles, elections) · Decision-making · Disputes · Amendments · Dissolution.
Be POPIA-aware. Respectful, plain language. Language: ${ctx.language || 'English'}.`,
    userPrompt: (ctx) => `Group type: ${ctx.groupType}\nAnswers:\n${JSON.stringify(ctx.answers, null, 2)}`,
  },
  constitution_legal_check: {
    model: 'sonnet',
    useTools: false,
    maxTokens: 1500,
    system: (ctx) => `Review a stokvel constitution for conflicts with South African law. Flag specifically:
unenforceable penalty clauses (SA courts strike punitive penalties), POPIA violations (data retention, consent),
unfair contract terms (Consumer Protection Act), clauses that could be interpreted as financial services (requiring FSCA licensing),
unreasonable member expulsion rules, forced contributions beyond rational limits.
Output: numbered issues with (a) clause quoted, (b) law it conflicts with, (c) suggested rewording.
Language: ${ctx.language || 'English'}.`,
    userPrompt: (ctx) => `Constitution:\n${ctx.constitutionText}`,
  },
  rotation_advisor: {
    model: 'sonnet',
    adminOnly: true,
    requiresGroup: true,
    useTools: true,
    maxTokens: 1000,
    system: (ctx) => `Analyze the rotation order fairness. Call get_rotation_order, get_payouts (history), get_members.
Fairness factors: time since each member's last payout, contribution consistency, joining date.
Recommend any reorderings. Output: (1) current state, (2) fairness concerns, (3) proposed reorder, (4) explanation.
Language: ${ctx.language || 'English'}.`,
    userPrompt: () => `Review the rotation order.`,
  },

  // ───── Phase 4: Analysis / tagging (background) ─────
  missing_docs_scan: {
    model: 'haiku',
    adminOnly: true,
    requiresGroup: true,
    useTools: true,
    maxTokens: 800,
    system: (ctx) => `Scan for documentation gaps. Flag:
meetings without minutes (get_meetings), payouts without proof (get_payouts where status=completed and no reference),
disputes without resolution. Output: bulleted list of gaps with what's missing.
Language: ${ctx.language || 'English'}.`,
    userPrompt: () => `Scan for gaps.`,
  },
  audit_tagger: {
    model: 'haiku',
    useTools: false,
    maxTokens: 200,
    system: () => `You classify stokvel audit-log events. Return STRICT JSON: {"category": "...", "severity": "low|medium|high", "needs_admin_attention": true|false}.
Categories: contribution, payout, membership, governance, dispute, system, rewards, subscription, other.`,
    userPrompt: (ctx) => `Event: ${ctx.action}\nDetails: ${JSON.stringify(ctx.details || {})}`,
  },
};

// ────────────────────────────────────────────────────────────
// Route registration
// ────────────────────────────────────────────────────────────
const MODEL_IDS: Record<string, string> = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
};

export function registerAiRoutes(
  app: any,
  supabaseAdmin: any,
  getAuthUser: (c: any) => Promise<any>,
  getMembership: (groupId: string, email: string) => Promise<any>,
) {
  const API_KEY = typeof Deno !== 'undefined' ? Deno.env.get('ANTHROPIC_API_KEY') : '';

  async function requireUser(c: any) {
    const user = await getAuthUser(c);
    if (!user) throw Object.assign(new Error('Unauthorized'), { status: 401 });
    return user;
  }

  function handleError(c: any, err: any) {
    const status = err.status || 500;
    return c.json({ error: err.message || 'Internal error' }, status);
  }

  async function getTier(groupId: string | undefined, userEmail: string): Promise<string> {
    if (!groupId) return 'free';
    const { data } = await supabaseAdmin
      .from('subscriptions').select('tier').eq('group_id', groupId).maybeSingle();
    return data?.tier || 'free';
  }

  async function requireOptIn(user: any) {
    const { data } = await supabaseAdmin
      .from('profiles').select('ai_opt_in').eq('email', user.email).maybeSingle();
    if (!data?.ai_opt_in) {
      throw Object.assign(
        new Error('You must opt in to AI features first (Profile → Settings).'),
        { status: 412 },
      );
    }
  }

  // Opt-in endpoint (user accepts AI data processing)
  app.post(`${PREFIX}/ai/opt-in`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const { accept } = await c.req.json().catch(() => ({ accept: true }));
      await supabaseAdmin.from('profiles').upsert({
        email: user.email,
        ai_opt_in: !!accept,
        ai_opt_in_at: accept ? new Date().toISOString() : null,
      }, { onConflict: 'email' });
      return c.json({ ok: true, optedIn: !!accept });
    } catch (err: any) { return handleError(c, err); }
  });

  app.get(`${PREFIX}/ai/opt-in`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const { data } = await supabaseAdmin
        .from('profiles').select('ai_opt_in, ai_opt_in_at').eq('email', user.email).maybeSingle();
      return c.json({ optedIn: !!data?.ai_opt_in, optedInAt: data?.ai_opt_in_at });
    } catch (err: any) { return handleError(c, err); }
  });

  // Usage summary for the current user
  app.get(`${PREFIX}/ai/usage`, async (c: any) => {
    try {
      const user = await requireUser(c);
      const { data } = await supabaseAdmin.rpc('ai_usage_this_month', { p_user_id: user.id });
      const row = data?.[0];
      return c.json({
        callsThisMonth: Number(row?.call_count || 0),
        costZarThisMonth: Number(row?.total_cost_zar || 0),
      });
    } catch (err: any) { return handleError(c, err); }
  });

  // ─── Pilo: conversational assistant ─────────────────────────────────
  // Body: { messages: [{role, content}], groupId?, language?, userEmail, userName, tier, commissionRate }
  // Returns: { text, suggestedActions?: [{label, task, context}], callsThisMonth, cap, costZar, latencyMs }
  app.post(`${PREFIX}/ai/pilo`, async (c: any) => {
    try {
      if (!API_KEY) return c.json({ error: 'AI not configured (ANTHROPIC_API_KEY missing)' }, 503);

      const user = await requireUser(c);
      await requireOptIn(user);

      const body = await c.req.json();
      const { messages, groupId, language, groupName, isAdmin, tier, lifetimePoints, commissionRate } = body || {};

      if (!Array.isArray(messages) || messages.length === 0) {
        return c.json({ error: 'messages required' }, 400);
      }

      if (groupId) {
        const m = await getMembership(groupId, user.email);
        if (!m || m.status !== 'approved') return c.json({ error: 'Not a member of that group' }, 403);
      }

      const subTier = await getTier(groupId, user.email);

      // Budget check
      const { data: usageRows } = await supabaseAdmin.rpc('ai_usage_this_month', { p_user_id: user.id });
      const callsThisMonth = Number(usageRows?.[0]?.call_count || 0);
      const cap = MONTHLY_CAPS[subTier] ?? MONTHLY_CAPS.free;
      if (callsThisMonth >= cap) {
        return c.json({ error: `Monthly AI cap reached (${cap}). Upgrade for more.`, cap, callsThisMonth }, 429);
      }

      const system = `You are Pilo, the AI assistant for Stokpile — a savings-group / stokvel management app built for South Africa and broader Africa. You help members and admins run their stokvels, chamas, burial societies, rotating/susu groups, grocery stokvels, and investment clubs.

Behaviour:
- Be warm, respectful, and concise. Use ubuntu principles — value the community, respect elders, acknowledge cultural context.
- Language: respond in ${language || 'English'}. If the user writes in another language, match it.
- Never invent numbers. Call tools to fetch live data (get_contributions, get_members, etc.) — every number you state must come from a tool or explicit user input.
- When the user asks for something actionable (draft an announcement, log a contribution, remind a member), suggest a concrete next step.
- If the user is asking about a specific group, you already have their group context.
- Keep responses short by default (2-4 sentences). Only go longer if the user asks for detail.
- Never discuss other users' data the current user isn't authorised to see.

Context you already know:
- User: ${user.email}${groupName ? ` · Group: ${groupName}` : ''}${isAdmin ? ' · role: admin' : ''}
${tier ? `- Rewards tier: ${tier} (${lifetimePoints || 0} lifetime points, ${commissionRate || 15}% referral rate)` : ''}
${groupId ? `- Current groupId: ${groupId} (pass this to tools)` : ''}`;

      const tools = makeTools(supabaseAdmin, user.email);
      const convMessages: any[] = messages.map((m: any) => ({ role: m.role, content: m.content }));
      let totalUsage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
      let finalText = '';
      let response: any;
      const started = Date.now();

      for (let loop = 0; loop < 6; loop++) {
        response = await callAnthropic(API_KEY, {
          model: MODEL_IDS.haiku,
          system,
          messages: convMessages,
          tools: tools.definitions,
          maxTokens: 1200,
          cacheSystem: true,
        });

        const u = response.usage || {};
        totalUsage.input_tokens += u.input_tokens || 0;
        totalUsage.output_tokens += u.output_tokens || 0;
        totalUsage.cache_creation_input_tokens += u.cache_creation_input_tokens || 0;
        totalUsage.cache_read_input_tokens += u.cache_read_input_tokens || 0;

        if (response.stop_reason === 'tool_use') {
          convMessages.push({ role: 'assistant', content: response.content });
          const toolResults: any[] = [];
          for (const block of response.content) {
            if (block.type === 'tool_use') {
              const result = await tools.run(block.name, block.input);
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(result),
                is_error: !result.ok,
              });
            }
          }
          convMessages.push({ role: 'user', content: toolResults });
          continue;
        }

        for (const block of response.content) {
          if (block.type === 'text') finalText += block.text;
        }
        break;
      }

      const cost = calculateCost(MODEL_IDS.haiku, totalUsage);
      const latency = Date.now() - started;

      // Suggest quick follow-up actions based on simple keyword heuristics
      const suggestedActions: Array<{ label: string; task: string; context?: any }> = [];
      const lowerReply = finalText.toLowerCase();
      if (isAdmin && groupId) {
        if (/remind|nudge|overdue|hasn't paid|behind/.test(lowerReply)) {
          suggestedActions.push({ label: 'Draft a reminder', task: 'nudge_writer' });
        }
        if (/announce|announcement|message the group/.test(lowerReply)) {
          suggestedActions.push({ label: 'Draft an announcement', task: 'announcement_drafter' });
        }
        if (/meeting|agenda/.test(lowerReply)) {
          suggestedActions.push({ label: 'Generate meeting agenda', task: 'agenda_generator' });
        }
      }

      await supabaseAdmin.from('ai_usage').insert({
        user_id: user.id,
        user_email: user.email,
        group_id: groupId || null,
        task: 'pilo',
        model: MODEL_IDS.haiku,
        input_tokens: totalUsage.input_tokens,
        output_tokens: totalUsage.output_tokens,
        cached_tokens: totalUsage.cache_read_input_tokens,
        cost_zar: cost,
        latency_ms: latency,
        success: true,
        language: language || 'en',
      }).then(() => {}, (e: any) => console.warn('ai_usage log failed:', e?.message));

      return c.json({
        text: finalText,
        suggestedActions,
        callsThisMonth: callsThisMonth + 1,
        cap,
        costZar: cost,
        latencyMs: latency,
      });
    } catch (err: any) { return handleError(c, err); }
  });

  // Main dispatch endpoint
  app.post(`${PREFIX}/ai/chat`, async (c: any) => {
    try {
      if (!API_KEY) return c.json({ error: 'AI not configured (ANTHROPIC_API_KEY missing)' }, 503);

      const user = await requireUser(c);
      await requireOptIn(user);

      const body = await c.req.json();
      const { task, groupId, language, context } = body || {};

      const taskDef = TASKS[task];
      if (!taskDef) return c.json({ error: `Unknown task: ${task}` }, 400);

      if (taskDef.requiresGroup && !groupId) {
        return c.json({ error: 'groupId required for this task' }, 400);
      }

      if (taskDef.requiresGroup && groupId) {
        const m = await getMembership(groupId, user.email);
        if (!m || m.status !== 'approved') return c.json({ error: 'Not a member of that group' }, 403);
        if (taskDef.adminOnly && m.role !== 'admin') return c.json({ error: 'Admin only' }, 403);
      }

      const tier = await getTier(groupId, user.email);
      const ctx = { ...context, language, groupId };

      const result = await runAiTask({
        supabaseAdmin,
        apiKey: API_KEY,
        user: { id: user.id, email: user.email },
        task,
        groupId,
        model: MODEL_IDS[taskDef.model],
        system: taskDef.system(ctx),
        userMessage: taskDef.userPrompt(ctx),
        language,
        tier,
        useTools: taskDef.useTools,
        maxTokens: taskDef.maxTokens,
      });

      return c.json(result);
    } catch (err: any) { return handleError(c, err); }
  });
}
