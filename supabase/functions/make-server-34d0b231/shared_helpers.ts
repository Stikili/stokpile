/**
 * Shared helpers used by extra_routes.ts and more_routes.ts.
 * Avoids duplicating requireUser, logAudit, storeNotification, etc.
 */

const PREFIX = '/make-server-34d0b231';

export function createHelpers(supabaseAdmin: any, getAuthUser: any, getMembership: any) {

  async function requireUser(c: any) {
    const user = await getAuthUser(c);
    if (!user) throw Object.assign(new Error('Unauthorized'), { status: 401 });
    return user;
  }

  async function requireAdmin(groupId: string, user: any) {
    const mem = await getMembership(groupId, user.email);
    if (!mem || mem.role !== 'admin') throw Object.assign(new Error('Admin only'), { status: 403 });
    return mem;
  }

  async function requireMember(groupId: string, user: any) {
    const mem = await getMembership(groupId, user.email);
    if (!mem || mem.status !== 'approved') throw Object.assign(new Error('Not a member'), { status: 403 });
    return mem;
  }

  function handleError(c: any, error: any) {
    const status = error.status || 500;
    return c.json({ error: error.message || 'Internal error' }, status);
  }

  async function logAudit(groupId: string, userEmail: string, action: string, details?: any) {
    try {
      await supabaseAdmin.from('audit_log').insert({
        group_id: groupId,
        user_email: userEmail,
        action,
        details: details || null,
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      console.warn('Audit log failed:', e.message);
    }
  }

  async function storeNotification(userEmail: string, groupId: string | null, title: string, message: string, type = 'info') {
    try {
      await supabaseAdmin.from('notifications').insert({
        user_email: userEmail,
        group_id: groupId,
        title,
        message,
        type,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (e: any) {
      console.warn('Notification store failed:', e.message);
    }
  }

  return { requireUser, requireAdmin, requireMember, handleError, logAudit, storeNotification, PREFIX };
}
