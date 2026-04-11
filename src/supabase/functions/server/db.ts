/**
 * Database abstraction layer — Postgres via Supabase client.
 *
 * Replaces kv.get / kv.getByPrefix with indexed SQL queries.
 * All methods use the service_role supabaseAdmin client so they
 * bypass RLS (the Edge Function already handles auth).
 *
 * Convention:
 *   - DB columns are snake_case
 *   - JS objects returned to callers are camelCase
 *   - Mapping happens at the boundary in these helpers
 */

import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ─── Utility: snake_case ↔ camelCase ─────────────────────────────────────

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function toSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function rowToCamel<T = Record<string, any>>(row: Record<string, any>): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    out[toCamel(k)] = v;
  }
  return out as T;
}

function rowsToCamel<T = Record<string, any>>(rows: Record<string, any>[]): T[] {
  return rows.map(rowToCamel) as T[];
}

function objToSnake(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toSnake(k)] = v;
  }
  return out;
}

// ─── Generic helpers ─────────────────────────────────────────────────────

async function getById(table: string, id: string) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToCamel(data) : null;
}

async function getOne(table: string, filters: Record<string, any>) {
  let q = supabaseAdmin.from(table).select("*");
  for (const [k, v] of Object.entries(filters)) {
    q = q.eq(toSnake(k), v);
  }
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToCamel(data) : null;
}

async function list(table: string, filters: Record<string, any> = {}, opts?: { orderBy?: string; desc?: boolean; limit?: number }) {
  let q = supabaseAdmin.from(table).select("*");
  for (const [k, v] of Object.entries(filters)) {
    q = q.eq(toSnake(k), v);
  }
  if (opts?.orderBy) {
    q = q.order(toSnake(opts.orderBy), { ascending: !opts.desc });
  }
  if (opts?.limit) {
    q = q.limit(opts.limit);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return rowsToCamel(data || []);
}

async function insert(table: string, row: Record<string, any>) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .insert(objToSnake(row))
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToCamel(data);
}

async function upsert(table: string, row: Record<string, any>, onConflict?: string) {
  const opts: any = { onConflict };
  const { data, error } = await supabaseAdmin
    .from(table)
    .upsert(objToSnake(row), opts)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToCamel(data);
}

async function update(table: string, id: string, changes: Record<string, any>) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .update(objToSnake(changes))
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToCamel(data);
}

async function updateWhere(table: string, filters: Record<string, any>, changes: Record<string, any>) {
  let q = supabaseAdmin.from(table).update(objToSnake(changes));
  for (const [k, v] of Object.entries(filters)) {
    q = q.eq(toSnake(k), v);
  }
  const { data, error } = await q.select();
  if (error) throw new Error(error.message);
  return rowsToCamel(data || []);
}

async function remove(table: string, id: string) {
  const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

async function removeWhere(table: string, filters: Record<string, any>) {
  let q = supabaseAdmin.from(table).delete();
  for (const [k, v] of Object.entries(filters)) {
    q = q.eq(toSnake(k), v);
  }
  const { error } = await q;
  if (error) throw new Error(error.message);
}

async function count(table: string, filters: Record<string, any> = {}): Promise<number> {
  let q = supabaseAdmin.from(table).select("*", { count: "exact", head: true });
  for (const [k, v] of Object.entries(filters)) {
    q = q.eq(toSnake(k), v);
  }
  const { count: c, error } = await q;
  if (error) throw new Error(error.message);
  return c || 0;
}

// ─── Domain-specific helpers ─────────────────────────────────────────────

/** Get all approved members of a group with user profile data */
async function getGroupMembers(groupId: string) {
  const { data, error } = await supabaseAdmin
    .from("memberships")
    .select(`
      *,
      user:app_users!memberships_user_email_fkey (
        full_name, surname, country, phone, email
      )
    `)
    .eq("group_id", groupId)
    .eq("status", "approved");
  if (error) {
    // Fallback without join if FK doesn't exist
    return list("memberships", { groupId, status: "approved" });
  }
  return rowsToCamel(data || []);
}

/** Get contributions for a group in a specific month */
async function getContributionsByMonth(groupId: string, year: number, month: number) {
  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endDate = month === 11
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 2).padStart(2, "0")}-01`;

  const { data, error } = await supabaseAdmin
    .from("contributions")
    .select("*")
    .eq("group_id", groupId)
    .gte("date", startDate)
    .lt("date", endDate);
  if (error) throw new Error(error.message);
  return rowsToCamel(data || []);
}

/** Delete all data for a group (cascade handles most, but explicit for non-FK) */
async function deleteGroupData(groupId: string) {
  const tables = [
    "contributions", "payouts", "meetings", "votes", "notes",
    "chat_messages", "announcements", "invites", "join_requests",
    "constitutions", "subscriptions", "audit_log", "notifications",
    "penalty_rules", "penalty_charges", "rotation_orders",
    "grocery_items", "burial_beneficiaries", "burial_claims",
    "dependents", "payment_proofs", "meeting_rsvps", "memberships",
  ];
  for (const table of tables) {
    await supabaseAdmin.from(table).delete().eq("group_id", groupId);
  }
  await supabaseAdmin.from("groups").delete().eq("id", groupId);
}

/** Delete all data for a user across all groups */
async function deleteUserData(email: string, userId: string) {
  // Remove memberships
  await supabaseAdmin.from("memberships").delete().eq("user_email", email);
  // Remove notifications
  await supabaseAdmin.from("notifications").delete().eq("user_email", email);
  // Remove sessions
  await supabaseAdmin.from("sessions").delete().eq("user_id", userId);
  // Remove notification prefs
  await supabaseAdmin.from("notification_prefs").delete().eq("user_id", userId);
  // Remove bank details
  await supabaseAdmin.from("bank_details").delete().eq("user_id", userId);
  // Remove referral
  await supabaseAdmin.from("referrals").delete().eq("user_id", userId);
  // Remove user profile
  await supabaseAdmin.from("app_users").delete().eq("email", email);

  // Delete groups owned by this user (cascade deletes their data)
  const { data: ownedGroups } = await supabaseAdmin
    .from("groups")
    .select("id")
    .eq("created_by", email);
  for (const g of ownedGroups || []) {
    await deleteGroupData(g.id);
  }
}

// ─── Export ──────────────────────────────────────────────────────────────

export const db = {
  // Generic
  getById,
  getOne,
  list,
  insert,
  upsert,
  update,
  updateWhere,
  remove,
  removeWhere,
  count,

  // Domain
  getGroupMembers,
  getContributionsByMonth,
  deleteGroupData,
  deleteUserData,

  // Direct Supabase client (for complex queries)
  client: supabaseAdmin,

  // Helpers
  rowToCamel,
  rowsToCamel,
  objToSnake,
};
