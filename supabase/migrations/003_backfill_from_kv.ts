/**
 * Backfill script: KV store → Postgres tables
 *
 * Run this ONCE after creating the tables (001_create_tables.sql).
 * It reads every KV prefix and upserts into the corresponding Postgres table.
 *
 * HOW TO RUN:
 *   1. Deploy the Edge Function with db.ts included
 *   2. Call this endpoint: POST /admin/backfill (add it temporarily to index.tsx)
 *   OR
 *   3. Run it locally via Deno:
 *      deno run --allow-env --allow-net supabase/migrations/003_backfill_from_kv.ts
 *
 * The script is idempotent (uses upsert with ON CONFLICT) so safe to re-run.
 */

// This file is designed to be pasted into the Edge Function temporarily
// or run as a standalone script. Adjust imports for your environment.

import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Import your KV store module — adjust path as needed
// import * as kv from "./src/supabase/functions/server/kv_store.tsx";

// ─── Helpers ─────────────────────────────────────────────────────────────

function toSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function objToSnake(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === '_key') continue; // skip KV internal key
    out[toSnake(k)] = v;
  }
  return out;
}

async function upsertBatch(table: string, rows: Record<string, any>[], onConflict?: string) {
  if (rows.length === 0) return 0;
  const snakeRows = rows.map(objToSnake);

  // Batch in groups of 100 to avoid payload limits
  let inserted = 0;
  for (let i = 0; i < snakeRows.length; i += 100) {
    const batch = snakeRows.slice(i, i + 100);
    const opts: any = onConflict ? { onConflict } : {};
    const { error } = await supabaseAdmin.from(table).upsert(batch, opts);
    if (error) {
      console.error(`[${table}] batch ${i}-${i + batch.length} error:`, error.message);
    } else {
      inserted += batch.length;
    }
  }
  return inserted;
}

// ─── Migration functions ─────────────────────────────────────────────────
// Each reads from KV, transforms, and upserts into Postgres.
// Replace `kv.getByPrefix(...)` with your actual KV client call.

type KV = {
  getByPrefix: (prefix: string) => Promise<any[]>;
  get: (key: string) => Promise<any>;
};

export async function backfillAll(kv: KV) {
  const log: Record<string, number> = {};

  // 1. Users
  console.log("Backfilling users...");
  const users = await kv.getByPrefix("user:");
  log.users = await upsertBatch("app_users", users.map((u) => ({
    id: u.id || undefined,
    email: u.email,
    fullName: u.fullName,
    surname: u.surname,
    country: u.country,
    phone: u.phone,
    emailVerified: u.emailVerified ?? false,
    createdAt: u.createdAt,
  })), "email");

  // 2. Groups
  console.log("Backfilling groups...");
  const groups = await kv.getByPrefix("group:");
  log.groups = await upsertBatch("groups", groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description || "",
    groupCode: g.groupCode,
    isPublic: g.isPublic || false,
    payoutsAllowed: g.payoutsAllowed ?? true,
    groupType: g.groupType || "rotating",
    contributionFrequency: g.contributionFrequency || "monthly",
    contributionTarget: g.contributionTarget || null,
    contributionTargetAnnual: g.contributionTargetAnnual || null,
    archived: g.archived || false,
    archivedAt: g.archivedAt || null,
    archivedBy: g.archivedBy || null,
    isDemo: g.isDemo || false,
    admin1: g.admin1 || null,
    admin2: g.admin2 || null,
    admin3: g.admin3 || null,
    createdBy: g.createdBy,
    createdAt: g.createdAt,
  })), "id");

  // 3. Memberships
  console.log("Backfilling memberships...");
  const memberships = await kv.getByPrefix("membership:");
  log.memberships = await upsertBatch("memberships", memberships.map((m) => ({
    groupId: m.groupId,
    userEmail: m.userEmail || m.email,
    fullName: m.fullName || null,
    surname: m.surname || null,
    role: m.role || "member",
    status: m.status || "pending",
    joinedAt: m.joinedAt,
    joinedVia: m.joinedVia || null,
    approvedAt: m.approvedAt || null,
    approvedBy: m.approvedBy || null,
    deactivatedAt: m.deactivatedAt || null,
  })), "group_id,user_email");

  // 4. Contributions
  console.log("Backfilling contributions...");
  const contributions = await kv.getByPrefix("contribution:");
  log.contributions = await upsertBatch("contributions", contributions.map((c) => ({
    id: c.id,
    groupId: c.groupId,
    userEmail: c.userEmail,
    amount: c.amount,
    date: c.date,
    paid: c.paid || false,
    paymentMethod: c.paymentMethod || null,
    paystackRef: c.paystackRef || c.paystackReference || null,
    refundedAmount: c.refundedAmount || 0,
    refundStatus: c.refundStatus || null,
    note: c.note || null,
    source: c.source || null,
    smsFrom: c.smsFrom || null,
    createdAt: c.createdAt,
  })), "id");

  // 5. Payouts
  console.log("Backfilling payouts...");
  const payouts = await kv.getByPrefix("payout:");
  log.payouts = await upsertBatch("payouts", payouts.map((p) => ({
    id: p.id,
    groupId: p.groupId,
    recipientEmail: p.recipientEmail,
    amount: p.amount,
    status: p.status || "scheduled",
    scheduledDate: p.scheduledDate,
    completedAt: p.completedAt || null,
    referenceNumber: p.referenceNumber || null,
    proofUrl: p.proofUrl || null,
    proofUploadedAt: p.proofUploadedAt || null,
    confirmedByRecipient: p.confirmedByRecipient || null,
    confirmedAt: p.confirmedAt || null,
    disputeReason: p.disputeReason || null,
    paymentMethod: p.paymentMethod || null,
    createdAt: p.createdAt,
  })), "id");

  // 6. Meetings
  console.log("Backfilling meetings...");
  const meetings = await kv.getByPrefix("meeting:");
  log.meetings = await upsertBatch("meetings", meetings.map((m) => ({
    id: m.id,
    groupId: m.groupId,
    title: m.title || null,
    date: m.date,
    time: m.time || null,
    venue: m.venue || null,
    agenda: m.agenda || null,
    attendance: m.attendance || {},
    createdBy: m.createdBy || null,
    createdAt: m.createdAt,
  })), "id");

  // 7. Announcements
  console.log("Backfilling announcements...");
  const announcements = await kv.getByPrefix("announcement:");
  log.announcements = await upsertBatch("announcements", announcements.map((a) => ({
    id: a.id,
    groupId: a.groupId,
    title: a.title,
    content: a.content,
    urgent: a.urgent || false,
    pinned: a.pinned || false,
    createdBy: a.createdBy,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt || null,
  })), "id");

  // 8. Subscriptions
  console.log("Backfilling subscriptions...");
  const subscriptions = await kv.getByPrefix("subscription:");
  log.subscriptions = await upsertBatch("subscriptions", subscriptions.map((s) => ({
    groupId: s.groupId,
    tier: s.tier || "trial",
    trialStartedAt: s.trialStartedAt || null,
    trialEndsAt: s.trialEndsAt || null,
    paystackSubscriptionCode: s.paystackSubscriptionCode || null,
    paystackCustomerCode: s.paystackCustomerCode || null,
    nextBillingDate: s.nextBillingDate || null,
    updatedAt: s.updatedAt,
  })), "group_id");

  // 9. Votes
  console.log("Backfilling votes...");
  const votes = await kv.getByPrefix("vote:");
  log.votes = await upsertBatch("votes", votes.map((v) => ({
    id: v.id,
    groupId: v.groupId,
    meetingId: v.meetingId || null,
    question: v.question,
    options: v.options || [],
    results: v.results || {},
    status: v.status || "open",
    createdBy: v.createdBy || null,
    createdAt: v.createdAt,
  })), "id");

  // 10. Notes
  console.log("Backfilling notes...");
  const notes = await kv.getByPrefix("note:");
  log.notes = await upsertBatch("notes", notes.map((n) => ({
    id: n.id,
    groupId: n.groupId,
    meetingId: n.meetingId || null,
    content: n.content,
    createdBy: n.createdBy,
    createdAt: n.createdAt,
  })), "id");

  // 11. Chat messages
  console.log("Backfilling chat messages...");
  const chats = await kv.getByPrefix("chat:");
  log.chats = await upsertBatch("chat_messages", chats.map((c) => ({
    id: c.id,
    groupId: c.groupId,
    meetingId: c.meetingId || null,
    message: c.message || c.content,
    sender: c.sender || c.userEmail,
    createdAt: c.createdAt,
  })), "id");

  // 12. Audit log
  console.log("Backfilling audit log...");
  const audits = await kv.getByPrefix("audit:");
  log.audit = await upsertBatch("audit_log", audits.map((a) => ({
    id: a.id,
    groupId: a.groupId,
    userEmail: a.userEmail,
    action: a.action,
    details: a.details || null,
    timestamp: a.timestamp,
  })), "id");

  // 13. Notifications
  console.log("Backfilling notifications...");
  const notifs = await kv.getByPrefix("notification:");
  log.notifications = await upsertBatch("notifications", notifs.map((n) => ({
    id: n.id,
    userEmail: n.userEmail,
    groupId: n.groupId || null,
    title: n.title,
    message: n.message || null,
    type: n.type || "info",
    read: n.read || false,
    createdAt: n.createdAt,
  })), "id");

  // 14. Penalty rules + charges
  console.log("Backfilling penalties...");
  const rules = await kv.getByPrefix("penalty-rule:");
  log.penaltyRules = await upsertBatch("penalty_rules", rules.map((r) => ({
    id: r.id,
    groupId: r.groupId,
    name: r.name,
    amount: r.amount,
    description: r.description || null,
    createdBy: r.createdBy || null,
    createdAt: r.createdAt,
  })), "id");

  const charges = await kv.getByPrefix("penalty-charge:");
  log.penaltyCharges = await upsertBatch("penalty_charges", charges.map((c) => ({
    id: c.id,
    groupId: c.groupId,
    ruleId: c.ruleId || null,
    memberEmail: c.memberEmail,
    amount: c.amount,
    reason: c.reason || null,
    status: c.status || "outstanding",
    createdBy: c.createdBy || null,
    createdAt: c.createdAt,
  })), "id");

  // 15. Rotation orders
  console.log("Backfilling rotation orders...");
  const rotations = await kv.getByPrefix("rotation:");
  log.rotations = await upsertBatch("rotation_orders", rotations.map((r) => ({
    groupId: r.groupId,
    slots: r.slots || [],
    currentPosition: r.currentPosition || 0,
    currentCycle: r.currentCycle || 1,
    updatedAt: r.updatedAt,
  })), "group_id");

  // 16. Grocery items
  console.log("Backfilling grocery items...");
  const groceries = await kv.getByPrefix("grocery-item:");
  log.groceryItems = await upsertBatch("grocery_items", groceries.map((g) => ({
    id: g.id,
    groupId: g.groupId,
    name: g.name,
    quantity: g.quantity || 1,
    unit: g.unit || "items",
    estimatedCost: g.estimatedCost || 0,
    assignedTo: g.assignedTo || null,
    status: g.status || "needed",
    notes: g.notes || null,
    addedBy: g.addedBy || null,
    createdAt: g.createdAt,
  })), "id");

  // 17. Burial beneficiaries + claims
  console.log("Backfilling burial data...");
  const beneficiaries = await kv.getByPrefix("burial-beneficiary:");
  log.beneficiaries = await upsertBatch("burial_beneficiaries", beneficiaries.map((b) => ({
    id: b.id,
    groupId: b.groupId,
    memberEmail: b.memberEmail,
    fullName: b.fullName,
    relationship: b.relationship,
    idNumber: b.idNumber || null,
    createdAt: b.createdAt,
  })), "id");

  const claims = await kv.getByPrefix("burial-claim:");
  log.burialClaims = await upsertBatch("burial_claims", claims.map((c) => ({
    id: c.id,
    groupId: c.groupId,
    claimantEmail: c.claimantEmail,
    beneficiaryName: c.beneficiaryName,
    description: c.description || null,
    amount: c.amount || null,
    status: c.status || "pending",
    createdAt: c.createdAt,
  })), "id");

  // 18. Dependents
  console.log("Backfilling dependents...");
  const deps = await kv.getByPrefix("dependent:");
  log.dependents = await upsertBatch("dependents", deps.map((d) => ({
    id: d.id,
    groupId: d.groupId,
    memberEmail: d.memberEmail,
    fullName: d.fullName,
    relationship: d.relationship,
    dateOfBirth: d.dateOfBirth || null,
    idNumber: d.idNumber || null,
    createdAt: d.createdAt,
  })), "id");

  // 19. Invites
  console.log("Backfilling invites...");
  const invites = await kv.getByPrefix("invite:");
  // Filter only actual invite records (not invite tokens)
  const realInvites = invites.filter((i) => i.groupId && i.invitedEmail);
  log.invites = await upsertBatch("invites", realInvites.map((i) => ({
    groupId: i.groupId,
    invitedEmail: i.invitedEmail,
    invitedBy: i.invitedBy || i.createdBy,
    status: i.status || "pending",
    createdAt: i.createdAt,
  })), "group_id,invited_email");

  // 20. Referrals
  console.log("Backfilling referrals...");
  const referrals = await kv.getByPrefix("referral:");
  // Filter only referral records (not referral-code or referral-claim)
  const realReferrals = referrals.filter((r) => r.userId && r.code && !r.newUserEmail);
  log.referrals = await upsertBatch("referrals", realReferrals.map((r) => ({
    userId: r.userId,
    email: r.email || null,
    code: r.code,
    invitedCount: r.invitedCount || 0,
    rewardedCount: r.rewardedCount || 0,
    createdAt: r.createdAt,
  })), "user_id");

  // 21. Sessions
  console.log("Backfilling sessions...");
  const sessions = await kv.getByPrefix("session:");
  log.sessions = await upsertBatch("sessions", sessions.map((s) => ({
    sessionId: s.sessionId,
    userId: s.userId,
    ip: s.ip || null,
    userAgent: s.userAgent || null,
    createdAt: s.createdAt,
    lastActiveAt: s.lastActiveAt || s.createdAt,
  })), "user_id,session_id");

  console.log("\n═══ Backfill complete ═══");
  console.log(JSON.stringify(log, null, 2));
  return log;
}
