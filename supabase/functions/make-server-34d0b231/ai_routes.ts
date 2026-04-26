// ai_routes.ts — AI assistant endpoints + Anthropic integration.
// Separate file to keep the AI plumbing isolated from the rest of the server.

import { BANK_ACCOUNTS, bankKbAsTextForLLM, LAST_REVIEWED as BANK_KB_LAST_REVIEWED } from './bank_kb.ts';
import { GROWTH_PLAYBOOK } from './growth_playbook.ts';

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

function makeTools(supabaseAdmin: any, userEmail: string, userId?: string) {
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
      {
        name: 'get_growth_diagnostic',
        description: 'Returns growth-relevant metrics for a group: member count, retention rate, contribution growth m-o-m, on-time rate, churn, average tenure, recent dispute count. Use to ground growth recommendations.',
        input_schema: {
          type: 'object',
          properties: { groupId: { type: 'string' } },
          required: ['groupId'],
        },
      },
      {
        name: 'compare_bank_accounts',
        description: 'Returns the curated SA bank-account knowledge base filtered for the group. Structural facts only — interest rates change too often to maintain. For LIVE rates, also call web_search for the bank product page.',
        input_schema: {
          type: 'object',
          properties: {
            memberCount: { type: 'number' },
            needsMultipleSignatories: { type: 'boolean' },
            groupType: { type: 'string', description: 'rotating | burial | grocery | chama | investment | goal' },
          },
        },
      },
      {
        name: 'get_cohort_benchmark',
        description: "Anonymised platform-wide benchmarks for a metric (e.g. on_time_rate, avg_contribution_zar, retention_pct). Returns p25/median/p75/p90 for the group's type and member-count band so you can answer 'is our group above or below typical?'. Returns 0 sample if benchmark cache is empty.",
        input_schema: {
          type: 'object',
          properties: {
            groupId: { type: 'string' },
            metric: { type: 'string', enum: ['on_time_rate', 'avg_contribution_zar', 'retention_pct'] },
          },
          required: ['groupId', 'metric'],
        },
      },
      {
        name: 'save_memory',
        description: 'Persist a fact about the user across conversations (preference, goal, context, group_fact). Use sparingly — only durable facts the user has stated explicitly. Bad: "user asked about X today". Good: "preferred contribution day is Friday" or "savings goal is R50,000 by Dec 2027".',
        input_schema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Short slug like preferred_language or savings_goal' },
            value: { type: 'string', description: 'Free-form short value (max 300 chars)' },
            category: { type: 'string', enum: ['preference', 'goal', 'context', 'general', 'group_fact'] },
            groupId: { type: 'string', description: 'Optional — set if this fact is group-specific' },
          },
          required: ['key', 'value'],
        },
      },
      {
        name: 'recall_memories',
        description: 'List previously saved memories for the user (most recent first). Useful when the user asks something that might rely on prior context.',
        input_schema: {
          type: 'object',
          properties: {
            groupId: { type: 'string', description: 'Optional — filter to group-scoped memories' },
            limit: { type: 'number' },
          },
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
          case 'get_growth_diagnostic': {
            const { groupId } = input;
            const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
            const twoMonthsAgo = new Date(); twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

            const [{ data: memberships }, { data: contribs }, { data: payouts }, { data: audit }] = await Promise.all([
              supabaseAdmin.from('group_memberships')
                .select('user_email, status, joined_at, deactivated_at')
                .eq('group_id', groupId),
              supabaseAdmin.from('contributions')
                .select('user_email, amount, paid, date')
                .eq('group_id', groupId)
                .gte('date', yearAgo.toISOString().slice(0, 10)),
              supabaseAdmin.from('payouts')
                .select('status, scheduled_for, completed_at')
                .eq('group_id', groupId)
                .gte('scheduled_for', yearAgo.toISOString().slice(0, 10)),
              supabaseAdmin.from('audit_log')
                .select('action, timestamp')
                .eq('group_id', groupId)
                .gte('timestamp', yearAgo.toISOString())
                .limit(500),
            ]);

            const approved = (memberships || []).filter((m: any) => m.status === 'approved' || m.status === 'managed');
            const inactive = (memberships || []).filter((m: any) => m.status === 'inactive');
            const memberCount = approved.length;

            const lastMonth = (contribs || []).filter((c: any) => c.date >= monthAgo.toISOString().slice(0, 10) && c.paid);
            const prevMonth = (contribs || []).filter((c: any) =>
              c.date >= twoMonthsAgo.toISOString().slice(0, 10) &&
              c.date < monthAgo.toISOString().slice(0, 10) && c.paid);
            const lastMonthSum = lastMonth.reduce((s: number, c: any) => s + Number(c.amount), 0);
            const prevMonthSum = prevMonth.reduce((s: number, c: any) => s + Number(c.amount), 0);
            const momGrowthPct = prevMonthSum > 0 ? ((lastMonthSum - prevMonthSum) / prevMonthSum) * 100 : null;

            const expectedThisMonth = approved.length;
            const paidThisMonth = new Set(lastMonth.map((c: any) => c.user_email)).size;
            const onTimeRatePct = expectedThisMonth > 0 ? Math.round((paidThisMonth / expectedThisMonth) * 100) : 0;

            const tenuresMs = approved.map((m: any) => Date.now() - new Date(m.joined_at).getTime());
            const avgTenureMonths = tenuresMs.length > 0 ? Math.round((tenuresMs.reduce((a: number, b: number) => a + b, 0) / tenuresMs.length) / (30 * 24 * 3600 * 1000)) : 0;

            const churn12m = inactive.filter((m: any) => m.deactivated_at && new Date(m.deactivated_at) >= yearAgo).length;
            const retentionPct = (memberCount + churn12m) > 0 ? Math.round((memberCount / (memberCount + churn12m)) * 100) : 100;

            const completedPayouts = (payouts || []).filter((p: any) => p.status === 'completed').length;
            const cancelledPayouts = (payouts || []).filter((p: any) => p.status === 'cancelled').length;

            const disputeEvents = (audit || []).filter((a: any) => /dispute|complaint|conflict/i.test(a.action || '')).length;

            return {
              ok: true,
              data: {
                memberCount,
                inactiveCount: inactive.length,
                churnLast12mo: churn12m,
                retentionPct,
                avgTenureMonths,
                onTimeRatePctThisMonth: onTimeRatePct,
                contributionMoMGrowthPct: momGrowthPct === null ? null : Math.round(momGrowthPct),
                lastMonthContributionsZar: Math.round(lastMonthSum),
                prevMonthContributionsZar: Math.round(prevMonthSum),
                completedPayoutsLast12mo: completedPayouts,
                cancelledPayoutsLast12mo: cancelledPayouts,
                disputeEventsLast12mo: disputeEvents,
                stage:
                  memberCount < 8 ? 'forming' :
                  memberCount < 20 ? 'stabilising' :
                  memberCount < 50 ? 'scaling' : 'established',
              },
            };
          }
          case 'compare_bank_accounts': {
            // The full curated KB; Claude filters from the prompt context
            return {
              ok: true,
              data: {
                lastReviewed: BANK_KB_LAST_REVIEWED,
                accounts: BANK_ACCOUNTS,
                note: 'Interest rates change frequently — for current rates, follow the URL or use web_search.',
              },
            };
          }
          case 'get_cohort_benchmark': {
            const { groupId, metric } = input;
            const { data: g } = await supabaseAdmin
              .from('groups').select('group_type').eq('id', groupId).maybeSingle();
            const { count: memberCount } = await supabaseAdmin
              .from('group_memberships').select('id', { count: 'exact', head: true })
              .eq('group_id', groupId).in('status', ['approved', 'managed']);
            const band =
              (memberCount ?? 0) < 10 ? 'lt_10' :
              (memberCount ?? 0) < 30 ? '10_29' :
              (memberCount ?? 0) < 100 ? '30_99' : 'gte_100';
            const { data } = await supabaseAdmin
              .from('pilo_cohort_cache')
              .select('p25, median, p75, p90, sample_size, computed_at')
              .eq('group_type', g?.group_type || 'rotating')
              .eq('member_count_band', band)
              .eq('metric', metric)
              .maybeSingle();
            if (!data) {
              return {
                ok: true,
                data: {
                  available: false,
                  reason: 'Benchmark data not yet available for this cohort. Pilo can still answer using the playbook benchmarks.',
                  groupTypeUsed: g?.group_type,
                  bandUsed: band,
                },
              };
            }
            return { ok: true, data: { available: true, band, ...data } };
          }
          case 'save_memory': {
            if (!userId) return { ok: false, error: 'No user context' };
            const value = String(input.value || '').slice(0, 300);
            const key = String(input.key || '').slice(0, 64);
            const category = ['preference', 'goal', 'context', 'general', 'group_fact'].includes(input.category) ? input.category : 'general';
            if (!key || !value) return { ok: false, error: 'key and value required' };

            const { error } = await supabaseAdmin
              .from('pilo_memories')
              .upsert({
                user_id: userId,
                key,
                value,
                category,
                group_id: input.groupId || null,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'user_id,key,group_id' });
            if (error) return { ok: false, error: error.message };
            return { ok: true, data: { saved: { key, value, category } } };
          }
          case 'recall_memories': {
            if (!userId) return { ok: false, error: 'No user context' };
            let q = supabaseAdmin
              .from('pilo_memories')
              .select('key, value, category, group_id, updated_at')
              .eq('user_id', userId)
              .order('updated_at', { ascending: false })
              .limit(Math.min(50, Number(input.limit) || 20));
            if (input.groupId) q = q.eq('group_id', input.groupId);
            const { data } = await q;
            return { ok: true, data: data || [] };
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

  const tools = params.useTools !== false ? makeTools(supabaseAdmin, user.email, user.id) : null;

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

  // ───── Phase 5: Growth advisor (Sonnet, deep reasoning) ─────
  growth_advisor: {
    model: 'sonnet',
    adminOnly: true,
    requiresGroup: true,
    useTools: true,
    maxTokens: 3000,
    system: (ctx) => `You are Pilo's growth-strategy specialist for stokvels in South Africa.

PROCESS
1. ALWAYS call get_growth_diagnostic first to ground recommendations in real numbers.
2. Identify the group's stage (forming / stabilising / scaling / established).
3. Find the 1-2 metrics most below benchmark.
4. Pick 2-3 highest-leverage tactics from the playbook.
5. Output a prioritised plan, not a checklist of every tactic.

OUTPUT (in ${ctx.language || 'English'})
- **Snapshot** — 2 sentences on where the group is now (use real numbers from the diagnostic).
- **Top 3 moves** — 1-2 sentences each, with a concrete next step the admin can take this week.
- **Watch-outs** — 1 sentence flagging anti-patterns the diagnostic surfaced (if any).
- **Benchmark callout** — 1 sentence comparing the group to typical SA stokvels (use playbook benchmarks).

TONE
Direct, calm, ubuntu-respectful. Treat the admin as a peer running a real organisation. Avoid generic startup-bro language.

PLAYBOOK
${GROWTH_PLAYBOOK}`,
    userPrompt: (ctx) => ctx.context?.focus
      ? `Focus on: ${ctx.context.focus}. Generate the growth plan.`
      : `Generate the growth plan.`,
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
  // Pre-load a financial snapshot of the group so Pilo can answer common
  // questions instantly without a tool-call round trip, and has enough
  // context to reason about savings, returns, and member trends.
  async function buildFinancialSnapshot(groupId: string, userEmail: string): Promise<string> {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);

      const [{ data: group }, { data: memberships }, { data: contributions }, { data: payouts }, { data: sub }] = await Promise.all([
        supabaseAdmin.from('groups')
          .select('name, group_type, currency, description, created_at, annual_target, contribution_target')
          .eq('id', groupId).maybeSingle(),
        supabaseAdmin.from('memberships')
          .select('user_email, role, status, joined_at')
          .eq('group_id', groupId).eq('status', 'approved'),
        supabaseAdmin.from('contributions')
          .select('user_email, amount, paid, date')
          .eq('group_id', groupId).gte('date', yearStart).limit(2000),
        supabaseAdmin.from('payouts')
          .select('recipient_email, amount, status, scheduled_for, completed_at')
          .eq('group_id', groupId).order('scheduled_for', { ascending: false }).limit(50),
        supabaseAdmin.from('subscriptions').select('tier').eq('group_id', groupId).maybeSingle(),
      ]);

      const memberCount = (memberships || []).length;
      const paidContribs = (contributions || []).filter((c: any) => c.paid);
      const sumYTD = paidContribs.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
      const sumMonth = paidContribs
        .filter((c: any) => c.date >= monthStart)
        .reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
      const sumLastMonth = paidContribs
        .filter((c: any) => c.date >= lastMonthStart && c.date < monthStart)
        .reduce((s: number, c: any) => s + Number(c.amount || 0), 0);

      const completedPayouts = (payouts || []).filter((p: any) => p.status === 'completed');
      const sumPayoutsYTD = completedPayouts.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const balance = sumYTD - sumPayoutsYTD;

      const userContribsYTD = paidContribs
        .filter((c: any) => c.user_email === userEmail)
        .reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
      const userContribsMonth = paidContribs
        .filter((c: any) => c.user_email === userEmail && c.date >= monthStart)
        .reduce((s: number, c: any) => s + Number(c.amount || 0), 0);

      // Overdue this month: members who haven't paid this month
      const paidThisMonthEmails = new Set(
        paidContribs.filter((c: any) => c.date >= monthStart).map((c: any) => c.user_email),
      );
      const overdueCount = (memberships || []).filter((m: any) => !paidThisMonthEmails.has(m.user_email)).length;

      const target = Number(group?.contribution_target || 0);
      const annualTarget = Number(group?.annual_target || 0);
      const currency = group?.currency || 'ZAR';
      const cur = (n: number) => `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const nextPayout = (payouts || []).find((p: any) => p.status === 'scheduled');

      return `Group snapshot (live, computed now):
- Name: ${group?.name || 'Unknown'} · Type: ${group?.group_type || 'n/a'} · Currency: ${currency}
- Members (approved): ${memberCount} · Sub tier: ${sub?.tier || 'free'}
- Contribution target/person/period: ${target ? cur(target) : 'not set'}
- Annual target: ${annualTarget ? cur(annualTarget) : 'not set'}
- Total contributed YTD: ${cur(sumYTD)}
- Contributed this month: ${cur(sumMonth)} (last month: ${cur(sumLastMonth)}, delta: ${cur(sumMonth - sumLastMonth)})
- Total paid out YTD: ${cur(sumPayoutsYTD)}
- Current balance (YTD in − YTD out): ${cur(balance)}
- Members overdue this month: ${overdueCount}
- Next scheduled payout: ${nextPayout ? `${cur(Number(nextPayout.amount))} to ${nextPayout.recipient_email} on ${nextPayout.scheduled_for}` : 'none'}
- Current user (${userEmail}) contributed this year: ${cur(userContribsYTD)} · this month: ${cur(userContribsMonth)}`;
    } catch (e: any) {
      return `Group snapshot unavailable: ${e?.message || 'error'}`;
    }
  }

  // Route to Sonnet for analytical / advisory queries. Keyword heuristic —
  // cheap and works well enough for the kinds of questions users actually ask.
  const SONNET_TRIGGERS = /(project|projection|forecast|should i|should we|compare|comparison|invest|return|yield|interest|tax|sars|fsca|popia|analyse|analysis|recommend|strategy|optimi[sz]e|roi|risk|break even|cash ?flow|scenario|what if|\bsavings plan\b|\bbudget\b)/i;

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

      // Pre-load group financial context when we have a group
      const snapshot = groupId ? await buildFinancialSnapshot(groupId, user.email) : '';

      // Pre-load Pilo's persistent memory about this user (most-recent 15)
      let memoryBlock = '';
      try {
        const { data: mems } = await supabaseAdmin
          .from('pilo_memories')
          .select('key, value, category, group_id, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(15);
        if (mems && mems.length > 0) {
          memoryBlock = '\nWHAT YOU REMEMBER ABOUT THIS USER (use only when relevant):\n' +
            mems.map((m: any) => `- ${m.key}: ${m.value}${m.group_id ? ' (this group)' : ''}`).join('\n');
        }
      } catch { /* table missing — ignore until migration runs */ }

      // Pilo can request fresh information via web_search on Pro/Trial/Enterprise.
      // Free/Community tiers get a curated KB only — keeps cost predictable.
      const sonnetAllowed = subTier === 'pro' || subTier === 'trial' || subTier === 'enterprise';
      const webSearchAllowed = sonnetAllowed;

      const system = `You are Pilo — Stokpile's financial assistant for stokvels, chamas, burial societies, rotating/susu circles, grocery stokvels, investment clubs, and goal-based savings groups across Africa. You are warm, numerate, and honest.

CORE BEHAVIOUR
- Respond in ${language || 'English'}. Match the user's language if they write in another.
- Be concise (2-4 sentences by default). Go deeper only when the user asks.
- Ubuntu principles: respect the community, acknowledge cultural context, be respectful of elders and informal leadership structures.
- Never invent numbers. Numbers must come from the group snapshot below, a tool call, or explicit user input.
- Extrapolations and projections are fine IF you state the assumption ("at your current R500/month rate..."). Never pretend a projection is a fact.
- Never discuss other users' data the current user isn't authorised to see.

FINANCIAL INTELLIGENCE
You are a competent personal-finance advisor for African members, not just a chatbot. Apply these frames when relevant:

1. **Compound growth math** — know how to project savings: FV = PV × (1 + r)^n for lump sums, or FV = PMT × [((1+r)^n − 1) / r] for regular contributions. Use realistic rates (SA bank savings ~5-7%, inflation ~5%, JSE equity ~10% nominal long-term).

2. **Opportunity cost & inflation** — flag when a pure-cash stokvel is losing real value to inflation over long holds. Compare against alternatives: Tax-Free Savings Account (TFSA, R36,000/year contribution, R500,000 lifetime, SA), Retirement Annuity (tax-deductible), unit trusts, money-market funds.

3. **SA tax context** — stokvel interest/return earned by the group itself is typically not the member's taxable income until distributed; distributions as winnings are generally exempt unless structured as income. Annual interest exemption: R23,800 (under 65) / R34,500 (over 65). Dividends withholding 20%. Flag clearly when something *may* trigger SARS reporting. Never give binding tax advice — suggest consulting SARS or a tax practitioner for complex situations.

4. **Regulatory awareness** — burial societies operate under NSL/MoU rules and may need registration above certain levels; investment clubs pooling >R500k may fall under FSCA collective investment scheme rules. Flag without alarming.

5. **Risk framing** — always note the tradeoff: a stokvel with no insurance has concentrated risk (admin death, theft, legal dispute). A single-payout rotation is riskier for late recipients. Suggest mitigants (group constitution, joint signatories, dedicated bank account, short cycles).

6. **Member-level coaching** — when a user asks about their own savings, frame it against their contribution history, consistency, and goals. Offer catch-up plans in concrete rands-per-week terms.

7. **Group-level coaching** — identify health signals: contribution consistency, member retention, payout velocity, target-vs-actual. Suggest specific improvements ("6 members overdue; consider a graduated penalty clause").

8. **Diaspora & remittance** — if a user mentions being outside SA, consider FX timing, remittance fees (compare WorldRemit/Mukuru/Sendwave), and cross-border tax notes.

FORMATTING
- When listing money amounts, use the group's currency (default ZAR). Always include thousand separators.
- Prefer inline markdown: **bold** for key numbers, bullets for multi-step advice, tables only if the user asks for a comparison.
- End actionable replies with a single-sentence "next step" the user can take today.

CONTEXT
- User: ${user.email}${groupName ? ` · Group: ${groupName}` : ''}${isAdmin ? ' · role: admin' : ''}
${tier ? `- Rewards tier: ${tier} · ${lifetimePoints || 0} lifetime points · ${commissionRate || 15}% referral rate` : ''}
${groupId ? `- Current groupId: ${groupId} (pass to tools when needed)` : ''}
${snapshot}${memoryBlock}`;

      // Choose model: Sonnet for analytical queries on paying tiers, Haiku otherwise.
      const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';
      const analytical = typeof lastUserMsg === 'string' && SONNET_TRIGGERS.test(lastUserMsg);
      const needsReasoning = analytical && sonnetAllowed;
      const chosenModel = needsReasoning ? MODEL_IDS.sonnet : MODEL_IDS.haiku;

      const tools = makeTools(supabaseAdmin, user.email, user.id);
      const convMessages: any[] = messages.map((m: any) => ({ role: m.role, content: m.content }));
      let totalUsage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
      let finalText = '';
      let response: any;
      const started = Date.now();

      // Anthropic-managed web_search tool — gated to paying tiers
      const allTools: any[] = [...tools.definitions];
      if (webSearchAllowed) {
        allTools.push({
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 3,
        });
      }

      for (let loop = 0; loop < 6; loop++) {
        response = await callAnthropic(API_KEY, {
          model: chosenModel,
          system,
          messages: convMessages,
          tools: allTools,
          maxTokens: needsReasoning ? 2500 : 1200,
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

      const cost = calculateCost(chosenModel, totalUsage);
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
        model: chosenModel,
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

  // Document understanding — upload an image (constitution scan, payment proof,
  // bank statement) + a question; Claude vision returns analysis. Pro/Trial only.
  // Body: { imageBase64, mimeType, question, groupId? }
  app.post(`${PREFIX}/ai/document`, async (c: any) => {
    try {
      if (!API_KEY) return c.json({ error: 'AI not configured (ANTHROPIC_API_KEY missing)' }, 503);
      const user = await requireUser(c);
      await requireOptIn(user);

      const body = await c.req.json();
      const { imageBase64, mimeType, question, groupId, language } = body || {};
      if (!imageBase64 || !mimeType) return c.json({ error: 'imageBase64 + mimeType required' }, 400);
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType)) {
        return c.json({ error: 'mimeType must be jpeg, png, webp, or gif. PDF: convert pages to images first.' }, 400);
      }

      const subTier = await getTier(groupId, user.email);
      const isPaying = subTier === 'pro' || subTier === 'trial' || subTier === 'enterprise';
      if (!isPaying) return c.json({ error: 'Document understanding is a Pro feature.', cap: 0, tier: subTier, groupId, feature: 'document_ai' }, 402);

      // Budget check
      const { data: usageRows } = await supabaseAdmin.rpc('ai_usage_this_month', { p_user_id: user.id });
      const callsThisMonth = Number(usageRows?.[0]?.call_count || 0);
      const cap = MONTHLY_CAPS[subTier] ?? MONTHLY_CAPS.free;
      if (callsThisMonth >= cap) {
        return c.json({ error: `Monthly AI cap reached (${cap}).`, cap, callsThisMonth }, 429);
      }

      const system = `You are Pilo, analysing a document a stokvel admin uploaded. Be concise and factual.
- For a constitution: highlight what's missing vs SA best practice (penalties, dispute resolution, dissolution clause, signatory rules).
- For a bank statement: identify deposits, withdrawals, fees; flag anomalies; never fabricate amounts you can't see.
- For a payment proof: extract amount, date, reference, payer name; flag if any field is illegible.
- For unclear images: say so plainly.
Language: ${language || 'English'}.`;

      const started = Date.now();
      const res = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
          'anthropic-version': ANTHROPIC_VERSION,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL_IDS.sonnet,
          max_tokens: 1500,
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
              { type: 'text', text: question || 'Analyse this document for a stokvel admin.' },
            ],
          }],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        return c.json({ error: `AI vision call failed: ${err}` }, 502);
      }
      const j = await res.json();
      const text = j.content?.find((b: any) => b.type === 'text')?.text || '';
      const u = j.usage || {};
      const cost = calculateCost(MODEL_IDS.sonnet, u);
      const latency = Date.now() - started;

      await supabaseAdmin.from('ai_usage').insert({
        user_id: user.id,
        user_email: user.email,
        group_id: groupId || null,
        task: 'document_vision',
        model: MODEL_IDS.sonnet,
        input_tokens: u.input_tokens || 0,
        output_tokens: u.output_tokens || 0,
        cached_tokens: u.cache_read_input_tokens || 0,
        cost_zar: cost,
        latency_ms: latency,
        success: true,
        language: language || 'en',
      }).then(() => {}, (e: any) => console.warn('ai_usage log failed:', e?.message));

      return c.json({ text, costZar: cost, latencyMs: latency });
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
