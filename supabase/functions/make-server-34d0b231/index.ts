import { Hono } from "npm:hono@4.6.14";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import { registerExtraRoutes } from "./extra_routes.ts";
import { registerMoreRoutes } from "./more_routes.ts";

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

// Reject request bodies > 5MB to prevent abuse
app.use('*', async (c: any, next: any) => {
  const contentLength = c.req.header('content-length');
  if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
    return c.json({ error: 'Request body too large (max 5MB)' }, 413);
  }
  await next();
});

const db = () =>
  createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

// Shorthand used throughout: a fresh client per request avoids
// stale connection state across Deno isolate restarts.
const supabaseAdmin = db();

// ============================================================
// HELPERS
// ============================================================

const generateGroupCode = () =>
  Math.random().toString(36).substring(2, 10).toUpperCase();

/** Verify Bearer token and return the authenticated Supabase user. */
async function getAuthUser(c: any) {
  const token = c.req.header('Authorization')?.split(' ')[1];
  if (!token || token === 'null') return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user ?? null;
}

// ============================================================
// CAMELCASE MAPPERS
// Convert snake_case DB rows → camelCase API responses so the
// existing frontend code keeps working without any changes.
// ============================================================

function toGroup(row: any, userRole?: string) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    contributionFrequency: row.contribution_frequency,
    isPublic: row.is_public,
    groupCode: row.group_code,
    payoutsAllowed: row.payouts_allowed,
    admin1: row.admin1 ?? null,
    admin2: row.admin2 ?? null,
    admin3: row.admin3 ?? null,
    inviteToken: row.invite_token ?? null,
    inviteTokenCreatedAt: row.invite_token_created_at ?? null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
    updatedBy: row.updated_by ?? null,
    ...(userRole !== undefined ? { userRole } : {}),
  };
}

function toMembership(row: any) {
  if (!row) return null;
  return {
    groupId: row.group_id,
    userEmail: row.user_email,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at ?? null,
    requestedAt: row.requested_at ?? null,
    approvedAt: row.approved_at ?? null,
    approvedBy: row.approved_by ?? null,
    deactivatedAt: row.deactivated_at ?? null,
    deactivatedBy: row.deactivated_by ?? null,
    reactivatedAt: row.reactivated_at ?? null,
    reactivatedBy: row.reactivated_by ?? null,
    promotedAt: row.promoted_at ?? null,
    promotedBy: row.promoted_by ?? null,
    demotedAt: row.demoted_at ?? null,
    demotedBy: row.demoted_by ?? null,
    joinedVia: row.joined_via ?? null,
    invitedBy: row.invited_by ?? null,
  };
}

function toContribution(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    groupId: row.group_id,
    userEmail: row.user_email,
    amount: Number(row.amount),
    date: row.date,
    paid: row.paid,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
  };
}

function toPayout(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    groupId: row.group_id,
    recipientEmail: row.recipient_email,
    amount: Number(row.amount),
    scheduledDate: row.scheduled_date,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function toMeeting(row: any) {
  if (!row) return null;
  // meeting_attendance rows come in as an array from the join
  const attendance: Record<string, boolean> = {};
  if (Array.isArray(row.meeting_attendance)) {
    for (const a of row.meeting_attendance) {
      attendance[a.user_email] = a.attended;
    }
  }
  return {
    id: row.id,
    groupId: row.group_id,
    date: row.date,
    time: row.time ?? null,
    venue: row.venue ?? null,
    agenda: row.agenda ?? null,
    attendance,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
    updatedBy: row.updated_by ?? null,
  };
}

function toNote(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    groupId: row.group_id,
    meetingId: row.meeting_id ?? null,
    title: row.title,
    content: row.content ?? null,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function toVote(row: any) {
  if (!row) return null;
  const yesVotes: string[] = [];
  const noVotes: string[] = [];
  if (Array.isArray(row.vote_responses)) {
    for (const r of row.vote_responses) {
      if (r.response === 'yes') yesVotes.push(r.user_email);
      else noVotes.push(r.user_email);
    }
  }
  return {
    id: row.id,
    groupId: row.group_id,
    meetingId: row.meeting_id ?? null,
    question: row.question,
    active: row.active,
    yesVotes,
    noVotes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function toChatMessage(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    groupId: row.group_id,
    meetingId: row.meeting_id ?? null,
    userEmail: row.user_email,
    message: row.message,
    createdAt: row.created_at,
  };
}

function toProfile(row: any) {
  if (!row) return null;
  return {
    email: row.email,
    fullName: row.full_name ?? '',
    surname: row.surname ?? '',
    country: row.country ?? null,
    profilePictureUrl: row.profile_picture_url ?? null,
    createdAt: row.created_at,
  };
}

// ============================================================
// QUERY HELPERS
// ============================================================

async function getMembership(groupId: string, userEmail: string) {
  const { data } = await supabaseAdmin
    .from('group_memberships')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_email', userEmail)
    .maybeSingle();
  return data;
}

async function isGroupNameUnique(name: string, excludeGroupId?: string) {
  let q = supabaseAdmin
    .from('groups')
    .select('id')
    .ilike('name', name);
  if (excludeGroupId) q = q.neq('id', excludeGroupId);
  const { data } = await q;
  return !data || data.length === 0;
}

// ============================================================
// AUTH ENDPOINTS
// ============================================================

app.post('/make-server-34d0b231/signup', async (c) => {
  try {
    const { email, password, fullName, surname, country } = await c.req.json();

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { fullName, surname, country },
      email_confirm: true,
    });

    if (error) return c.json({ error: error.message }, 400);

    // Upsert profile row
    await supabaseAdmin.from('profiles').upsert({
      email,
      full_name: fullName,
      surname,
      country,
      created_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    return c.json({ success: true, user: data.user });
  } catch (err: any) {
    console.log(`Signup exception: ${err.message}`);
    return c.json({ error: err.message }, 500);
  }
});

app.post('/make-server-34d0b231/signin', async (c) => {
  try {
    const { email, password } = await c.req.json();
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error) return c.json({ error: error.message }, 400);
    return c.json({
      success: true,
      accessToken: data.session.access_token,
      user: data.user,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/make-server-34d0b231/session', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken || accessToken === 'null') return c.json({ session: null });

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !user) return c.json({ session: null });

    return c.json({ session: { user, access_token: accessToken } });
  } catch {
    return c.json({ session: null });
  }
});

app.post('/make-server-34d0b231/signout', async (c) => {
  try {
    const token = c.req.header('Authorization')?.split(' ')[1];
    if (token) await supabaseAdmin.auth.admin.signOut(token);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/make-server-34d0b231/auth/request-reset', async (c) => {
  try {
    const { email } = await c.req.json();
    if (!email) return c.json({ error: 'Email is required' }, 400);

    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const exists = users.users.some(u => u.email === email);
    if (!exists) {
      return c.json({
        success: true,
        message: 'If an account exists with this email, a reset code has been generated.',
        resetCode: null,
      });
    }

    // 8-char alphanumeric code — harder to brute-force than 6 digits
    const resetCode = Array.from(crypto.getRandomValues(new Uint8Array(5)))
      .map(b => b.toString(36).padStart(2, '0'))
      .join('')
      .substring(0, 8)
      .toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabaseAdmin.from('password_reset_codes').upsert({
      email,
      code: resetCode,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    return c.json({
      success: true,
      message: 'Reset code generated. In production this would be sent via email.',
      // resetCode intentionally NOT returned — sent via email only
      expiresIn: '15 minutes',
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/make-server-34d0b231/auth/reset-password', async (c) => {
  try {
    const { email, resetCode, newPassword } = await c.req.json();
    if (!email || !resetCode || !newPassword)
      return c.json({ error: 'Email, reset code, and new password are required' }, 400);
    if (newPassword.length < 6)
      return c.json({ error: 'Password must be at least 6 characters' }, 400);

    const { data: row } = await supabaseAdmin
      .from('password_reset_codes')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!row) return c.json({ error: 'Invalid or expired reset code' }, 400);

    if (new Date(row.expires_at) < new Date()) {
      await supabaseAdmin.from('password_reset_codes').delete().eq('email', email);
      return c.json({ error: 'Reset code has expired. Please request a new one.' }, 400);
    }

    if (row.code !== resetCode) return c.json({ error: 'Invalid reset code' }, 400);

    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users.users.find(u => u.email === email);
    if (!user) return c.json({ error: 'User not found' }, 404);

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: newPassword });
    if (error) return c.json({ error: 'Failed to update password' }, 500);

    await supabaseAdmin.from('password_reset_codes').delete().eq('email', email);

    return c.json({ success: true, message: 'Password successfully reset.' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// PROFILE ENDPOINTS
// ============================================================

app.get('/make-server-34d0b231/profile', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    // Return from profiles table first; fall back to auth metadata
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', user.email!)
      .maybeSingle();

    return c.json({
      email: user.email,
      fullName: profile?.full_name ?? user.user_metadata?.fullName ?? '',
      surname: profile?.surname ?? user.user_metadata?.surname ?? '',
      country: profile?.country ?? user.user_metadata?.country ?? null,
      profilePictureUrl:
        profile?.profile_picture_url ?? user.user_metadata?.profilePictureUrl ?? null,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/make-server-34d0b231/profile', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { fullName, surname, profilePictureUrl } = await c.req.json();

    const { data: updatedUser, error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { user_metadata: { ...user.user_metadata, fullName, surname, profilePictureUrl } },
    );
    if (error) return c.json({ error: error.message }, 500);

    // Keep profiles table in sync
    await supabaseAdmin.from('profiles').upsert({
      email: user.email!,
      full_name: fullName,
      surname,
      profile_picture_url: profilePictureUrl ?? null,
    }, { onConflict: 'email' });

    return c.json({ success: true, user: updatedUser });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/make-server-34d0b231/profile/picture', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    if (!file) return c.json({ error: 'No file provided' }, 400);
    if (!file.type.startsWith('image/')) return c.json({ error: 'File must be an image' }, 400);
    if (file.size > 5 * 1024 * 1024) return c.json({ error: 'File size must be less than 5MB' }, 400);

    const BUCKET = 'make-34d0b231-profile-pictures';
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.some(b => b.name === BUCKET)) {
      await supabaseAdmin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 5242880 });
    }

    const ext = file.name.split('.').pop();
    const filePath = `profile-pictures/${user.id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, await file.arrayBuffer(), { contentType: file.type, upsert: true });
    if (uploadError) return c.json({ error: uploadError.message }, 500);

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filePath);
    return c.json({ url: urlData.publicUrl });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// GROUP MANAGEMENT
// ============================================================

app.post('/make-server-34d0b231/groups', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { name, description, contributionFrequency, isPublic } = await c.req.json();

    if (!(await isGroupNameUnique(name)))
      return c.json({ error: 'A group with this name already exists.' }, 400);

    // Ensure profile row exists
    await supabaseAdmin.from('profiles').upsert({
      email: user.email!,
      full_name: user.user_metadata?.fullName ?? '',
      surname: user.user_metadata?.surname ?? '',
    }, { onConflict: 'email' });

    const { data: group, error } = await supabaseAdmin
      .from('groups')
      .insert({
        name,
        description: description ?? '',
        contribution_frequency: contributionFrequency ?? 'monthly',
        is_public: isPublic ?? false,
        group_code: generateGroupCode(),
        payouts_allowed: true,
        admin1: user.email,
        created_by: user.email,
      })
      .select()
      .single();

    if (error) return c.json({ error: error.message }, 500);

    // Creator becomes approved admin member
    await supabaseAdmin.from('group_memberships').insert({
      group_id: group.id,
      user_email: user.email,
      role: 'admin',
      status: 'approved',
      joined_at: new Date().toISOString(),
    });

    // Set as selected group
    await supabaseAdmin.from('selected_groups').upsert({
      user_email: user.email,
      group_id: group.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_email' });

    return c.json({ success: true, group: toGroup(group, 'admin') });
  } catch (err: any) {
    console.log(`Create group error: ${err.message}`);
    return c.json({ error: err.message }, 500);
  }
});

app.get('/make-server-34d0b231/groups', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    // Get all groups the user is an approved member of, with role
    const { data: memberships } = await supabaseAdmin
      .from('group_memberships')
      .select('group_id, role, groups(*)')
      .eq('user_email', user.email!)
      .eq('status', 'approved');

    const groups = (memberships ?? []).map((m: any) =>
      toGroup(m.groups, m.role)
    ).filter(Boolean);

    return c.json({ groups });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/make-server-34d0b231/groups/search/public', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const query = c.req.query('q') ?? '';

    const { data: publicGroups } = await supabaseAdmin
      .from('groups')
      .select('id, name, description')
      .eq('is_public', true)
      .ilike('name', `%${query}%`);

    const groups = await Promise.all((publicGroups ?? []).map(async (g) => {
      const { count: memberCount } = await supabaseAdmin
        .from('group_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', g.id)
        .eq('status', 'approved');

      const membership = await getMembership(g.id, user.email!);
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        memberCount: memberCount ?? 0,
        userStatus: membership?.status ?? null,
      };
    }));

    return c.json({ groups });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Single group — must come AFTER /search/public to avoid route conflict
app.get('/make-server-34d0b231/groups/:id', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('id');
    const membership = await getMembership(groupId, user.email!);
    if (!membership || membership.status !== 'approved')
      return c.json({ error: 'Not a member of this group' }, 403);

    const { data: group } = await supabaseAdmin
      .from('groups').select('*').eq('id', groupId).single();

    return c.json({ group: toGroup(group, membership.role) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/make-server-34d0b231/groups/:id', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('id');
    const membership = await getMembership(groupId, user.email!);
    if (!membership || membership.role !== 'admin')
      return c.json({ error: 'Not authorized – admin only' }, 403);

    const { isPublic, payoutsAllowed, name, description } = await c.req.json();
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
      updated_by: user.email,
    };

    if (typeof isPublic === 'boolean') updates.is_public = isPublic;
    if (typeof payoutsAllowed === 'boolean') updates.payouts_allowed = payoutsAllowed;
    if (name?.trim()) {
      if (!(await isGroupNameUnique(name, groupId)))
        return c.json({ error: 'A group with this name already exists.' }, 400);
      updates.name = name.trim();
    }
    if (description !== undefined && description !== null)
      updates.description = description.trim();

    const { data: group, error } = await supabaseAdmin
      .from('groups').update(updates).eq('id', groupId).select().single();
    if (error) return c.json({ error: error.message }, 500);

    return c.json({ success: true, group: toGroup(group, membership.role) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/make-server-34d0b231/groups/:id/frequency', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('id');
    const membership = await getMembership(groupId, user.email!);
    if (!membership || membership.role !== 'admin')
      return c.json({ error: 'Not authorized – admin only' }, 403);

    const { frequency } = await c.req.json();
    if (!frequency) return c.json({ error: 'Frequency is required' }, 400);

    const { data: group, error } = await supabaseAdmin
      .from('groups')
      .update({
        contribution_frequency: frequency,
        updated_at: new Date().toISOString(),
        updated_by: user.email,
      })
      .eq('id', groupId)
      .select()
      .single();
    if (error) return c.json({ error: error.message }, 500);

    return c.json({ success: true, group: toGroup(group, membership.role) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/make-server-34d0b231/groups/:id', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('id');
    const membership = await getMembership(groupId, user.email!);
    if (!membership || membership.role !== 'admin')
      return c.json({ error: 'Not authorized – admin only' }, 403);

    // Get constitution path before cascade-deleting
    const { data: constitution } = await supabaseAdmin
      .from('constitutions').select('file_path').eq('group_id', groupId).maybeSingle();

    if (constitution?.file_path) {
      await supabaseAdmin.storage
        .from('make-34d0b231-constitutions')
        .remove([constitution.file_path])
        .catch(() => {/* non-fatal */});
    }

    // CASCADE DELETE removes all child rows automatically
    const { error } = await supabaseAdmin.from('groups').delete().eq('id', groupId);
    if (error) return c.json({ error: error.message }, 500);

    return c.json({ success: true, message: 'Group and all associated data deleted.' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// JOIN / REQUESTS
// ============================================================

app.post('/make-server-34d0b231/groups/join', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { groupName, groupCode } = await c.req.json();
    if (!groupName?.trim()) return c.json({ error: 'Group name is required' }, 400);

    const { data: group } = await supabaseAdmin
      .from('groups').select('*').ilike('name', groupName.trim()).maybeSingle();
    if (!group) return c.json({ error: 'Group not found' }, 404);

    if (groupCode && group.group_code !== groupCode)
      return c.json({ error: 'Invalid group code' }, 400);
    if (!group.is_public && !groupCode)
      return c.json({ error: 'Group code required for private groups' }, 400);

    const existing = await getMembership(group.id, user.email!);
    if (existing) return c.json({ error: 'Already requested or a member' }, 400);

    await supabaseAdmin.from('profiles').upsert({
      email: user.email!,
      full_name: user.user_metadata?.fullName ?? '',
      surname: user.user_metadata?.surname ?? '',
    }, { onConflict: 'email' });

    const { data: membership } = await supabaseAdmin
      .from('group_memberships')
      .insert({
        group_id: group.id,
        user_email: user.email,
        role: 'member',
        status: 'pending',
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    return c.json({ success: true, membership: toMembership(membership) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/make-server-34d0b231/groups/:groupId/join', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const { data: group } = await supabaseAdmin
      .from('groups').select('id').eq('id', groupId).maybeSingle();
    if (!group) return c.json({ error: 'Group not found' }, 404);

    const existing = await getMembership(groupId, user.email!);
    if (existing) return c.json({ error: 'Already requested or a member' }, 400);

    await supabaseAdmin.from('profiles').upsert({
      email: user.email!,
      full_name: user.user_metadata?.fullName ?? '',
      surname: user.user_metadata?.surname ?? '',
    }, { onConflict: 'email' });

    const { data: membership } = await supabaseAdmin
      .from('group_memberships')
      .insert({
        group_id: groupId,
        user_email: user.email,
        role: 'member',
        status: 'pending',
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    return c.json({ success: true, membership: toMembership(membership) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/make-server-34d0b231/groups/:id/requests', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('id');
    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.role !== 'admin')
      return c.json({ error: 'Not authorized' }, 403);

    const { data: pending } = await supabaseAdmin
      .from('group_memberships')
      .select('*, profiles(*)')
      .eq('group_id', groupId)
      .eq('status', 'pending');

    const requests = (pending ?? []).map((m: any) => ({
      ...toMembership(m),
      user: toProfile(m.profiles),
    }));

    return c.json({ requests });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/make-server-34d0b231/groups/:id/requests/:email/approve', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('id');
    const memberEmail = decodeURIComponent(c.req.param('email'));

    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.role !== 'admin')
      return c.json({ error: 'Not authorized' }, 403);

    const { data: membership, error } = await supabaseAdmin
      .from('group_memberships')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user.email,
        joined_at: new Date().toISOString(),
      })
      .eq('group_id', groupId)
      .eq('user_email', memberEmail)
      .select()
      .single();
    if (error) return c.json({ error: error.message }, 500);

    return c.json({ success: true, membership: toMembership(membership) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/make-server-34d0b231/groups/:id/requests/:email/deny', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('id');
    const memberEmail = decodeURIComponent(c.req.param('email'));

    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.role !== 'admin')
      return c.json({ error: 'Not authorized' }, 403);

    await supabaseAdmin
      .from('group_memberships')
      .delete()
      .eq('group_id', groupId)
      .eq('user_email', memberEmail);

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// MEMBER MANAGEMENT
// ============================================================

// Get members (approved + inactive) — two route patterns for compatibility
async function handleGetMembers(c: any) {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('id') ?? c.req.param('groupId');
    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.status !== 'approved')
      return c.json({ error: 'Not a member of this group' }, 403);

    const { data } = await supabaseAdmin
      .from('group_memberships')
      .select('*, profiles(*)')
      .eq('group_id', groupId)
      .in('status', ['approved', 'inactive']);

    const members = (data ?? []).map((m: any) => ({
      email: m.user_email,
      fullName: m.profiles?.full_name ?? 'Unknown',
      surname: m.profiles?.surname ?? 'User',
      profilePictureUrl: m.profiles?.profile_picture_url ?? null,
      role: m.role,
      status: m.status,
      joinedAt: m.joined_at,
      deactivatedAt: m.deactivated_at ?? null,
      deactivatedBy: m.deactivated_by ?? null,
    }));

    return c.json({ members });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
}

app.get('/make-server-34d0b231/groups/:groupId/members', handleGetMembers);
app.get('/make-server-34d0b231/groups/:id/members', handleGetMembers);

app.delete('/make-server-34d0b231/groups/:id/members/:email', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('id');
    const memberEmail = decodeURIComponent(c.req.param('email'));

    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.role !== 'admin')
      return c.json({ error: 'Not authorized' }, 403);

    const { data: group } = await supabaseAdmin
      .from('groups').select('*').eq('id', groupId).single();
    if (memberEmail === group.created_by && group.admin1 === memberEmail)
      return c.json({ error: 'Cannot remove group creator' }, 400);

    const targetMembership = await getMembership(groupId, memberEmail);
    if (!targetMembership) return c.json({ error: 'Member not found' }, 404);

    // Clear admin slot if needed
    if (targetMembership.role === 'admin') {
      const adminUpdates: Record<string, any> = {};
      if (group.admin1 === memberEmail) {
        adminUpdates.admin1 = group.admin2;
        adminUpdates.admin2 = group.admin3;
        adminUpdates.admin3 = null;
      } else if (group.admin2 === memberEmail) {
        adminUpdates.admin2 = group.admin3;
        adminUpdates.admin3 = null;
      } else if (group.admin3 === memberEmail) {
        adminUpdates.admin3 = null;
      }
      if (Object.keys(adminUpdates).length)
        await supabaseAdmin.from('groups').update(adminUpdates).eq('id', groupId);
    }

    await supabaseAdmin
      .from('group_memberships')
      .delete()
      .eq('group_id', groupId)
      .eq('user_email', memberEmail);

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/make-server-34d0b231/groups/:id/members/:email/promote', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('id');
    const memberEmail = decodeURIComponent(c.req.param('email'));

    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.role !== 'admin')
      return c.json({ error: 'Not authorized – admin only' }, 403);

    const { data: group } = await supabaseAdmin
      .from('groups').select('*').eq('id', groupId).single();

    const adminCount = [group.admin1, group.admin2, group.admin3].filter(Boolean).length;
    if (adminCount >= 3)
      return c.json({ error: 'Maximum 3 admins. Demote an admin first.' }, 400);

    const targetMembership = await getMembership(groupId, memberEmail);
    if (!targetMembership) return c.json({ error: 'Member not found' }, 404);
    if (targetMembership.role === 'admin') return c.json({ error: 'Already an admin' }, 400);

    // Assign next empty admin slot
    const adminUpdate: Record<string, any> = {};
    if (!group.admin1) adminUpdate.admin1 = memberEmail;
    else if (!group.admin2) adminUpdate.admin2 = memberEmail;
    else adminUpdate.admin3 = memberEmail;
    await supabaseAdmin.from('groups').update(adminUpdate).eq('id', groupId);

    const { data: membership } = await supabaseAdmin
      .from('group_memberships')
      .update({ role: 'admin', promoted_at: new Date().toISOString(), promoted_by: user.email })
      .eq('group_id', groupId)
      .eq('user_email', memberEmail)
      .select()
      .single();

    return c.json({ success: true, membership: toMembership(membership) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/make-server-34d0b231/groups/:id/members/:email/demote', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('id');
    const memberEmail = decodeURIComponent(c.req.param('email'));

    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.role !== 'admin')
      return c.json({ error: 'Not authorized – admin only' }, 403);

    const { data: group } = await supabaseAdmin
      .from('groups').select('*').eq('id', groupId).single();
    if (group.created_by === memberEmail && group.admin1 === memberEmail)
      return c.json({ error: 'Cannot demote the group creator' }, 400);

    const targetMembership = await getMembership(groupId, memberEmail);
    if (!targetMembership || targetMembership.role !== 'admin')
      return c.json({ error: 'User is not an admin' }, 400);

    // Clear admin slot
    const adminUpdates: Record<string, any> = {};
    if (group.admin1 === memberEmail) {
      adminUpdates.admin1 = group.admin2; adminUpdates.admin2 = group.admin3; adminUpdates.admin3 = null;
    } else if (group.admin2 === memberEmail) {
      adminUpdates.admin2 = group.admin3; adminUpdates.admin3 = null;
    } else if (group.admin3 === memberEmail) {
      adminUpdates.admin3 = null;
    }
    await supabaseAdmin.from('groups').update(adminUpdates).eq('id', groupId);

    const { data: membership } = await supabaseAdmin
      .from('group_memberships')
      .update({ role: 'member', demoted_at: new Date().toISOString(), demoted_by: user.email })
      .eq('group_id', groupId)
      .eq('user_email', memberEmail)
      .select()
      .single();

    return c.json({ success: true, membership: toMembership(membership) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/make-server-34d0b231/groups/:id/members/:email/deactivate', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('id');
    const memberEmail = decodeURIComponent(c.req.param('email'));

    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.role !== 'admin')
      return c.json({ error: 'Not authorized' }, 403);

    const { data: group } = await supabaseAdmin
      .from('groups').select('created_by, admin1').eq('id', groupId).single();
    if (memberEmail === group.created_by && group.admin1 === memberEmail)
      return c.json({ error: 'Cannot deactivate group creator' }, 400);

    const { data: membership } = await supabaseAdmin
      .from('group_memberships')
      .update({ status: 'inactive', deactivated_at: new Date().toISOString(), deactivated_by: user.email })
      .eq('group_id', groupId)
      .eq('user_email', memberEmail)
      .select()
      .single();

    return c.json({ success: true, membership: toMembership(membership) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/make-server-34d0b231/groups/:id/members/:email/reactivate', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('id');
    const memberEmail = decodeURIComponent(c.req.param('email'));

    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.role !== 'admin')
      return c.json({ error: 'Not authorized' }, 403);

    const { data: membership } = await supabaseAdmin
      .from('group_memberships')
      .update({
        status: 'approved',
        reactivated_at: new Date().toISOString(),
        reactivated_by: user.email,
        deactivated_at: null,
        deactivated_by: null,
      })
      .eq('group_id', groupId)
      .eq('user_email', memberEmail)
      .select()
      .single();

    return c.json({ success: true, membership: toMembership(membership) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// MEMBER STATISTICS
// ============================================================

app.get('/make-server-34d0b231/groups/:id/members/:email/stats', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('id');
    const memberEmail = decodeURIComponent(c.req.param('email'));

    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.status !== 'approved')
      return c.json({ error: 'Not a member of this group' }, 403);

    const [{ data: contribs }, { data: pays }] = await Promise.all([
      supabaseAdmin
        .from('contributions')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_email', memberEmail)
        .order('date', { ascending: false }),
      supabaseAdmin
        .from('payouts')
        .select('*')
        .eq('group_id', groupId)
        .eq('recipient_email', memberEmail)
        .order('scheduled_date', { ascending: false }),
    ]);

    const contributions = (contribs ?? []).map(toContribution);
    const payouts = (pays ?? []).map(toPayout);

    return c.json({
      totalContributions: contributions.reduce((s: number, c: any) => s + c.amount, 0),
      contributionCount: contributions.length,
      totalPayouts: payouts.reduce((s: number, p: any) => s + p.amount, 0),
      payoutCount: payouts.length,
      recentContributions: contributions,
      recentPayouts: payouts,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// SELECTED GROUP
// ============================================================

app.get('/make-server-34d0b231/selected-group', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { data: sg } = await supabaseAdmin
      .from('selected_groups')
      .select('group_id')
      .eq('user_email', user.email!)
      .maybeSingle();

    if (!sg?.group_id) return c.json({ selectedGroupId: null });

    const { data: group } = await supabaseAdmin
      .from('groups').select('*').eq('id', sg.group_id).maybeSingle();
    const membership = await getMembership(sg.group_id, user.email!);

    return c.json({
      selectedGroupId: sg.group_id,
      group: group ? toGroup(group, membership?.role) : null,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/make-server-34d0b231/selected-group', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { groupId } = await c.req.json();
    const membership = await getMembership(groupId, user.email!);
    if (!membership || membership.status !== 'approved')
      return c.json({ error: 'Not a member of this group' }, 403);

    await supabaseAdmin.from('selected_groups').upsert({
      user_email: user.email,
      group_id: groupId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_email' });

    return c.json({ success: true, selectedGroupId: groupId });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// CONTRIBUTIONS
// ============================================================

app.post('/make-server-34d0b231/contributions', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { groupId, amount, date, paid, userEmail } = await c.req.json();
    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.status !== 'approved')
      return c.json({ error: 'Not a member of this group' }, 403);

    let targetEmail = user.email!;
    if (userEmail && userEmail !== user.email) {
      if (myMembership.role !== 'admin')
        return c.json({ error: 'Only admins can add contributions for others' }, 403);
      const targetM = await getMembership(groupId, userEmail);
      if (!targetM || targetM.status !== 'approved')
        return c.json({ error: 'Target user is not an approved member' }, 400);
      targetEmail = userEmail;
    }

    const { data: contribution, error } = await supabaseAdmin
      .from('contributions')
      .insert({
        group_id: groupId,
        user_email: targetEmail,
        amount: parseFloat(amount),
        date: date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        paid: paid ?? false,
        created_by: user.email,
      })
      .select()
      .single();
    if (error) return c.json({ error: error.message }, 500);

    return c.json({ success: true, contribution: toContribution(contribution) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/make-server-34d0b231/contributions', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.query('groupId');
    const myMembership = await getMembership(groupId!, user.email!);
    if (!myMembership || myMembership.status !== 'approved')
      return c.json({ error: 'Not a member of this group' }, 403);

    const { data } = await supabaseAdmin
      .from('contributions')
      .select('*, profiles(full_name, surname, profile_picture_url)')
      .eq('group_id', groupId!)
      .order('date', { ascending: false });

    const contributions = (data ?? []).map((row: any) => ({
      ...toContribution(row),
      user: row.profiles
        ? {
            fullName: row.profiles.full_name ?? '',
            surname: row.profiles.surname ?? '',
            profilePictureUrl: row.profiles.profile_picture_url ?? null,
          }
        : null,
    }));

    return c.json({ contributions });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/make-server-34d0b231/contributions/:id', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const contribId = c.req.param('id');
    const { paid } = await c.req.json();

    const { data: existing } = await supabaseAdmin
      .from('contributions').select('*').eq('id', contribId).maybeSingle();
    if (!existing) return c.json({ error: 'Contribution not found' }, 404);

    // Owner or admin can update
    const myMembership = await getMembership(existing.group_id, user.email!);
    const isOwner = existing.user_email === user.email;
    const isAdmin = myMembership?.role === 'admin';
    if (!isOwner && !isAdmin) return c.json({ error: 'Not authorized' }, 403);

    const { data: contribution } = await supabaseAdmin
      .from('contributions')
      .update({ paid, updated_at: new Date().toISOString() })
      .eq('id', contribId)
      .select()
      .single();

    return c.json({ success: true, contribution: toContribution(contribution) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/make-server-34d0b231/contributions/:id', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const contribId = c.req.param('id');
    const { data: existing } = await supabaseAdmin
      .from('contributions').select('*').eq('id', contribId).maybeSingle();
    if (!existing) return c.json({ error: 'Contribution not found' }, 404);

    const myMembership = await getMembership(existing.group_id, user.email!);
    const isOwner = existing.user_email === user.email;
    const isAdmin = myMembership?.role === 'admin';
    if (!isOwner && !isAdmin) return c.json({ error: 'Not authorized' }, 403);

    await supabaseAdmin.from('contributions').delete().eq('id', contribId);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// CONTRIBUTION ADJUSTMENT
// ============================================================

app.get('/make-server-34d0b231/groups/:groupId/contribution-adjustment', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.status !== 'approved')
      return c.json({ error: 'Not a member of this group' }, 403);

    const { data } = await supabaseAdmin
      .from('contribution_adjustments')
      .select('amount')
      .eq('group_id', groupId)
      .maybeSingle();

    return c.json({ adjustment: data ? Number(data.amount) : 0 });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/make-server-34d0b231/groups/:groupId/contribution-adjustment', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.role !== 'admin')
      return c.json({ error: 'Not authorized – admin only' }, 403);

    const { adjustment } = await c.req.json();
    if (typeof adjustment !== 'number') return c.json({ error: 'Adjustment must be a number' }, 400);

    await supabaseAdmin.from('contribution_adjustments').upsert({
      group_id: groupId,
      amount: adjustment,
      updated_by: user.email,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'group_id' });

    return c.json({ success: true, adjustment });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// PAYOUTS
// ============================================================

app.post('/make-server-34d0b231/payouts', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { groupId, recipientEmail, amount, scheduledDate } = await c.req.json();
    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.role !== 'admin')
      return c.json({ error: 'Not authorized – admin only' }, 403);

    const { data: group } = await supabaseAdmin
      .from('groups').select('payouts_allowed').eq('id', groupId).single();
    if (!group.payouts_allowed) return c.json({ error: 'Payouts not allowed for this group' }, 400);

    const recipientM = await getMembership(groupId, recipientEmail);
    if (!recipientM || recipientM.status !== 'approved')
      return c.json({ error: 'Recipient must be an approved group member' }, 400);

    const { data: payout, error } = await supabaseAdmin
      .from('payouts')
      .insert({
        group_id: groupId,
        recipient_email: recipientEmail,
        amount: parseFloat(amount),
        scheduled_date: scheduledDate
          ? new Date(scheduledDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        status: 'scheduled',
        created_by: user.email,
      })
      .select()
      .single();
    if (error) return c.json({ error: error.message }, 500);

    return c.json({ success: true, payout: toPayout(payout) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/make-server-34d0b231/payouts', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.query('groupId');
    const myMembership = await getMembership(groupId!, user.email!);
    if (!myMembership || myMembership.status !== 'approved')
      return c.json({ error: 'Not a member of this group' }, 403);

    const { data } = await supabaseAdmin
      .from('payouts')
      .select('*, profiles!payouts_recipient_email_fkey(full_name, surname, profile_picture_url)')
      .eq('group_id', groupId!)
      .order('scheduled_date', { ascending: false });

    const payouts = (data ?? []).map((row: any) => ({
      ...toPayout(row),
      recipient: {
        email: row.recipient_email,
        fullName: row.profiles?.full_name ?? 'Unknown',
        surname: row.profiles?.surname ?? 'User',
        profilePictureUrl: row.profiles?.profile_picture_url ?? null,
      },
    }));

    return c.json({ payouts });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/make-server-34d0b231/payouts/:id', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const payoutId = c.req.param('id');
    const { status } = await c.req.json();

    const { data: existing } = await supabaseAdmin
      .from('payouts').select('*').eq('id', payoutId).maybeSingle();
    if (!existing) return c.json({ error: 'Payout not found' }, 404);

    const myMembership = await getMembership(existing.group_id, user.email!);
    if (!myMembership || myMembership.role !== 'admin')
      return c.json({ error: 'Not authorized' }, 403);

    const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (status === 'completed') updates.completed_at = new Date().toISOString();

    const { data: payout } = await supabaseAdmin
      .from('payouts').update(updates).eq('id', payoutId).select().single();

    return c.json({ success: true, payout: toPayout(payout) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// MEETINGS
// ============================================================

app.post('/make-server-34d0b231/meetings', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { groupId, date, time, venue, agenda } = await c.req.json();
    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.role !== 'admin')
      return c.json({ error: 'Not authorized – admin only' }, 403);

    const { data: meeting, error } = await supabaseAdmin
      .from('meetings')
      .insert({ group_id: groupId, date, time, venue, agenda: agenda ?? null, created_by: user.email })
      .select('*, meeting_attendance(*)')
      .single();
    if (error) return c.json({ error: error.message }, 500);

    return c.json({ success: true, meeting: toMeeting(meeting) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/make-server-34d0b231/meetings', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.query('groupId');
    const myMembership = await getMembership(groupId!, user.email!);
    if (!myMembership || myMembership.status !== 'approved')
      return c.json({ error: 'Not a member of this group' }, 403);

    const { data } = await supabaseAdmin
      .from('meetings')
      .select('*, meeting_attendance(*)')
      .eq('group_id', groupId!)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    return c.json({ meetings: (data ?? []).map(toMeeting) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/make-server-34d0b231/meetings/:id', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const meetingId = c.req.param('id');
    const groupId = c.req.query('groupId');
    if (!groupId) return c.json({ error: 'groupId query param required' }, 400);

    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.status !== 'approved')
      return c.json({ error: 'Not a member of this group' }, 403);

    const { data: meeting } = await supabaseAdmin
      .from('meetings')
      .select('*, meeting_attendance(*)')
      .eq('id', meetingId)
      .eq('group_id', groupId)
      .maybeSingle();
    if (!meeting) return c.json({ error: 'Meeting not found' }, 404);

    return c.json({ meeting: toMeeting(meeting) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/make-server-34d0b231/meetings/:id', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const meetingId = c.req.param('id');
    const { groupId, date, time, venue, agenda } = await c.req.json();

    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.role !== 'admin')
      return c.json({ error: 'Not authorized – admin only' }, 403);

    const { data: meeting, error } = await supabaseAdmin
      .from('meetings')
      .update({ date, time, venue, agenda: agenda ?? null, updated_at: new Date().toISOString(), updated_by: user.email })
      .eq('id', meetingId)
      .eq('group_id', groupId)
      .select('*, meeting_attendance(*)')
      .single();
    if (error) return c.json({ error: error.message }, 500);

    return c.json({ success: true, meeting: toMeeting(meeting) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/make-server-34d0b231/meetings/:id', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const meetingId = c.req.param('id');
    const groupId = c.req.query('groupId');

    const myMembership = await getMembership(groupId!, user.email!);
    if (!myMembership || myMembership.role !== 'admin')
      return c.json({ error: 'Not authorized – admin only' }, 403);

    // CASCADE DELETE handles attendance, notes, votes, chat
    await supabaseAdmin.from('meetings').delete().eq('id', meetingId).eq('group_id', groupId!);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/make-server-34d0b231/meetings/:id/attendance', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const meetingId = c.req.param('id');
    const { groupId, memberEmail, isPresent } = await c.req.json();

    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.status !== 'approved')
      return c.json({ error: 'Not a member of this group' }, 403);

    await supabaseAdmin.from('meeting_attendance').upsert({
      meeting_id: meetingId,
      user_email: memberEmail,
      attended: isPresent,
    }, { onConflict: 'meeting_id,user_email' });

    // Return meeting with updated attendance
    const { data: meeting } = await supabaseAdmin
      .from('meetings')
      .select('*, meeting_attendance(*)')
      .eq('id', meetingId)
      .single();

    return c.json({ success: true, meeting: toMeeting(meeting) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// NOTES
// ============================================================

app.post('/make-server-34d0b231/notes', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { groupId, title, content, meetingId } = await c.req.json();
    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.status !== 'approved')
      return c.json({ error: 'Not a member of this group' }, 403);

    const { data: note, error } = await supabaseAdmin
      .from('notes')
      .insert({ group_id: groupId, meeting_id: meetingId ?? null, title, content: content ?? null, created_by: user.email })
      .select()
      .single();
    if (error) return c.json({ error: error.message }, 500);

    return c.json({ success: true, note: toNote(note) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/make-server-34d0b231/notes', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.query('groupId');
    const meetingId = c.req.query('meetingId');

    const myMembership = await getMembership(groupId!, user.email!);
    if (!myMembership || myMembership.status !== 'approved')
      return c.json({ error: 'Not a member of this group' }, 403);

    let q = supabaseAdmin
      .from('notes')
      .select('*, profiles!notes_created_by_fkey(full_name, surname, profile_picture_url)')
      .eq('group_id', groupId!);
    if (meetingId) q = q.eq('meeting_id', meetingId);

    const { data } = await q.order('created_at', { ascending: false });

    const notes = (data ?? []).map((row: any) => {
      // PostgREST returns the nested relation under the FK constraint name
      const profileRow = row['profiles!notes_created_by_fkey'] ?? row.profiles ?? null;
      return {
        ...toNote(row),
        author: profileRow
          ? {
              fullName: profileRow.full_name ?? '',
              surname: profileRow.surname ?? '',
              profilePictureUrl: profileRow.profile_picture_url ?? null,
            }
          : null,
      };
    });

    return c.json({ notes });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// VOTES
// ============================================================

app.post('/make-server-34d0b231/votes', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { groupId, question, meetingId } = await c.req.json();
    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.role !== 'admin')
      return c.json({ error: 'Not authorized – admin only' }, 403);

    const { data: vote, error } = await supabaseAdmin
      .from('votes')
      .insert({ group_id: groupId, meeting_id: meetingId ?? null, question, active: true, created_by: user.email })
      .select('*, vote_responses(*)')
      .single();
    if (error) return c.json({ error: error.message }, 500);

    return c.json({ success: true, vote: toVote(vote) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/make-server-34d0b231/votes', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.query('groupId');
    const meetingId = c.req.query('meetingId');

    const myMembership = await getMembership(groupId!, user.email!);
    if (!myMembership || myMembership.status !== 'approved')
      return c.json({ error: 'Not a member of this group' }, 403);

    let q = supabaseAdmin
      .from('votes')
      .select('*, vote_responses(*)')
      .eq('group_id', groupId!);
    if (meetingId) q = q.eq('meeting_id', meetingId);

    const { data } = await q.order('created_at', { ascending: false });
    return c.json({ votes: (data ?? []).map(toVote) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/make-server-34d0b231/votes/:id/cast', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const voteId = c.req.param('id');
    const { answer } = await c.req.json(); // 'yes' | 'no'

    const { data: vote } = await supabaseAdmin
      .from('votes').select('*').eq('id', voteId).maybeSingle();
    if (!vote) return c.json({ error: 'Vote not found' }, 404);

    const myMembership = await getMembership(vote.group_id, user.email!);
    if (!myMembership || myMembership.status !== 'approved')
      return c.json({ error: 'Not a member of this group' }, 403);

    // UPSERT allows changing vote
    await supabaseAdmin.from('vote_responses').upsert({
      vote_id: voteId,
      user_email: user.email,
      response: answer,
      created_at: new Date().toISOString(),
    }, { onConflict: 'vote_id,user_email' });

    const { data: updatedVote } = await supabaseAdmin
      .from('votes')
      .select('*, vote_responses(*)')
      .eq('id', voteId)
      .single();

    return c.json({ success: true, vote: toVote(updatedVote) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// CHAT
// ============================================================

app.post('/make-server-34d0b231/chat', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { groupId, message, meetingId } = await c.req.json();
    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.status !== 'approved')
      return c.json({ error: 'Not a member of this group' }, 403);

    const { data: msg, error } = await supabaseAdmin
      .from('chat_messages')
      .insert({ group_id: groupId, meeting_id: meetingId ?? null, user_email: user.email, message })
      .select()
      .single();
    if (error) return c.json({ error: error.message }, 500);

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('*').eq('email', user.email!).maybeSingle();

    return c.json({
      success: true,
      message: { ...toChatMessage(msg), user: toProfile(profile) },
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/make-server-34d0b231/chat', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.query('groupId');
    const meetingId = c.req.query('meetingId');

    const myMembership = await getMembership(groupId!, user.email!);
    if (!myMembership || myMembership.status !== 'approved')
      return c.json({ error: 'Not a member of this group' }, 403);

    let q = supabaseAdmin
      .from('chat_messages')
      .select('*, profiles(full_name, surname, profile_picture_url, email)')
      .eq('group_id', groupId!);
    if (meetingId) q = q.eq('meeting_id', meetingId);

    const { data } = await q.order('created_at', { ascending: true });

    const messages = (data ?? []).map((row: any) => ({
      ...toChatMessage(row),
      user: row.profiles ? toProfile(row.profiles) : null,
    }));

    return c.json({ messages });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// PUBLIC INVITE LINKS
// ============================================================

app.post('/make-server-34d0b231/groups/:id/invite-link', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('id');
    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.role !== 'admin')
      return c.json({ error: 'Not authorized – admin only' }, 403);

    const inviteToken = crypto.randomUUID();
    await supabaseAdmin
      .from('groups')
      .update({ invite_token: inviteToken, invite_token_created_at: new Date().toISOString() })
      .eq('id', groupId);

    return c.json({ success: true, inviteToken });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/make-server-34d0b231/invite/:token', async (c) => {
  try {
    const token = c.req.param('token');
    const { data: group } = await supabaseAdmin
      .from('groups')
      .select('id, name, description, is_public')
      .eq('invite_token', token)
      .maybeSingle();

    if (!group) return c.json({ error: 'Invalid or expired invite link' }, 404);

    return c.json({
      group: { id: group.id, name: group.name, description: group.description, isPublic: group.is_public },
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/make-server-34d0b231/invite/:token/join', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized – please sign in first' }, 401);

    const token = c.req.param('token');
    const { data: group } = await supabaseAdmin
      .from('groups')
      .select('*')
      .eq('invite_token', token)
      .maybeSingle();
    if (!group) return c.json({ error: 'Invalid or expired invite link' }, 404);

    const existing = await getMembership(group.id, user.email!);
    if (existing) {
      if (existing.status === 'approved')
        return c.json({ error: 'Already a member', alreadyMember: true }, 400);
      return c.json({ error: 'Already requested to join' }, 400);
    }

    await supabaseAdmin.from('profiles').upsert({
      email: user.email!,
      full_name: user.user_metadata?.fullName ?? '',
      surname: user.user_metadata?.surname ?? '',
    }, { onConflict: 'email' });

    const { data: membership } = await supabaseAdmin
      .from('group_memberships')
      .insert({
        group_id: group.id,
        user_email: user.email,
        role: 'member',
        status: 'approved',
        joined_at: new Date().toISOString(),
        joined_via: 'invite-link',
      })
      .select()
      .single();

    return c.json({ success: true, membership: toMembership(membership), group: toGroup(group) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// INVITATIONS (admin → specific user)
// ============================================================

app.get('/make-server-34d0b231/users/search', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const q = c.req.query('q') ?? '';
    const { data: users } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .neq('email', user.email!)
      .or(`full_name.ilike.%${q}%,surname.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(20);

    return c.json({ users: (users ?? []).map(toProfile) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/make-server-34d0b231/invites', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { groupId, invitedEmail } = await c.req.json();
    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.role !== 'admin')
      return c.json({ error: 'Not authorized – admin only' }, 403);

    const { data: invitedProfile } = await supabaseAdmin
      .from('profiles').select('email').eq('email', invitedEmail).maybeSingle();
    if (!invitedProfile) return c.json({ error: 'User not found' }, 404);

    const existingMember = await getMembership(groupId, invitedEmail);
    if (existingMember) return c.json({ error: 'User is already a member or has pending request' }, 400);

    const { data: existing } = await supabaseAdmin
      .from('invitations')
      .select('status').eq('group_id', groupId).eq('invited_email', invitedEmail).maybeSingle();
    if (existing?.status === 'pending') return c.json({ error: 'User already has a pending invite' }, 400);

    const { data: invite, error } = await supabaseAdmin
      .from('invitations')
      .upsert({
        group_id: groupId,
        invited_email: invitedEmail,
        invited_by: user.email,
        status: 'pending',
        created_at: new Date().toISOString(),
        accepted_at: null,
        declined_at: null,
      }, { onConflict: 'group_id,invited_email' })
      .select()
      .single();
    if (error) return c.json({ error: error.message }, 500);

    return c.json({ success: true, invite });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/make-server-34d0b231/invites', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { data } = await supabaseAdmin
      .from('invitations')
      .select('*, groups(id, name, description), profiles!invitations_invited_by_fkey(full_name, surname, email)')
      .eq('invited_email', user.email!)
      .eq('status', 'pending');

    const invites = (data ?? []).map((inv: any) => ({
      id: inv.id,
      groupId: inv.group_id,
      // backward-compat fields expected by the frontend Invite type
      groupName: inv.groups?.name ?? '',
      invitedAt: inv.created_at,
      invitedBy: inv.invited_by,
      invitedEmail: inv.invited_email,
      status: inv.status,
      createdAt: inv.created_at,
      group: inv.groups
        ? { name: inv.groups.name, description: inv.groups.description ?? '' }
        : null,
      inviter: inv.profiles
        ? { fullName: inv.profiles.full_name ?? '', surname: inv.profiles.surname ?? '' }
        : null,
    }));

    return c.json({ invites });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/make-server-34d0b231/invites/:groupId/accept', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const { data: invite } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('group_id', groupId)
      .eq('invited_email', user.email!)
      .maybeSingle();
    if (!invite) return c.json({ error: 'Invite not found' }, 404);
    if (invite.status !== 'pending') return c.json({ error: 'Invite already processed' }, 400);

    await supabaseAdmin.from('profiles').upsert({
      email: user.email!,
      full_name: user.user_metadata?.fullName ?? '',
      surname: user.user_metadata?.surname ?? '',
    }, { onConflict: 'email' });

    const { data: membership } = await supabaseAdmin
      .from('group_memberships')
      .insert({
        group_id: groupId,
        user_email: user.email,
        role: 'member',
        status: 'approved',
        joined_at: new Date().toISOString(),
        invited_by: invite.invited_by,
      })
      .select()
      .single();

    await supabaseAdmin
      .from('invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('group_id', groupId)
      .eq('invited_email', user.email!);

    return c.json({ success: true, membership: toMembership(membership) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/make-server-34d0b231/invites/:groupId/decline', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const { data: invite } = await supabaseAdmin
      .from('invitations')
      .select('status')
      .eq('group_id', groupId)
      .eq('invited_email', user.email!)
      .maybeSingle();
    if (!invite) return c.json({ error: 'Invite not found' }, 404);
    if (invite.status !== 'pending') return c.json({ error: 'Invite already processed' }, 400);

    await supabaseAdmin
      .from('invitations')
      .update({ status: 'declined', declined_at: new Date().toISOString() })
      .eq('group_id', groupId)
      .eq('invited_email', user.email!);

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// CONSTITUTION
// ============================================================

const CONSTITUTION_BUCKET = 'make-34d0b231-constitutions';

async function ensureConstitutionBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.some(b => b.name === CONSTITUTION_BUCKET)) {
    await supabaseAdmin.storage.createBucket(CONSTITUTION_BUCKET, {
      public: false,
      fileSizeLimit: 10485760,
    });
  }
}

app.post('/make-server-34d0b231/groups/:groupId/constitution', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.role !== 'admin')
      return c.json({ error: 'Only admins can upload the constitution' }, 403);

    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    if (!file) return c.json({ error: 'No file provided' }, 400);

    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowed.includes(file.type))
      return c.json({ error: 'Only PDF and Word documents are allowed' }, 400);
    if (file.size > 10 * 1024 * 1024)
      return c.json({ error: 'File must be less than 10MB' }, 400);

    await ensureConstitutionBucket();

    // Delete old file from storage if one exists
    const { data: old } = await supabaseAdmin
      .from('constitutions').select('file_path').eq('group_id', groupId).maybeSingle();
    if (old?.file_path) {
      await supabaseAdmin.storage.from(CONSTITUTION_BUCKET).remove([old.file_path]).catch(() => {});
    }

    const ext = file.name.split('.').pop();
    const filePath = `constitutions/${groupId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(CONSTITUTION_BUCKET)
      .upload(filePath, await file.arrayBuffer(), { contentType: file.type, upsert: true });
    if (uploadError) return c.json({ error: uploadError.message }, 500);

    const constitutionData = {
      group_id: groupId,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
      uploaded_by: user.email,
      uploaded_at: new Date().toISOString(),
    };

    await supabaseAdmin.from('constitutions').upsert(constitutionData, { onConflict: 'group_id' });

    return c.json({
      success: true,
      constitution: {
        groupId,
        fileName: file.name,
        filePath,
        fileType: file.type,
        fileSize: file.size,
        uploadedBy: user.email,
        uploadedAt: constitutionData.uploaded_at,
      },
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/make-server-34d0b231/groups/:groupId/constitution', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership) return c.json({ error: 'Not a member of this group' }, 403);

    const { data } = await supabaseAdmin
      .from('constitutions').select('*').eq('group_id', groupId).maybeSingle();
    if (!data) return c.json({ constitution: null });

    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from(CONSTITUTION_BUCKET)
      .createSignedUrl(data.file_path, 3600);
    if (urlError) return c.json({ error: urlError.message }, 500);

    return c.json({
      constitution: {
        groupId: data.group_id,
        fileName: data.file_name,
        filePath: data.file_path,
        fileType: data.file_type,
        fileSize: data.file_size,
        uploadedBy: data.uploaded_by,
        uploadedAt: data.uploaded_at,
        downloadUrl: urlData.signedUrl,
      },
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/make-server-34d0b231/groups/:groupId/constitution', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const myMembership = await getMembership(groupId, user.email!);
    if (!myMembership || myMembership.role !== 'admin')
      return c.json({ error: 'Only admins can delete the constitution' }, 403);

    const { data } = await supabaseAdmin
      .from('constitutions').select('file_path').eq('group_id', groupId).maybeSingle();
    if (!data) return c.json({ error: 'No constitution found' }, 404);

    await supabaseAdmin.storage.from(CONSTITUTION_BUCKET).remove([data.file_path]);
    await supabaseAdmin.from('constitutions').delete().eq('group_id', groupId);

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// ADMIN: CLEAR ALL DATA  (dev / testing only)
// ============================================================

app.delete('/make-server-34d0b231/admin/clear-all-data', async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const userEmail = user.email!;

    // Groups created by this user get fully deleted (CASCADE removes everything)
    const { data: ownedGroups } = await supabaseAdmin
      .from('groups')
      .select('id, constitutions(file_path)')
      .eq('created_by', userEmail);

    for (const g of ownedGroups ?? []) {
      const filePath = (g as any).constitutions?.file_path;
      if (filePath) {
        await supabaseAdmin.storage
          .from(CONSTITUTION_BUCKET)
          .remove([filePath])
          .catch(() => {});
      }
      await supabaseAdmin.from('groups').delete().eq('id', g.id);
    }

    // For groups the user is a member of (not owner), just remove membership
    await supabaseAdmin
      .from('group_memberships')
      .delete()
      .eq('user_email', userEmail);

    // Remove pending invites sent to this user
    await supabaseAdmin
      .from('invitations')
      .delete()
      .eq('invited_email', userEmail);

    return c.json({ success: true, message: 'All data cleared successfully' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ============================================================
// Health check — no auth, used by uptime monitors
// ============================================================
app.get('/make-server-34d0b231/health', (c: any) => {
  c.header('Cache-Control', 'no-cache');
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Cache helper — add to GET responses that don't change often
// Usage inside route handler: cacheFor(c, 60) for 60 seconds
function cacheFor(c: any, seconds: number) {
  c.header('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=${seconds * 2}`);
}

// ============================================================
// Register extra routes (announcements, notifications, proofs,
// billing, subscriptions, referrals, sessions, RSVP, etc.)
// ============================================================
registerExtraRoutes(app, supabaseAdmin, getAuthUser, getMembership);
registerMoreRoutes(app, supabaseAdmin, getAuthUser, getMembership);

Deno.serve(app.fetch);
