import { Hono } from "npm:hono@4.6.14";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
);

// Helper to generate unique IDs
const generateId = () => crypto.randomUUID();

// Helper to generate group codes
const generateGroupCode = () => Math.random().toString(36).substring(2, 10).toUpperCase();

// Helper to check if group name is unique
const isGroupNameUnique = async (name: string, excludeGroupId?: string) => {
  const allGroups = await kv.getByPrefix('group:');
  return !allGroups.some(g => 
    g.name.toLowerCase() === name.toLowerCase() && 
    g.id !== excludeGroupId
  );
};

// === USER AUTHENTICATION ===

app.post('/make-server-34d0b231/signup', async (c) => {
  try {
    const { email, password, fullName, surname, country, phone } = await c.req.json();

    // Create user in Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { fullName, surname, country, phone: phone || null },
      email_confirm: true // Auto-confirm since email server isn't configured
    });

    if (error) {
      console.log(`Signup error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Store user profile in KV store
    await kv.set(`user:${email}`, {
      email,
      fullName,
      surname,
      country,
      phone: phone || null,
      createdAt: new Date().toISOString()
    });

    // Persist to profiles table
    await supabaseAdmin.from('profiles').upsert({
      email,
      full_name: fullName,
      surname,
      country,
      phone: phone || null,
    }, { onConflict: 'email' });

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.log(`Signup exception: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-34d0b231/signin', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log(`Signin error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ 
      success: true, 
      accessToken: data.session.access_token,
      user: data.user
    });
  } catch (error) {
    console.log(`Signin exception: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-34d0b231/session', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken || accessToken === 'null') {
      return c.json({ session: null });
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ session: null });
    }

    return c.json({ 
      session: { 
        user,
        access_token: accessToken
      }
    });
  } catch (error) {
    console.log(`Session check exception: ${error.message}`);
    return c.json({ session: null });
  }
});

app.post('/make-server-34d0b231/signout', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (accessToken) {
      await supabaseAdmin.auth.admin.signOut(accessToken);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log(`Signout exception: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-34d0b231/auth/request-reset', async (c) => {
  try {
    const { email } = await c.req.json();
    
    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    // Check if user exists
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      // Don't reveal if user exists or not for security
      return c.json({ 
        success: true, 
        message: 'If an account exists with this email, a reset code has been generated.',
        resetCode: null
      });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store reset code with 15-minute expiration
    const resetData = {
      email,
      code: resetCode,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`password_reset:${email}`, resetData);

    // Send reset code via email (Resend)
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: Deno.env.get('EMAIL_FROM') || 'Stokpile <onboarding@resend.dev>',
          to: [email],
          subject: 'Your Stokpile password reset code',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
              <h2 style="color:#1e293b;margin-bottom:8px;">Reset your password</h2>
              <p style="color:#475569;">Enter this code in the app to reset your password:</p>
              <div style="background:#f1f5f9;border-radius:10px;padding:28px;text-align:center;margin:24px 0;">
                <span style="font-size:40px;font-weight:700;letter-spacing:10px;color:#3b82f6;">${resetCode}</span>
              </div>
              <p style="color:#94a3b8;font-size:13px;">This code expires in 15 minutes. If you did not request a password reset, you can safely ignore this email.</p>
            </div>
          `,
        }),
      });
    }

    return c.json({
      success: true,
      message: 'If that email is registered, a reset code has been sent.',
      expiresIn: '15 minutes'
    });
  } catch (error) {
    console.log(`Request reset error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-34d0b231/auth/reset-password', async (c) => {
  try {
    const { email, resetCode, newPassword } = await c.req.json();
    
    if (!email || !resetCode || !newPassword) {
      return c.json({ error: 'Email, reset code, and new password are required' }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400);
    }

    // Get reset data
    const resetData = await kv.get(`password_reset:${email}`);
    
    if (!resetData) {
      return c.json({ error: 'Invalid or expired reset code' }, 400);
    }

    // Check if expired
    if (new Date(resetData.expiresAt) < new Date()) {
      await kv.del(`password_reset:${email}`);
      return c.json({ error: 'Reset code has expired. Please request a new one.' }, 400);
    }

    // Verify code
    if (resetData.code !== resetCode) {
      return c.json({ error: 'Invalid reset code' }, 400);
    }

    // Update password using admin API
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (error) {
      console.log(`Password update error: ${error.message}`);
      return c.json({ error: 'Failed to update password' }, 500);
    }

    // Delete reset code after successful reset
    await kv.del(`password_reset:${email}`);

    return c.json({ 
      success: true,
      message: 'Password successfully reset. You can now sign in with your new password.'
    });
  } catch (error) {
    console.log(`Reset password error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === USER PROFILE ===

app.get('/make-server-34d0b231/profile', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Read from profiles table (source of truth for phone)
    const { data: profileRow } = await supabaseAdmin
      .from('profiles')
      .select('phone, full_name, surname, country, profile_picture_url')
      .eq('email', user.email)
      .maybeSingle();

    return c.json({
      email: user.email,
      fullName: profileRow?.full_name || user.user_metadata?.fullName || '',
      surname: profileRow?.surname || user.user_metadata?.surname || '',
      profilePictureUrl: profileRow?.profile_picture_url || user.user_metadata?.profilePictureUrl || null,
      phone: profileRow?.phone || user.user_metadata?.phone || null,
    });
  } catch (error) {
    console.log(`Get profile error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-34d0b231/profile', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { fullName, surname, profilePictureUrl, phone } = await c.req.json();

    // Update user metadata
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          fullName,
          surname,
          profilePictureUrl,
          phone: phone || null,
        }
      }
    );

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Sync full profile to KV store so group lookups (WhatsApp, member lists) stay current
    const existingKv = await kv.get(`user:${user.email}`) || {};
    const resolvedPhone = phone !== undefined ? (phone || null) : existingKv.phone || null;
    await kv.set(`user:${user.email}`, {
      ...existingKv,
      email: user.email,
      fullName,
      surname,
      profilePictureUrl: profilePictureUrl || null,
      phone: resolvedPhone,
    });

    // Persist to profiles table (source of truth)
    await supabaseAdmin.from('profiles').upsert({
      email: user.email,
      full_name: fullName,
      surname,
      profile_picture_url: profilePictureUrl || null,
      phone: resolvedPhone,
    }, { onConflict: 'email' });

    return c.json({ success: true, user: updatedUser });
  } catch (error) {
    console.log(`Update profile error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-34d0b231/profile/picture', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return c.json({ error: 'File must be an image' }, 400);
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: 'File size must be less than 5MB' }, 400);
    }

    // Initialize bucket if needed
    const PROFILE_BUCKET = 'make-34d0b231-profile-pictures';
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === PROFILE_BUCKET);
    
    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket(PROFILE_BUCKET, {
        public: true,
        fileSizeLimit: 5242880 // 5MB
      });
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `profile-pictures/${fileName}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(PROFILE_BUCKET)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(PROFILE_BUCKET)
      .getPublicUrl(filePath);

    return c.json({ url: urlData.publicUrl });
  } catch (error) {
    console.log(`Upload profile picture error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === GROUP MANAGEMENT ===

app.post('/make-server-34d0b231/groups', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { name, description, contributionFrequency, isPublic, groupType, contributionTarget } = await c.req.json();

    // Check if group name is unique
    const nameIsUnique = await isGroupNameUnique(name);
    if (!nameIsUnique) {
      return c.json({ error: 'A group with this name already exists. Please choose a different name.' }, 400);
    }

    const groupId = generateId();
    const groupCode = generateGroupCode();

    const group = {
      id: groupId,
      name,
      description: description || '',
      contributionFrequency: contributionFrequency || 'monthly',
      isPublic: isPublic || false,
      groupType: groupType || 'rotating',
      groupCode,
      payoutsAllowed: true,
      contributionTarget: contributionTarget || null,
      admin1: user.email,
      admin2: null,
      admin3: null,
      createdBy: user.email,
      createdAt: new Date().toISOString()
    };

    await kv.set(`group:${groupId}`, group);

    // Auto-approve creator as member
    const membership = {
      groupId,
      userEmail: user.email,
      status: 'approved',
      role: 'admin',
      joinedAt: new Date().toISOString()
    };
    await kv.set(`membership:${groupId}:${user.email}`, membership);

    // Set as selected group
    await kv.set(`selectedGroup:${user.email}`, groupId);

    return c.json({ success: true, group });
  } catch (error) {
    console.log(`Create group error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-34d0b231/groups', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get all memberships for this user
    const allMemberships = await kv.getByPrefix('membership:');
    const userMemberships = allMemberships.filter(m => 
      m.userEmail === user.email && m.status === 'approved'
    );

    // Get group details for each membership
    const groups = [];
    for (const membership of userMemberships) {
      const group = await kv.get(`group:${membership.groupId}`);
      if (group) {
        if (group.archived) continue; // Skip archived groups (they can be viewed via /groups/archived)
        groups.push({
          ...group,
          userRole: membership.role
        });
      }
    }

    return c.json({ groups });
  } catch (error) {
    console.log(`Get groups error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Get all members for a group
app.get('/make-server-34d0b231/groups/:groupId/members', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('groupId');

    // Verify user is a member of this group
    const allMemberships = await kv.getByPrefix('membership:');
    const membership = allMemberships.find(m => 
      m.groupId === groupId && m.userEmail === user.email && m.status === 'approved'
    );
    
    if (!membership) {
      return c.json({ error: 'Not a member of this group' }, 403);
    }

    // Get all approved members for this group
    const groupMemberships = allMemberships.filter(
      m => m.groupId === groupId && m.status === 'approved'
    );
    
    // Enrich members with user profiles from KV store
    const members = await Promise.all(groupMemberships.map(async (m) => {
      const userProfile = await kv.get(`user:${m.userEmail}`);
      return {
        email: m.userEmail,
        fullName: userProfile?.fullName || 'Unknown',
        surname: userProfile?.surname || 'User',
        profilePictureUrl: userProfile?.profilePictureUrl || null,
        role: m.role,
        status: m.status || 'approved',
        joinedAt: m.joinedAt
      };
    }));

    return c.json({ members });
  } catch (error) {
    console.log(`Get group members error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-34d0b231/groups/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('id');
    
    // Check membership
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') {
      return c.json({ error: 'Not a member of this group' }, 403);
    }

    const group = await kv.get(`group:${groupId}`);
    
    return c.json({ 
      group: {
        ...group,
        userRole: membership.role
      }
    });
  } catch (error) {
    console.log(`Get group error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-34d0b231/groups/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('id');
    
    // Check if user is admin
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Not authorized - admin only' }, 403);
    }

    const { isPublic, payoutsAllowed, name, description, contributionTarget } = await c.req.json();
    
    const group = await kv.get(`group:${groupId}`);
    if (!group) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // Update group settings
    if (typeof isPublic === 'boolean') {
      group.isPublic = isPublic;
    }
    if (typeof payoutsAllowed === 'boolean') {
      group.payoutsAllowed = payoutsAllowed;
    }
    if (name && name.trim()) {
      // Check if new name is unique
      const nameIsUnique = await isGroupNameUnique(name, groupId);
      if (!nameIsUnique) {
        return c.json({ error: 'A group with this name already exists. Please choose a different name.' }, 400);
      }
      group.name = name.trim();
    }
    if (description !== undefined && description !== null) {
      group.description = description.trim();
    }
    if (contributionTarget !== undefined) group.contributionTarget = contributionTarget || null;

    group.updatedAt = new Date().toISOString();
    group.updatedBy = user.email;

    await kv.set(`group:${groupId}`, group);

    return c.json({ 
      success: true, 
      group: {
        ...group,
        userRole: membership.role
      }
    });
  } catch (error) {
    console.log(`Update group error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Update group contribution frequency
app.put('/make-server-34d0b231/groups/:id/frequency', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('id');
    
    // Check if user is admin
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Not authorized - admin only' }, 403);
    }

    const { frequency } = await c.req.json();
    
    if (!frequency) {
      return c.json({ error: 'Frequency is required' }, 400);
    }

    const group = await kv.get(`group:${groupId}`);
    if (!group) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // Update contribution frequency
    group.contributionFrequency = frequency;
    group.updatedAt = new Date().toISOString();
    group.updatedBy = user.email;

    await kv.set(`group:${groupId}`, group);

    return c.json({ 
      success: true, 
      group: {
        ...group,
        userRole: membership.role
      }
    });
  } catch (error) {
    console.log(`Update contribution frequency error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Delete group and all associated data (admin only)
app.delete('/make-server-34d0b231/groups/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('id');
    
    // Check if user is admin
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Not authorized - admin only' }, 403);
    }

    const group = await kv.get(`group:${groupId}`);
    if (!group) {
      return c.json({ error: 'Group not found' }, 404);
    }

    let deletedCount = {
      contributions: 0,
      payouts: 0,
      meetings: 0,
      votes: 0,
      notes: 0,
      chats: 0,
      attendance: 0,
      joinRequests: 0,
      invites: 0,
      memberships: 0,
      constitutions: 0
    };

    // Delete all contributions
    const contributions = await kv.getByPrefix(`contribution:${groupId}:`);
    for (const contrib of contributions) {
      await kv.del(`contribution:${groupId}:${contrib.id}`);
      deletedCount.contributions++;
    }
    
    // Delete all payouts
    const payouts = await kv.getByPrefix(`payout:${groupId}:`);
    for (const payout of payouts) {
      await kv.del(`payout:${groupId}:${payout.id}`);
      deletedCount.payouts++;
    }
    
    // Delete all meetings and their associated data
    const meetings = await kv.getByPrefix(`meeting:${groupId}:`);
    for (const meeting of meetings) {
      const meetingId = meeting.id;
      
      // Delete votes for this meeting
      const votes = await kv.getByPrefix(`vote:${groupId}:${meetingId}:`);
      for (const vote of votes) {
        await kv.del(`vote:${groupId}:${meetingId}:${vote.id}`);
        deletedCount.votes++;
      }
      
      // Delete notes for this meeting
      const notes = await kv.getByPrefix(`note:${groupId}:${meetingId}:`);
      for (const note of notes) {
        await kv.del(`note:${groupId}:${meetingId}:${note.id}`);
        deletedCount.notes++;
      }
      
      // Delete chat messages for this meeting
      const chats = await kv.getByPrefix(`chat:${groupId}:${meetingId}:`);
      for (const chat of chats) {
        await kv.del(`chat:${groupId}:${meetingId}:${chat.id}`);
        deletedCount.chats++;
      }
      
      // Delete attendance records
      const attendance = await kv.getByPrefix(`attendance:${groupId}:${meetingId}:`);
      for (const att of attendance) {
        await kv.del(`attendance:${groupId}:${meetingId}:${att.userEmail}`);
        deletedCount.attendance++;
      }
      
      // Delete meeting
      await kv.del(`meeting:${groupId}:${meetingId}`);
      deletedCount.meetings++;
    }
    
    // Delete all join requests
    const joinRequests = await kv.getByPrefix(`joinrequest:${groupId}:`);
    for (const request of joinRequests) {
      await kv.del(`joinrequest:${groupId}:${request.email}`);
      deletedCount.joinRequests++;
    }
    
    // Delete all invites
    const invites = await kv.getByPrefix(`invite:${groupId}:`);
    for (const invite of invites) {
      await kv.del(`invite:${groupId}:${invite.token}`);
      deletedCount.invites++;
    }
    
    // Delete constitution if exists
    const constitution = await kv.get(`constitution:${groupId}`);
    if (constitution) {
      try {
        const CONSTITUTION_BUCKET = 'make-34d0b231-constitutions';
        await supabaseAdmin.storage
          .from(CONSTITUTION_BUCKET)
          .remove([constitution.filePath]);
      } catch (storageError) {
        console.log(`Storage deletion error (continuing): ${storageError.message}`);
      }
      await kv.del(`constitution:${groupId}`);
      deletedCount.constitutions++;
    }
    
    // Delete all memberships for this group
    const memberships = await kv.getByPrefix(`membership:${groupId}:`);
    for (const mem of memberships) {
      await kv.del(`membership:${groupId}:${mem.userEmail}`);
      deletedCount.memberships++;
    }
    
    // Delete the group itself
    await kv.del(`group:${groupId}`);
    
    // Clear user's selected group if it was the deleted group
    const userSelectedGroup = await kv.get(`user:${user.email}:selectedGroup`);
    if (userSelectedGroup === groupId) {
      await kv.del(`user:${user.email}:selectedGroup`);
    }

    return c.json({ 
      success: true,
      message: 'Group and all associated data deleted successfully',
      deletedCount 
    });
  } catch (error) {
    console.log(`Delete group error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === JOIN REQUESTS ===

// === PUBLIC GROUP SEARCH ===

app.get('/make-server-34d0b231/groups/search/public', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const query = c.req.query('q')?.toLowerCase() || '';
    
    // Get all public groups
    const allGroups = await kv.getByPrefix('group:');
    const publicGroups = allGroups.filter(g => 
      g.isPublic && 
      g.name.toLowerCase().includes(query)
    );

    // Check user's membership status for each group
    const groupsWithStatus = [];
    for (const group of publicGroups) {
      const membership = await kv.get(`membership:${group.id}:${user.email}`);
      const allMembers = await kv.getByPrefix(`membership:${group.id}:`);
      groupsWithStatus.push({
        id: group.id,
        name: group.name,
        description: group.description,
        memberCount: allMembers.filter(m => m.status === 'approved').length,
        userStatus: membership ? membership.status : null
      });
    }

    return c.json({ groups: groupsWithStatus });
  } catch (error) {
    console.log(`Search public groups error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-34d0b231/groups/join', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { groupName, groupCode } = await c.req.json();

    if (!groupName || !groupName.trim()) {
      return c.json({ error: 'Group name is required' }, 400);
    }

    // Search for group by name
    const allGroups = await kv.getByPrefix('group:');
    const group = allGroups.find(g => g.name.toLowerCase() === groupName.trim().toLowerCase());
    
    if (!group) {
      return c.json({ error: 'Group not found with that name' }, 404);
    }

    const groupId = group.id;

    // Verify group code if provided
    if (groupCode && group.groupCode !== groupCode) {
      return c.json({ error: 'Invalid group code' }, 400);
    }

    // For private groups, code is required
    if (!group.isPublic && !groupCode) {
      return c.json({ error: 'Group code required for private groups' }, 400);
    }

    // Check if already a member
    const existingMembership = await kv.get(`membership:${groupId}:${user.email}`);
    if (existingMembership) {
      return c.json({ error: 'Already requested or a member' }, 400);
    }

    // Create pending membership
    const membership = {
      groupId,
      userEmail: user.email,
      status: 'pending',
      role: 'member',
      requestedAt: new Date().toISOString()
    };

    await kv.set(`membership:${groupId}:${user.email}`, membership);

    return c.json({ success: true, membership });
  } catch (error) {
    console.log(`Join group error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Join group by ID (for public group search)
app.post('/make-server-34d0b231/groups/:groupId/join', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('groupId');

    // Get group
    const group = await kv.get(`group:${groupId}`);
    if (!group) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // Check if already a member
    const existingMembership = await kv.get(`membership:${groupId}:${user.email}`);
    if (existingMembership) {
      return c.json({ error: 'Already requested or a member' }, 400);
    }

    // Create pending membership
    const joinMembership = {
      groupId,
      userEmail: user.email,
      status: 'pending',
      role: 'member',
      requestedAt: new Date().toISOString()
    };

    await kv.set(`membership:${groupId}:${user.email}`, joinMembership);

    return c.json({ success: true, membership: joinMembership });
  } catch (error) {
    console.log(`Join group error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-34d0b231/groups/:id/requests', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('id');
    
    // Check if user is admin
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Not authorized' }, 403);
    }

    // Get all pending requests for this group
    const allMemberships = await kv.getByPrefix(`membership:${groupId}:`);
    const pendingRequests = allMemberships.filter(m => m.status === 'pending');

    // Get user profiles
    const requests = [];
    for (const request of pendingRequests) {
      const profile = await kv.get(`user:${request.userEmail}`);
      requests.push({
        ...request,
        user: profile
      });
    }

    return c.json({ requests });
  } catch (error) {
    console.log(`Get requests error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-34d0b231/groups/:id/requests/:email/approve', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('id');
    const memberEmail = c.req.param('email');
    
    // Check if user is admin
    const adminMembership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!adminMembership || adminMembership.role !== 'admin') {
      return c.json({ error: 'Not authorized' }, 403);
    }

    // Update membership status
    const membership = await kv.get(`membership:${groupId}:${memberEmail}`);
    if (!membership) {
      return c.json({ error: 'Request not found' }, 404);
    }

    membership.status = 'approved';
    membership.approvedAt = new Date().toISOString();
    membership.approvedBy = user.email;

    await kv.set(`membership:${groupId}:${memberEmail}`, membership);

    // Email the new member
    const joinedGroup = await kv.get(`group:${groupId}`);
    const joinedGroupName = joinedGroup?.name || 'the group';
    sendEmail(
      memberEmail,
      `You've been approved – ${joinedGroupName}`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#1e293b;margin-bottom:8px;">Welcome to ${joinedGroupName}! 🎉</h2>
        <p style="color:#475569;">Your request to join <strong>${joinedGroupName}</strong> has been approved. You can now log in to Stokpile and start participating.</p>
        <p style="color:#94a3b8;font-size:13px;margin-top:24px;">Log in to view your group dashboard, contributions, and upcoming payouts.</p>
      </div>`
    ).catch(console.warn);
    storeNotification(memberEmail, groupId, 'Join request approved', `You are now a member of ${joinedGroupName}`, 'success').catch(console.warn);

    // Audit log
    logAudit(groupId, user.email, 'member_approved', { memberEmail }).catch(console.warn);

    return c.json({ success: true, membership });
  } catch (error) {
    console.log(`Approve request error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-34d0b231/groups/:id/requests/:email/deny', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('id');
    const memberEmail = c.req.param('email');
    
    // Check if user is admin
    const adminMembership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!adminMembership || adminMembership.role !== 'admin') {
      return c.json({ error: 'Not authorized' }, 403);
    }

    // Delete membership
    await kv.del(`membership:${groupId}:${memberEmail}`);

    return c.json({ success: true });
  } catch (error) {
    console.log(`Deny request error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-34d0b231/groups/:id/members/:email/promote', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('id');
    const memberEmail = c.req.param('email');
    
    // Check if requesting user is admin
    const adminMembership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!adminMembership || adminMembership.role !== 'admin') {
      return c.json({ error: 'Not authorized - admin only' }, 403);
    }

    // Get group and check admin count
    const group = await kv.get(`group:${groupId}`);
    if (!group) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // Count current admins
    const adminEmails = [group.admin1, group.admin2, group.admin3].filter(Boolean);
    if (adminEmails.length >= 3) {
      return c.json({ error: 'Maximum of 3 admins allowed. Please demote an admin first.' }, 400);
    }

    // Get member to promote
    const membership = await kv.get(`membership:${groupId}:${memberEmail}`);
    if (!membership) {
      return c.json({ error: 'Member not found' }, 404);
    }

    if (membership.role === 'admin') {
      return c.json({ error: 'User is already an admin' }, 400);
    }

    // Promote member to admin
    membership.role = 'admin';
    membership.promotedAt = new Date().toISOString();
    membership.promotedBy = user.email;
    await kv.set(`membership:${groupId}:${memberEmail}`, membership);

    // Add to group's admin list
    if (!group.admin1) {
      group.admin1 = memberEmail;
    } else if (!group.admin2) {
      group.admin2 = memberEmail;
    } else if (!group.admin3) {
      group.admin3 = memberEmail;
    }
    await kv.set(`group:${groupId}`, group);

    return c.json({ success: true, membership });
  } catch (error) {
    console.log(`Promote member error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-34d0b231/groups/:id/members/:email/demote', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('id');
    const memberEmail = c.req.param('email');
    
    // Check if requesting user is admin
    const adminMembership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!adminMembership || adminMembership.role !== 'admin') {
      return c.json({ error: 'Not authorized - admin only' }, 403);
    }

    // Get group
    const group = await kv.get(`group:${groupId}`);
    if (!group) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // Cannot demote the creator (admin1 if they're the creator)
    if (group.createdBy === memberEmail && group.admin1 === memberEmail) {
      return c.json({ error: 'Cannot demote the group creator' }, 400);
    }

    // Get member to demote
    const membership = await kv.get(`membership:${groupId}:${memberEmail}`);
    if (!membership) {
      return c.json({ error: 'Member not found' }, 404);
    }

    if (membership.role !== 'admin') {
      return c.json({ error: 'User is not an admin' }, 400);
    }

    // Demote member
    membership.role = 'member';
    membership.demotedAt = new Date().toISOString();
    membership.demotedBy = user.email;
    await kv.set(`membership:${groupId}:${memberEmail}`, membership);

    // Remove from group's admin list
    if (group.admin1 === memberEmail) {
      group.admin1 = null;
    } else if (group.admin2 === memberEmail) {
      group.admin2 = null;
    } else if (group.admin3 === memberEmail) {
      group.admin3 = null;
    }
    await kv.set(`group:${groupId}`, group);

    return c.json({ success: true, membership });
  } catch (error) {
    console.log(`Demote member error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === SELECTED GROUP ===

app.get('/make-server-34d0b231/selected-group', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const selectedGroupId = await kv.get(`selectedGroup:${user.email}`);
    
    if (!selectedGroupId) {
      return c.json({ selectedGroupId: null });
    }

    const group = await kv.get(`group:${selectedGroupId}`);
    const membership = await kv.get(`membership:${selectedGroupId}:${user.email}`);

    return c.json({ 
      selectedGroupId,
      group: group ? {
        ...group,
        userRole: membership?.role
      } : null
    });
  } catch (error) {
    console.log(`Get selected group error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-34d0b231/selected-group', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { groupId } = await c.req.json();
    
    // Verify user is a member
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') {
      return c.json({ error: 'Not a member of this group' }, 403);
    }

    await kv.set(`selectedGroup:${user.email}`, groupId);

    return c.json({ success: true, selectedGroupId: groupId });
  } catch (error) {
    console.log(`Set selected group error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === MEMBER STATISTICS ===

app.get('/make-server-34d0b231/groups/:id/members/:email/stats', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('id');
    const memberEmail = c.req.param('email');

    // Verify user is a member of the group
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') {
      return c.json({ error: 'Not a member of this group' }, 403);
    }

    // Get all contributions for this member
    const allContributions = await kv.getByPrefix(`contribution:${groupId}:`);
    const memberContributions = allContributions.filter(c => c.userEmail === memberEmail);
    
    // Get all payouts for this member
    const allPayouts = await kv.getByPrefix(`payout:${groupId}:`);
    const memberPayouts = allPayouts.filter(p => p.recipientEmail === memberEmail);

    // Calculate totals
    const totalContributions = memberContributions.reduce((sum, c) => sum + c.amount, 0);
    const totalPayouts = memberPayouts.reduce((sum, p) => sum + p.amount, 0);

    // Sort by date (most recent first)
    const recentContributions = memberContributions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const recentPayouts = memberPayouts
      .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

    return c.json({
      totalContributions,
      contributionCount: memberContributions.length,
      totalPayouts,
      payoutCount: memberPayouts.length,
      recentContributions,
      recentPayouts
    });
  } catch (error) {
    console.log(`Get member stats error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === CONTRIBUTIONS ===

app.post('/make-server-34d0b231/contributions', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { groupId, amount, date, paid, userEmail } = await c.req.json();
    
    // Verify membership of the person creating the contribution
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') {
      return c.json({ error: 'Not a member of this group' }, 403);
    }

    // Determine the target user email
    let targetUserEmail = user.email;
    
    // If userEmail is provided and different from logged-in user, verify admin privileges
    if (userEmail && userEmail !== user.email) {
      if (membership.role !== 'admin') {
        return c.json({ error: 'Only admins can add contributions on behalf of other members' }, 403);
      }
      
      // Verify the target user is a member of the group
      const targetMembership = await kv.get(`membership:${groupId}:${userEmail}`);
      if (!targetMembership || targetMembership.status !== 'approved') {
        return c.json({ error: 'Target user is not an approved member of this group' }, 400);
      }
      
      targetUserEmail = userEmail;
    }

    const contributionId = generateId();
    const contribution = {
      id: contributionId,
      groupId,
      userEmail: targetUserEmail,
      amount: parseFloat(amount),
      date: date || new Date().toISOString(),
      paid: paid || false,
      createdBy: user.email,
      createdAt: new Date().toISOString()
    };

    await kv.set(`contribution:${groupId}:${contributionId}`, contribution);

    // Fire-and-forget: WhatsApp + push notifications to admins
    const group = await kv.get(`group:${groupId}`);
    const groupName = group?.name || 'your group';
    const amountFormatted = `R ${contribution.amount.toFixed(2)}`;
    const notifMessage = `💰 *${groupName}*: New contribution of ${amountFormatted} recorded for ${targetUserEmail}.`;

    (async () => {
      const phones = await getGroupMemberPhones(groupId);
      for (const phone of phones) await sendWhatsApp(phone, notifMessage);
    })().catch(console.warn);

    sendPushToGroup(groupId, {
      title: groupName,
      body: `New contribution of ${amountFormatted} recorded`,
      url: '/',
    }).catch(console.warn);

    // Email confirmation to the contribution owner
    sendEmail(
      targetUserEmail,
      `Contribution recorded – ${groupName}`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#1e293b;margin-bottom:8px;">Contribution recorded 💰</h2>
        <p style="color:#475569;">A contribution of <strong>${amountFormatted}</strong> has been recorded for you in <strong>${groupName}</strong> on ${new Date(contribution.date).toLocaleDateString('en-ZA')}.</p>
        ${user.email !== targetUserEmail ? `<p style="color:#64748b;font-size:13px;">This contribution was added on your behalf by an admin.</p>` : ''}
        <p style="color:#94a3b8;font-size:13px;margin-top:24px;">Log in to Stokpile to view your contribution history.</p>
      </div>`
    ).catch(console.warn);
    storeNotification(targetUserEmail, groupId, 'Contribution recorded', `R ${contribution.amount.toFixed(2)} logged for ${new Date(contribution.date).toLocaleDateString('en-ZA')} in ${groupName}`, 'success').catch(console.warn);

    // Audit log
    logAudit(groupId, user.email, 'contribution_created', { contributionId, targetUserEmail, amount: contribution.amount, date: contribution.date }).catch(console.warn);

    return c.json({ success: true, contribution });
  } catch (error) {
    console.log(`Create contribution error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-34d0b231/contributions', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.query('groupId');
    
    // Verify membership
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') {
      return c.json({ error: 'Not a member of this group' }, 403);
    }

    const contributions = await kv.getByPrefix(`contribution:${groupId}:`);
    
    // Get user profiles for each contribution
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const contributionsWithUsers = contributions.map(contribution => {
      const userProfile = users.users.find(u => u.email === contribution.userEmail);
      return {
        ...contribution,
        user: userProfile ? {
          fullName: userProfile.user_metadata?.fullName,
          surname: userProfile.user_metadata?.surname,
          profilePictureUrl: userProfile.user_metadata?.profilePictureUrl
        } : null
      };
    });

    return c.json({ contributions: contributionsWithUsers });
  } catch (error) {
    console.log(`Get contributions error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-34d0b231/contributions/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const contributionId = c.req.param('id');
    const { paid } = await c.req.json();
    
    // Find contribution
    const allContributions = await kv.getByPrefix('contribution:');
    const contribution = allContributions.find(c => c.id === contributionId);
    
    if (!contribution) {
      return c.json({ error: 'Contribution not found' }, 404);
    }

    // Only owner can update
    if (contribution.userEmail !== user.email) {
      return c.json({ error: 'Not authorized' }, 403);
    }

    contribution.paid = paid;
    contribution.updatedAt = new Date().toISOString();

    await kv.set(`contribution:${contribution.groupId}:${contributionId}`, contribution);

    return c.json({ success: true, contribution });
  } catch (error) {
    console.log(`Update contribution error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Delete contribution (user's own or admin)
app.delete('/make-server-34d0b231/contributions/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const contributionId = c.req.param('id');
    
    // Find contribution
    const allContributions = await kv.getByPrefix('contribution:');
    const contribution = allContributions.find(c => c.id === contributionId);
    
    if (!contribution) {
      return c.json({ error: 'Contribution not found' }, 404);
    }

    // Check authorization - owner or admin can delete
    const membership = await kv.get(`membership:${contribution.groupId}:${user.email}`);
    const isOwner = contribution.userEmail === user.email;
    const isAdmin = membership && membership.role === 'admin';

    if (!isOwner && !isAdmin) {
      return c.json({ error: 'Not authorized to delete this contribution' }, 403);
    }

    // Delete the contribution
    await kv.del(`contribution:${contribution.groupId}:${contributionId}`);

    return c.json({ 
      success: true,
      message: 'Contribution deleted successfully' 
    });
  } catch (error) {
    console.log(`Delete contribution error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === PAYOUTS ===

app.post('/make-server-34d0b231/payouts', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { groupId, recipientEmail, amount, scheduledDate } = await c.req.json();
    
    // Check if user is admin
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Not authorized - admin only' }, 403);
    }

    // Check if payouts allowed
    const group = await kv.get(`group:${groupId}`);
    if (!group.payoutsAllowed) {
      return c.json({ error: 'Payouts not allowed for this group' }, 400);
    }

    // Validate recipient is an approved group member
    const recipientMembership = await kv.get(`membership:${groupId}:${recipientEmail}`);
    if (!recipientMembership) {
      return c.json({ error: 'Recipient is not a member of this group' }, 400);
    }
    if (recipientMembership.status !== 'approved') {
      return c.json({ error: 'Recipient must be an approved group member' }, 400);
    }
    if (recipientMembership.status === 'inactive') {
      return c.json({ error: 'Cannot create payout for inactive member' }, 400);
    }

    const payoutId = generateId();
    const payout = {
      id: payoutId,
      groupId,
      recipientEmail,
      amount: parseFloat(amount),
      scheduledDate: scheduledDate || new Date().toISOString(),
      status: 'scheduled',
      createdBy: user.email,
      createdAt: new Date().toISOString()
    };

    await kv.set(`payout:${groupId}:${payoutId}`, payout);

    // Fire-and-forget: WhatsApp + push notifications
    const payoutGroup = await kv.get(`group:${groupId}`);
    const payoutGroupName = payoutGroup?.name || 'your group';
    const payoutAmount = `R ${payout.amount.toFixed(2)}`;
    const payoutNotif = `🎉 *${payoutGroupName}*: A payout of ${payoutAmount} has been scheduled for ${recipientEmail}.`;

    (async () => {
      const phones = await getGroupMemberPhones(groupId);
      for (const phone of phones) await sendWhatsApp(phone, payoutNotif);
      // Also WhatsApp the recipient directly
      const recipientProfile = await kv.get(`user:${recipientEmail}`);
      if (recipientProfile?.phone) {
        await sendWhatsApp(recipientProfile.phone, `🎉 *${payoutGroupName}*: You are scheduled to receive a payout of ${payoutAmount}! Your admin will process this soon.`);
      }
    })().catch(console.warn);

    sendPushToGroup(groupId, {
      title: payoutGroupName,
      body: `Payout of ${payoutAmount} scheduled for ${recipientEmail}`,
      url: '/',
    }).catch(console.warn);

    // Email notification to recipient
    sendEmail(
      recipientEmail,
      `Payout scheduled – ${payoutGroupName}`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#1e293b;margin-bottom:8px;">You have a payout scheduled! 🎉</h2>
        <p style="color:#475569;">A payout of <strong>${payoutAmount}</strong> has been scheduled for you from <strong>${payoutGroupName}</strong> on ${new Date(payout.scheduledDate).toLocaleDateString('en-ZA')}.</p>
        <p style="color:#475569;">Your group admin will process this payment soon. Log in to Stokpile to track the status.</p>
        <p style="color:#94a3b8;font-size:13px;margin-top:24px;">If you have questions, contact your group admin.</p>
      </div>`
    ).catch(console.warn);
    storeNotification(recipientEmail, groupId, 'Payout scheduled', `R ${payout.amount.toFixed(2)} is scheduled for you in ${payoutGroupName}`, 'success').catch(console.warn);

    // Audit log
    logAudit(groupId, user.email, 'payout_scheduled', { payoutId, recipientEmail, amount: payout.amount, scheduledDate: payout.scheduledDate }).catch(console.warn);

    return c.json({ success: true, payout });
  } catch (error) {
    console.log(`Create payout error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-34d0b231/payouts', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.query('groupId');
    
    // Verify membership
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') {
      return c.json({ error: 'Not a member of this group' }, 403);
    }

    const payouts = await kv.getByPrefix(`payout:${groupId}:`);
    
    // Enrich payouts with recipient user profiles from KV store
    const payoutsWithUsers = await Promise.all(payouts.map(async (payout) => {
      const userProfile = await kv.get(`user:${payout.recipientEmail}`);
      return {
        ...payout,
        recipient: userProfile ? {
          fullName: userProfile.fullName,
          surname: userProfile.surname,
          profilePictureUrl: userProfile.profilePictureUrl,
          email: payout.recipientEmail
        } : {
          fullName: 'Unknown',
          surname: 'User',
          profilePictureUrl: null,
          email: payout.recipientEmail
        }
      };
    }));

    return c.json({ payouts: payoutsWithUsers });
  } catch (error) {
    console.log(`Get payouts error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-34d0b231/payouts/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const payoutId = c.req.param('id');
    const { status, referenceNumber } = await c.req.json();

    // Find payout
    const allPayouts = await kv.getByPrefix('payout:');
    const payout = allPayouts.find(p => p.id === payoutId);

    if (!payout) {
      return c.json({ error: 'Payout not found' }, 404);
    }

    // Check if user is admin
    const membership = await kv.get(`membership:${payout.groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Not authorized' }, 403);
    }

    payout.status = status;
    payout.updatedAt = new Date().toISOString();
    if (referenceNumber !== undefined) payout.referenceNumber = referenceNumber;
    if (status === 'completed') {
      payout.completedAt = new Date().toISOString();
      // Email recipient on completion
      const completedGroup = await kv.get(`group:${payout.groupId}`);
      const groupNameForEmail = completedGroup?.name || 'your group';
      const payoutAmountStr = `R ${payout.amount.toFixed(2)}`;
      sendEmail(
        payout.recipientEmail,
        `Payout completed – ${groupNameForEmail}`,
        `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="color:#1e293b;margin-bottom:8px;">Your payout has been paid! ✅</h2>
          <p style="color:#475569;">Your payout of <strong>${payoutAmountStr}</strong> from <strong>${groupNameForEmail}</strong> has been marked as completed.</p>
          ${referenceNumber ? `<p style="color:#475569;">Reference number: <strong>${referenceNumber}</strong></p>` : ''}
          <p style="color:#94a3b8;font-size:13px;margin-top:24px;">Log in to Stokpile to view your payout history.</p>
        </div>`
      ).catch(console.warn);
    }

    await kv.set(`payout:${payout.groupId}:${payoutId}`, payout);

    // Audit log
    logAudit(payout.groupId, user.email, `payout_${status}`, { payoutId, recipientEmail: payout.recipientEmail, referenceNumber }).catch(console.warn);

    return c.json({ success: true, payout });
  } catch (error) {
    console.log(`Update payout error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === NOTES ===

app.post('/make-server-34d0b231/notes', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { groupId, title, content, meetingId } = await c.req.json();
    
    // Verify membership
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') {
      return c.json({ error: 'Not a member of this group' }, 403);
    }

    const noteId = generateId();
    const note = {
      id: noteId,
      groupId,
      meetingId: meetingId || null,
      title,
      content,
      createdBy: user.email,
      createdAt: new Date().toISOString()
    };

    await kv.set(`note:${groupId}:${noteId}`, note);

    return c.json({ success: true, note });
  } catch (error) {
    console.log(`Create note error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-34d0b231/notes', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.query('groupId');
    const meetingId = c.req.query('meetingId');
    
    // Verify membership
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') {
      return c.json({ error: 'Not a member of this group' }, 403);
    }

    let notes = await kv.getByPrefix(`note:${groupId}:`);
    
    // Filter by meetingId if provided
    if (meetingId) {
      notes = notes.filter((note: any) => note.meetingId === meetingId);
    }
    
    // Get user profiles
    const notesWithUsers = [];
    for (const note of notes) {
      const profile = await kv.get(`user:${note.createdBy}`);
      notesWithUsers.push({
        ...note,
        author: profile
      });
    }

    return c.json({ notes: notesWithUsers });
  } catch (error) {
    console.log(`Get notes error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === VOTES ===

app.post('/make-server-34d0b231/votes', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { groupId, question, meetingId } = await c.req.json();
    
    // Check if user is admin
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Not authorized - admin only' }, 403);
    }

    const voteId = generateId();
    const vote = {
      id: voteId,
      groupId,
      meetingId: meetingId || null,
      question,
      yesVotes: [],
      noVotes: [],
      createdBy: user.email,
      createdAt: new Date().toISOString(),
      active: true
    };

    await kv.set(`vote:${groupId}:${voteId}`, vote);

    return c.json({ success: true, vote });
  } catch (error) {
    console.log(`Create vote error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-34d0b231/votes', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.query('groupId');
    const meetingId = c.req.query('meetingId');
    
    // Verify membership
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') {
      return c.json({ error: 'Not a member of this group' }, 403);
    }

    let votes = await kv.getByPrefix(`vote:${groupId}:`);
    
    // Filter by meetingId if provided
    if (meetingId) {
      votes = votes.filter((vote: any) => vote.meetingId === meetingId);
    }

    return c.json({ votes });
  } catch (error) {
    console.log(`Get votes error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-34d0b231/votes/:id/cast', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const voteId = c.req.param('id');
    const { answer } = await c.req.json(); // 'yes' or 'no'
    
    // Find vote
    const allVotes = await kv.getByPrefix('vote:');
    const vote = allVotes.find(v => v.id === voteId);
    
    if (!vote) {
      return c.json({ error: 'Vote not found' }, 404);
    }

    // Verify membership
    const membership = await kv.get(`membership:${vote.groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') {
      return c.json({ error: 'Not a member of this group' }, 403);
    }

    // Remove from both arrays first
    vote.yesVotes = vote.yesVotes.filter(email => email !== user.email);
    vote.noVotes = vote.noVotes.filter(email => email !== user.email);

    // Add to appropriate array
    if (answer === 'yes') {
      vote.yesVotes.push(user.email);
    } else if (answer === 'no') {
      vote.noVotes.push(user.email);
    }

    await kv.set(`vote:${vote.groupId}:${voteId}`, vote);

    return c.json({ success: true, vote });
  } catch (error) {
    console.log(`Cast vote error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === CHAT ===

app.post('/make-server-34d0b231/chat', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { groupId, message } = await c.req.json();
    
    // Verify membership
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') {
      return c.json({ error: 'Not a member of this group' }, 403);
    }

    const messageId = generateId();
    const chatMessage = {
      id: messageId,
      groupId,
      userEmail: user.email,
      message,
      createdAt: new Date().toISOString()
    };

    await kv.set(`chat:${groupId}:${messageId}`, chatMessage);

    const profile = await kv.get(`user:${user.email}`);

    return c.json({ 
      success: true, 
      message: {
        ...chatMessage,
        user: profile
      }
    });
  } catch (error) {
    console.log(`Create chat message error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-34d0b231/chat', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.query('groupId');
    const meetingId = c.req.query('meetingId');
    
    // Verify membership
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') {
      return c.json({ error: 'Not a member of this group' }, 403);
    }

    let messages = await kv.getByPrefix(`chat:${groupId}:`);
    
    // Filter by meetingId if provided
    if (meetingId) {
      messages = messages.filter((msg: any) => msg.meetingId === meetingId);
    }
    
    // Get user profiles and sort by date
    const messagesWithUsers = [];
    for (const msg of messages) {
      const profile = await kv.get(`user:${msg.userEmail}`);
      messagesWithUsers.push({
        ...msg,
        user: profile
      });
    }

    // Sort by creation time
    messagesWithUsers.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return c.json({ messages: messagesWithUsers });
  } catch (error) {
    console.log(`Get chat messages error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === GROUP MEMBERS ===

app.get('/make-server-34d0b231/groups/:id/members', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('id');
    
    // Verify membership
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') {
      return c.json({ error: 'Not a member of this group' }, 403);
    }

    // Get all members (approved and inactive)
    const allMemberships = await kv.getByPrefix(`membership:${groupId}:`);
    const groupMembers = allMemberships.filter(m => 
      m.status === 'approved' || m.status === 'inactive'
    );

    // Get user profiles
    const members = [];
    for (const member of groupMembers) {
      const profile = await kv.get(`user:${member.userEmail}`);
      members.push({
        ...profile,
        role: member.role,
        status: member.status || 'approved',
        joinedAt: member.joinedAt,
        deactivatedAt: member.deactivatedAt,
        deactivatedBy: member.deactivatedBy
      });
    }

    return c.json({ members });
  } catch (error) {
    console.log(`Get members error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Remove member (admin only)
app.delete('/make-server-34d0b231/groups/:id/members/:email', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('id');
    const memberEmail = c.req.param('email');
    
    // Check if user is admin
    const adminMembership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!adminMembership || adminMembership.role !== 'admin') {
      return c.json({ error: 'Not authorized' }, 403);
    }

    // Get the group
    const group = await kv.get(`group:${groupId}`);
    if (!group) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // Prevent removing the creator
    if (memberEmail === group.createdBy && group.admin1 === memberEmail) {
      return c.json({ error: 'Cannot remove group creator' }, 400);
    }

    // Get member to remove
    const membership = await kv.get(`membership:${groupId}:${memberEmail}`);
    if (!membership) {
      return c.json({ error: 'Member not found' }, 404);
    }

    // If member is admin, update group admin slots
    if (membership.role === 'admin') {
      if (group.admin1 === memberEmail) {
        group.admin1 = group.admin2;
        group.admin2 = group.admin3;
        group.admin3 = null;
      } else if (group.admin2 === memberEmail) {
        group.admin2 = group.admin3;
        group.admin3 = null;
      } else if (group.admin3 === memberEmail) {
        group.admin3 = null;
      }
      await kv.set(`group:${groupId}`, group);
    }

    // Delete the membership
    await kv.del(`membership:${groupId}:${memberEmail}`);

    return c.json({ success: true });
  } catch (error) {
    console.log(`Remove member error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Deactivate member (admin only) - marks member as inactive
app.put('/make-server-34d0b231/groups/:id/members/:email/deactivate', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('id');
    const memberEmail = c.req.param('email');
    
    // Check if user is admin
    const adminMembership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!adminMembership || adminMembership.role !== 'admin') {
      return c.json({ error: 'Not authorized' }, 403);
    }

    // Get the group
    const group = await kv.get(`group:${groupId}`);
    if (!group) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // Prevent deactivating the creator
    if (memberEmail === group.createdBy && group.admin1 === memberEmail) {
      return c.json({ error: 'Cannot deactivate group creator' }, 400);
    }

    // Get member to deactivate
    const membership = await kv.get(`membership:${groupId}:${memberEmail}`);
    if (!membership) {
      return c.json({ error: 'Member not found' }, 404);
    }

    // Update membership status
    membership.status = 'inactive';
    membership.deactivatedAt = new Date().toISOString();
    membership.deactivatedBy = user.email;
    
    await kv.set(`membership:${groupId}:${memberEmail}`, membership);

    return c.json({ success: true, membership });
  } catch (error) {
    console.log(`Deactivate member error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Reactivate member (admin only)
app.put('/make-server-34d0b231/groups/:id/members/:email/reactivate', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('id');
    const memberEmail = c.req.param('email');
    
    // Check if user is admin
    const adminMembership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!adminMembership || adminMembership.role !== 'admin') {
      return c.json({ error: 'Not authorized' }, 403);
    }

    // Get member to reactivate
    const membership = await kv.get(`membership:${groupId}:${memberEmail}`);
    if (!membership) {
      return c.json({ error: 'Member not found' }, 404);
    }

    // Update membership status
    membership.status = 'approved';
    membership.reactivatedAt = new Date().toISOString();
    membership.reactivatedBy = user.email;
    delete membership.deactivatedAt;
    delete membership.deactivatedBy;
    
    await kv.set(`membership:${groupId}:${memberEmail}`, membership);

    return c.json({ success: true, membership });
  } catch (error) {
    console.log(`Reactivate member error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === PUBLIC INVITE LINKS ===

app.post('/make-server-34d0b231/groups/:id/invite-link', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('id');
    
    // Check if user is admin
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Not authorized - admin only' }, 403);
    }

    const group = await kv.get(`group:${groupId}`);
    if (!group) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // Generate or regenerate invite token
    const inviteToken = crypto.randomUUID();
    
    group.inviteToken = inviteToken;
    group.inviteTokenCreatedAt = new Date().toISOString();
    
    await kv.set(`group:${groupId}`, group);
    
    // Store reverse lookup for token -> groupId
    await kv.set(`inviteToken:${inviteToken}`, { groupId, createdAt: new Date().toISOString() });

    return c.json({ success: true, inviteToken });
  } catch (error) {
    console.log(`Create invite link error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-34d0b231/invite/:token', async (c) => {
  try {
    const token = c.req.param('token');
    
    // Get group from token
    const tokenData = await kv.get(`inviteToken:${token}`);
    if (!tokenData) {
      return c.json({ error: 'Invalid or expired invite link' }, 404);
    }

    const group = await kv.get(`group:${tokenData.groupId}`);
    if (!group) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // Return group info (public data only)
    return c.json({ 
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        isPublic: group.isPublic
      }
    });
  } catch (error) {
    console.log(`Get invite link info error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-34d0b231/invite/:token/join', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized - please sign in first' }, 401);
    }

    const token = c.req.param('token');
    
    // Get group from token
    const tokenData = await kv.get(`inviteToken:${token}`);
    if (!tokenData) {
      return c.json({ error: 'Invalid or expired invite link' }, 404);
    }

    const groupId = tokenData.groupId;
    const group = await kv.get(`group:${groupId}`);
    if (!group) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // Check if already a member
    const existingMembership = await kv.get(`membership:${groupId}:${user.email}`);
    if (existingMembership) {
      if (existingMembership.status === 'approved') {
        return c.json({ error: 'Already a member of this group', alreadyMember: true }, 400);
      } else {
        return c.json({ error: 'Already requested to join this group' }, 400);
      }
    }

    // Auto-approve via invite link
    const membership = {
      groupId,
      userEmail: user.email,
      status: 'approved',
      role: 'member',
      joinedAt: new Date().toISOString(),
      joinedVia: 'invite-link'
    };
    await kv.set(`membership:${groupId}:${user.email}`, membership);

    return c.json({ success: true, membership, group });
  } catch (error) {
    console.log(`Join via invite link error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === INVITATIONS ===

app.get('/make-server-34d0b231/users/search', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const query = c.req.query('q')?.toLowerCase() || '';
    
    // Get all users
    const allUsers = await kv.getByPrefix('user:');
    
    // Filter users by query (search in name, surname, email)
    const filteredUsers = allUsers.filter(u => 
      u.email !== user.email && // Don't include current user
      (
        u.fullName?.toLowerCase().includes(query) ||
        u.surname?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query)
      )
    );

    // Limit to 20 results
    const limitedUsers = filteredUsers.slice(0, 20);

    return c.json({ users: limitedUsers });
  } catch (error) {
    console.log(`Search users error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-34d0b231/invites', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { groupId, invitedEmail } = await c.req.json();
    
    // Check if user is admin
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Not authorized - admin only' }, 403);
    }

    // Check if user exists
    const invitedUser = await kv.get(`user:${invitedEmail}`);
    if (!invitedUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Check if already a member
    const existingMembership = await kv.get(`membership:${groupId}:${invitedEmail}`);
    if (existingMembership) {
      return c.json({ error: 'User is already a member or has pending request' }, 400);
    }

    // Check if already invited
    const existingInvite = await kv.get(`invite:${groupId}:${invitedEmail}`);
    if (existingInvite && existingInvite.status === 'pending') {
      return c.json({ error: 'User already has a pending invite' }, 400);
    }

    const inviteId = generateId();
    const invite = {
      id: inviteId,
      groupId,
      invitedEmail,
      invitedBy: user.email,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await kv.set(`invite:${groupId}:${invitedEmail}`, invite);

    return c.json({ success: true, invite });
  } catch (error) {
    console.log(`Create invite error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-34d0b231/invites', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get all invites for this user
    const allInvites = await kv.getByPrefix('invite:');
    const userInvites = allInvites.filter(inv => 
      inv.invitedEmail === user.email && inv.status === 'pending'
    );

    // Get group and inviter details
    const invites = [];
    for (const invite of userInvites) {
      const group = await kv.get(`group:${invite.groupId}`);
      const inviter = await kv.get(`user:${invite.invitedBy}`);
      invites.push({
        ...invite,
        group,
        inviter
      });
    }

    return c.json({ invites });
  } catch (error) {
    console.log(`Get invites error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-34d0b231/invites/:groupId/accept', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('groupId');
    
    // Get invite
    const invite = await kv.get(`invite:${groupId}:${user.email}`);
    if (!invite) {
      return c.json({ error: 'Invite not found' }, 404);
    }

    if (invite.status !== 'pending') {
      return c.json({ error: 'Invite already processed' }, 400);
    }

    // Create approved membership
    const membership = {
      groupId,
      userEmail: user.email,
      status: 'approved',
      role: 'member',
      joinedAt: new Date().toISOString(),
      invitedBy: invite.invitedBy
    };
    await kv.set(`membership:${groupId}:${user.email}`, membership);

    // Update invite status
    invite.status = 'accepted';
    invite.acceptedAt = new Date().toISOString();
    await kv.set(`invite:${groupId}:${user.email}`, invite);

    return c.json({ success: true, membership });
  } catch (error) {
    console.log(`Accept invite error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-34d0b231/invites/:groupId/decline', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('groupId');
    
    // Get invite
    const invite = await kv.get(`invite:${groupId}:${user.email}`);
    if (!invite) {
      return c.json({ error: 'Invite not found' }, 404);
    }

    if (invite.status !== 'pending') {
      return c.json({ error: 'Invite already processed' }, 400);
    }

    // Update invite status
    invite.status = 'declined';
    invite.declinedAt = new Date().toISOString();
    await kv.set(`invite:${groupId}:${user.email}`, invite);

    return c.json({ success: true });
  } catch (error) {
    console.log(`Decline invite error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === MEETINGS ===

app.post('/make-server-34d0b231/meetings', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { groupId, date, time, venue, agenda } = await c.req.json();
    
    // Check if user is admin
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Not authorized - admin only' }, 403);
    }

    const meetingId = generateId();
    const meeting = {
      id: meetingId,
      groupId,
      date,
      time,
      venue,
      agenda: agenda || undefined,
      attendance: {},
      createdBy: user.email,
      createdAt: new Date().toISOString()
    };

    await kv.set(`meeting:${groupId}:${meetingId}`, meeting);

    return c.json({ success: true, meeting });
  } catch (error) {
    console.log(`Create meeting error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Get single meeting
app.get('/make-server-34d0b231/meetings/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const meetingId = c.req.param('id');
    const groupId = c.req.query('groupId');
    
    if (!groupId) {
      return c.json({ error: 'Group ID is required' }, 400);
    }

    // Check if user is a member
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') {
      return c.json({ error: 'Not authorized - must be a group member' }, 403);
    }

    const meeting = await kv.get(`meeting:${groupId}:${meetingId}`);
    if (!meeting) {
      return c.json({ error: 'Meeting not found' }, 404);
    }

    return c.json({ meeting });
  } catch (error) {
    console.log(`Get meeting error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-34d0b231/meetings', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.query('groupId');
    
    // Verify membership
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') {
      return c.json({ error: 'Not a member of this group' }, 403);
    }

    // Get all meetings for this group
    const allMeetings = await kv.getByPrefix(`meeting:${groupId}:`);
    
    // Sort by date and time
    const meetings = allMeetings.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });

    return c.json({ meetings });
  } catch (error) {
    console.log(`Get meetings error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-34d0b231/meetings/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const meetingId = c.req.param('id');
    const { groupId, date, time, venue, agenda } = await c.req.json();
    
    // Check if user is admin
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Not authorized - admin only' }, 403);
    }

    // Get existing meeting
    const meeting = await kv.get(`meeting:${groupId}:${meetingId}`);
    if (!meeting) {
      return c.json({ error: 'Meeting not found' }, 404);
    }

    // Update meeting
    meeting.date = date;
    meeting.time = time;
    meeting.venue = venue;
    meeting.agenda = agenda || undefined;
    meeting.updatedAt = new Date().toISOString();
    meeting.updatedBy = user.email;

    await kv.set(`meeting:${groupId}:${meetingId}`, meeting);

    return c.json({ success: true, meeting });
  } catch (error) {
    console.log(`Update meeting error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/make-server-34d0b231/meetings/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const meetingId = c.req.param('id');
    const groupId = c.req.query('groupId');
    
    // Check if user is admin
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Not authorized - admin only' }, 403);
    }

    // Delete meeting
    await kv.del(`meeting:${groupId}:${meetingId}`);

    return c.json({ success: true });
  } catch (error) {
    console.log(`Delete meeting error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-34d0b231/meetings/:id/attendance', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const meetingId = c.req.param('id');
    const { groupId, memberEmail, isPresent } = await c.req.json();
    
    // Verify membership
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') {
      return c.json({ error: 'Not a member of this group' }, 403);
    }

    // Get meeting
    const meeting = await kv.get(`meeting:${groupId}:${meetingId}`);
    if (!meeting) {
      return c.json({ error: 'Meeting not found' }, 404);
    }

    // Update attendance
    if (!meeting.attendance) {
      meeting.attendance = {};
    }
    meeting.attendance[memberEmail] = isPresent;

    await kv.set(`meeting:${groupId}:${meetingId}`, meeting);

    return c.json({ success: true, meeting });
  } catch (error) {
    console.log(`Update attendance error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === GROUP CONSTITUTION ===

// Upload constitution (admins only)
app.post('/make-server-34d0b231/groups/:groupId/constitution', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('groupId');
    
    // Check if user is admin
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Only admins can upload the constitution' }, 403);
    }

    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Validate file type (PDF or Word documents)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Only PDF and Word documents are allowed' }, 400);
    }

    // Validate file size (10MB max for documents)
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: 'File size must be less than 10MB' }, 400);
    }

    // Initialize bucket if needed
    const CONSTITUTION_BUCKET = 'make-34d0b231-constitutions';
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === CONSTITUTION_BUCKET);
    
    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket(CONSTITUTION_BUCKET, {
        public: false, // Private bucket
        fileSizeLimit: 10485760 // 10MB
      });
    }

    // Delete old constitution if exists
    const oldConstitution = await kv.get(`constitution:${groupId}`);
    if (oldConstitution?.filePath) {
      await supabaseAdmin.storage
        .from(CONSTITUTION_BUCKET)
        .remove([oldConstitution.filePath]);
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${groupId}-${Date.now()}.${fileExt}`;
    const filePath = `constitutions/${fileName}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(CONSTITUTION_BUCKET)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    // Store metadata
    const constitutionData = {
      groupId,
      fileName: file.name,
      filePath,
      fileType: file.type,
      fileSize: file.size,
      uploadedBy: user.email,
      uploadedAt: new Date().toISOString()
    };

    await kv.set(`constitution:${groupId}`, constitutionData);

    return c.json({ success: true, constitution: constitutionData });
  } catch (error) {
    console.log(`Upload constitution error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Get constitution (all members)
app.get('/make-server-34d0b231/groups/:groupId/constitution', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('groupId');
    
    // Check if user is a member
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership) {
      return c.json({ error: 'Not a member of this group' }, 403);
    }

    const constitution = await kv.get(`constitution:${groupId}`);
    
    if (!constitution) {
      return c.json({ constitution: null });
    }

    // Generate signed URL (valid for 1 hour)
    const CONSTITUTION_BUCKET = 'make-34d0b231-constitutions';
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from(CONSTITUTION_BUCKET)
      .createSignedUrl(constitution.filePath, 3600);

    if (urlError) {
      throw new Error(urlError.message);
    }

    return c.json({ 
      constitution: {
        ...constitution,
        downloadUrl: urlData.signedUrl
      }
    });
  } catch (error) {
    console.log(`Get constitution error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Delete constitution (admins only)
app.delete('/make-server-34d0b231/groups/:groupId/constitution', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('groupId');
    
    // Check if user is admin
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Only admins can delete the constitution' }, 403);
    }

    const constitution = await kv.get(`constitution:${groupId}`);
    
    if (!constitution) {
      return c.json({ error: 'No constitution found' }, 404);
    }

    // Delete from storage
    const CONSTITUTION_BUCKET = 'make-34d0b231-constitutions';
    await supabaseAdmin.storage
      .from(CONSTITUTION_BUCKET)
      .remove([constitution.filePath]);

    // Delete metadata
    await kv.del(`constitution:${groupId}`);

    return c.json({ success: true });
  } catch (error) {
    console.log(`Delete constitution error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === ADMIN: CLEAR ALL DATA ===
// WARNING: This endpoint clears ALL data for the authenticated user.
// Requires the ALLOW_CLEAR_DATA=true env var to be set — never set this in production.
app.delete('/make-server-34d0b231/admin/clear-all-data', async (c) => {
  // Server-side guard: reject the request unless explicitly enabled via env var.
  // The frontend also blocks this in non-DEV mode, but that check is bypassable.
  if (Deno.env.get('ALLOW_CLEAR_DATA') !== 'true') {
    return c.json({ error: 'This endpoint is disabled. Set ALLOW_CLEAR_DATA=true in your local .env to use it.' }, 403);
  }

  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userEmail = user.email;
    
    // Get all groups where user is a member
    const allMemberships = await kv.getByPrefix(`membership:`);
    const userMemberships = allMemberships.filter(m => m.userEmail === userEmail);
    
    let deletedCount = {
      groups: 0,
      memberships: 0,
      contributions: 0,
      payouts: 0,
      meetings: 0,
      votes: 0,
      notes: 0,
      chats: 0,
      joinRequests: 0,
      invites: 0,
      constitutions: 0
    };

    // For each group, if user is the creator/only admin, delete the group and all its data
    for (const membership of userMemberships) {
      const groupId = membership.groupId;
      const group = await kv.get(`group:${groupId}`);
      
      if (!group) continue;
      
      // Only delete groups created by this user
      if (group.createdBy === userEmail) {
        // Delete all contributions
        const contributions = await kv.getByPrefix(`contribution:${groupId}:`);
        for (const contrib of contributions) {
          await kv.del(`contribution:${groupId}:${contrib.id}`);
          deletedCount.contributions++;
        }
        
        // Delete all payouts
        const payouts = await kv.getByPrefix(`payout:${groupId}:`);
        for (const payout of payouts) {
          await kv.del(`payout:${groupId}:${payout.id}`);
          deletedCount.payouts++;
        }
        
        // Delete all meetings and their associated data
        const meetings = await kv.getByPrefix(`meeting:${groupId}:`);
        for (const meeting of meetings) {
          const meetingId = meeting.id;
          
          // Delete votes for this meeting
          const votes = await kv.getByPrefix(`vote:${groupId}:${meetingId}:`);
          for (const vote of votes) {
            await kv.del(`vote:${groupId}:${meetingId}:${vote.id}`);
            deletedCount.votes++;
          }
          
          // Delete notes for this meeting
          const notes = await kv.getByPrefix(`note:${groupId}:${meetingId}:`);
          for (const note of notes) {
            await kv.del(`note:${groupId}:${meetingId}:${note.id}`);
            deletedCount.notes++;
          }
          
          // Delete chat messages for this meeting
          const chats = await kv.getByPrefix(`chat:${groupId}:${meetingId}:`);
          for (const chat of chats) {
            await kv.del(`chat:${groupId}:${meetingId}:${chat.id}`);
            deletedCount.chats++;
          }
          
          // Delete attendance records
          const attendance = await kv.getByPrefix(`attendance:${groupId}:${meetingId}:`);
          for (const att of attendance) {
            await kv.del(`attendance:${groupId}:${meetingId}:${att.userEmail}`);
          }
          
          // Delete meeting
          await kv.del(`meeting:${groupId}:${meetingId}`);
          deletedCount.meetings++;
        }
        
        // Delete all join requests
        const joinRequests = await kv.getByPrefix(`joinrequest:${groupId}:`);
        for (const request of joinRequests) {
          await kv.del(`joinrequest:${groupId}:${request.email}`);
          deletedCount.joinRequests++;
        }
        
        // Delete all invites
        const invites = await kv.getByPrefix(`invite:${groupId}:`);
        for (const invite of invites) {
          await kv.del(`invite:${groupId}:${invite.token}`);
          deletedCount.invites++;
        }
        
        // Delete constitution if exists
        const constitution = await kv.get(`constitution:${groupId}`);
        if (constitution) {
          try {
            const CONSTITUTION_BUCKET = 'make-34d0b231-constitutions';
            await supabaseAdmin.storage
              .from(CONSTITUTION_BUCKET)
              .remove([constitution.filePath]);
          } catch (storageError) {
            console.log(`Storage deletion error (continuing): ${storageError.message}`);
          }
          await kv.del(`constitution:${groupId}`);
          deletedCount.constitutions++;
        }
        
        // Delete all memberships for this group
        const groupMemberships = await kv.getByPrefix(`membership:${groupId}:`);
        for (const gm of groupMemberships) {
          await kv.del(`membership:${groupId}:${gm.userEmail}`);
          deletedCount.memberships++;
        }
        
        // Delete the group itself
        await kv.del(`group:${groupId}`);
        deletedCount.groups++;
      } else {
        // If user is not the creator, just remove their membership
        await kv.del(`membership:${groupId}:${userEmail}`);
        deletedCount.memberships++;
      }
    }
    
    // Delete user's pending invites to other groups
    const allInvites = await kv.getByPrefix(`invite:`);
    const userInvites = allInvites.filter(inv => inv.invitedEmail === userEmail);
    for (const invite of userInvites) {
      await kv.del(`invite:${invite.groupId}:${invite.token}`);
      deletedCount.invites++;
    }

    return c.json({ 
      success: true, 
      message: 'All data cleared successfully',
      deletedCount 
    });
  } catch (error) {
    console.log(`Clear all data error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === CONTRIBUTION ADJUSTMENT (ADMIN ONLY) ===

app.get('/make-server-34d0b231/groups/:groupId/contribution-adjustment', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('groupId');
    
    // Verify membership
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') {
      return c.json({ error: 'Not a member of this group' }, 403);
    }

    // Get adjustment (default to 0 if not set)
    const adjustment = await kv.get(`contribution-adjustment:${groupId}`);
    
    return c.json({ adjustment: adjustment || 0 });
  } catch (error) {
    console.log(`Get contribution adjustment error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-34d0b231/groups/:groupId/contribution-adjustment', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const groupId = c.req.param('groupId');
    const { adjustment } = await c.req.json();
    
    // Verify user is admin
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Not authorized - admin only' }, 403);
    }

    // Validate adjustment is a number
    if (typeof adjustment !== 'number') {
      return c.json({ error: 'Adjustment must be a number' }, 400);
    }

    // Store adjustment
    await kv.set(`contribution-adjustment:${groupId}`, adjustment);
    
    return c.json({ success: true, adjustment });
  } catch (error) {
    console.log(`Update contribution adjustment error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === EMAIL HELPER ===

async function sendEmail(to: string, subject: string, html: string) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) return;
  // Check user opt-out preferences
  const prefs = await kv.get(`notif-prefs:${to}`).catch(() => null);
  if (prefs && prefs.emailEnabled === false) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('EMAIL_FROM') || 'Stokpile <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    });
  } catch (err) {
    console.log(`Email send error: ${err.message}`);
  }
}

// === IN-APP NOTIFICATION HELPER ===

async function storeNotification(recipientEmail: string, groupId: string, title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') {
  const id = generateId();
  const timestamp = new Date().toISOString();
  await kv.set(`notification:${recipientEmail}:${timestamp}:${id}`, {
    id,
    recipientEmail,
    groupId,
    title,
    message,
    type,
    read: false,
    createdAt: timestamp,
  }).catch(console.warn);
}

// === WHATSAPP HELPER ===

async function sendWhatsApp(to: string, message: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_WHATSAPP_FROM') || 'whatsapp:+14155238886';
  if (!accountSid || !authToken) return; // Skip silently if not configured

  // Ensure recipient number has whatsapp: prefix
  const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({ From: from, To: toNumber, Body: message });
  const credentials = btoa(`${accountSid}:${authToken}`);

  try {
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch (err) {
    console.log(`WhatsApp send error: ${err.message}`);
  }
}

// Get WhatsApp numbers for approved group members who have a phone set
async function getGroupMemberPhones(groupId: string): Promise<string[]> {
  const memberships = await kv.getByPrefix(`membership:${groupId}:`);
  const approved = memberships.filter((m) => m.status === 'approved');
  const emails = approved.map((m) => m.userEmail);
  if (emails.length === 0) return [];

  // Filter out users who opted out of WhatsApp
  const prefsEntries = await Promise.all(emails.map(async e => ({ email: e, prefs: await kv.get(`notif-prefs:${e}`).catch(() => null) })));
  const filteredEmails = prefsEntries.filter(({ prefs }) => !prefs || prefs.whatsappEnabled !== false).map(e => e.email);
  const filteredApproved = approved.filter(m => filteredEmails.includes(m.userEmail));
  if (filteredApproved.length === 0) return [];

  // Prefer profiles table over KV store
  const { data: profileRows } = await supabaseAdmin
    .from('profiles')
    .select('phone')
    .in('email', filteredEmails)
    .not('phone', 'is', null);

  if (profileRows && profileRows.length > 0) {
    return profileRows.map((r) => r.phone).filter(Boolean);
  }

  // Fallback to KV store
  const phones: string[] = [];
  for (const email of filteredEmails) {
    const profile = await kv.get(`user:${email}`);
    if (profile?.phone) phones.push(profile.phone);
  }
  return phones;
}

// === PUSH NOTIFICATION HELPER ===

async function sendPushToGroup(groupId: string, payload: { title: string; body: string; url?: string }) {
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@stokpile.app';
  if (!vapidPrivateKey || !vapidPublicKey) return;

  // Get all subscriptions for group members
  const memberships = await kv.getByPrefix(`membership:${groupId}:`);
  const approved = memberships.filter((m) => m.status === 'approved');

  for (const m of approved) {
    const subData = await kv.get(`push-subscription:${m.userEmail}`);
    if (!subData) continue;
    try {
      // Use web-push compatible fetch
      const { endpoint, keys } = subData;
      if (!endpoint || !keys?.auth || !keys?.p256dh) continue;

      // Build the push message using Web Push Protocol via fetch
      // For full web-push support, import npm:web-push in Deno
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'aes128gcm',
          TTL: '86400',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        console.log(`Push failed for ${m.userEmail}: ${response.status}`);
      }
    } catch (err) {
      console.log(`Push error for ${m.userEmail}: ${err.message}`);
    }
  }
}

// === PUSH SUBSCRIPTION STORAGE ===

app.post('/make-server-34d0b231/push-subscription', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const subscription = await c.req.json();
    await kv.set(`push-subscription:${user.email}`, subscription);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Store push subscription error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === PAYSTACK PAYMENT LINK ===

app.post('/make-server-34d0b231/contributions/:id/payment-link', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) return c.json({ error: 'Payment not configured' }, 503);

    const contributionId = c.req.param('id');

    // Find contribution
    const allContributions = await kv.getByPrefix('contribution:');
    const contribution = allContributions.find((c) => c.id === contributionId);
    if (!contribution) return c.json({ error: 'Contribution not found' }, 404);

    // Only the contribution owner can pay
    if (contribution.userEmail !== user.email) {
      return c.json({ error: 'Not authorized' }, 403);
    }

    const group = await kv.get(`group:${contribution.groupId}`);
    const reference = `stokpile-${contributionId}-${Date.now()}`;

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(contribution.amount * 100), // Paystack uses kobo/cents
        currency: 'ZAR',
        reference,
        metadata: {
          contributionId,
          groupId: contribution.groupId,
          groupName: group?.name || '',
        },
        callback_url: Deno.env.get('APP_URL') || 'https://stokpilev1.vercel.app',
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      return c.json({ error: paystackData.message || 'Payment initialization failed' }, 400);
    }

    return c.json({
      authorizationUrl: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
    });
  } catch (error) {
    console.log(`Create payment link error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === BULK CONTRIBUTION MARKING ===

app.post('/make-server-34d0b231/contributions/bulk-mark', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { groupId, contributionIds, paid } = await c.req.json();

    if (!groupId || !Array.isArray(contributionIds) || typeof paid !== 'boolean') {
      return c.json({ error: 'groupId, contributionIds[], and paid are required' }, 400);
    }

    // Verify user is admin
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Not authorized - admin only' }, 403);
    }

    let updated = 0;
    for (const id of contributionIds) {
      const allContribs = await kv.getByPrefix(`contribution:${groupId}:`);
      const contribution = allContribs.find((c) => c.id === id);
      if (contribution) {
        contribution.paid = paid;
        contribution.updatedAt = new Date().toISOString();
        await kv.set(`contribution:${groupId}:${id}`, contribution);
        updated++;
      }
    }

    logAudit(groupId, user.email, 'bulk_mark_contributions', { count: updated, paid, contributionIds }).catch(console.warn);

    return c.json({ success: true, updated });
  } catch (error) {
    console.log(`Bulk mark contributions error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === AUDIT LOG ===

async function logAudit(groupId: string, actorEmail: string, action: string, details: Record<string, unknown> = {}) {
  const id = generateId();
  const timestamp = new Date().toISOString();
  await kv.set(`audit:${groupId}:${timestamp}:${id}`, {
    id,
    groupId,
    actorEmail,
    action,
    details,
    timestamp,
  });
}

app.get('/make-server-34d0b231/groups/:groupId/audit-log', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');

    // Verify user is admin
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Not authorized - admin only' }, 403);
    }

    const entries = await kv.getByPrefix(`audit:${groupId}:`);
    const sorted = entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return c.json({ auditLog: sorted.slice(0, 200) });
  } catch (error) {
    console.log(`Get audit log error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === GROUP HEALTH SCORE ===

app.get('/make-server-34d0b231/groups/:groupId/health', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');

    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') {
      return c.json({ error: 'Not a member of this group' }, 403);
    }

    const allContribs = await kv.getByPrefix(`contribution:${groupId}:`);
    const allMembers = (await kv.getByPrefix(`membership:${groupId}:`)).filter((m) => m.status === 'approved');

    // Payment rate: % of contributions that are paid
    const totalContribs = allContribs.length;
    const paidContribs = allContribs.filter((c) => c.paid).length;
    const paymentRate = totalContribs > 0 ? Math.round((paidContribs / totalContribs) * 100) : 0;

    // Monthly breakdown for trend analysis (last 6 months)
    const now = new Date();
    const months: { label: string; paid: number; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' });
      const monthContribs = allContribs.filter((c) => {
        const cd = new Date(c.date);
        return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
      });
      months.push({ label, paid: monthContribs.filter((c) => c.paid).length, total: monthContribs.length });
    }

    // Trend: compare last 3 months vs previous 3 months payment rate
    const recent = months.slice(3);
    const older = months.slice(0, 3);
    const recentRate = recent.reduce((s, m) => s + m.total, 0) > 0
      ? Math.round((recent.reduce((s, m) => s + m.paid, 0) / recent.reduce((s, m) => s + m.total, 0)) * 100)
      : 0;
    const olderRate = older.reduce((s, m) => s + m.total, 0) > 0
      ? Math.round((older.reduce((s, m) => s + m.paid, 0) / older.reduce((s, m) => s + m.total, 0)) * 100)
      : 0;
    const trend: 'up' | 'down' | 'stable' = recentRate > olderRate + 5 ? 'up' : recentRate < olderRate - 5 ? 'down' : 'stable';

    // Participation streak: consecutive months the group had at least 1 paid contribution
    let streak = 0;
    for (let i = months.length - 1; i >= 0; i--) {
      if (months[i].paid > 0) streak++;
      else break;
    }

    // Composite score (0–100)
    const score = Math.round(
      paymentRate * 0.6 +
      Math.min(streak * 10, 30) * 0.3 +
      (trend === 'up' ? 10 : trend === 'stable' ? 5 : 0)
    );

    return c.json({
      score: Math.min(score, 100),
      paymentRate,
      streak,
      trend,
      memberCount: allMembers.length,
      totalContributions: totalContribs,
      paidContributions: paidContribs,
      monthlyBreakdown: months,
    });
  } catch (error) {
    console.log(`Group health error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === IN-APP NOTIFICATIONS ===

app.get('/make-server-34d0b231/notifications', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const all = await kv.getByPrefix(`notification:${user.email}:`);
    const sorted = all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ notifications: sorted.slice(0, 100) });
  } catch (error) {
    console.log(`Get notifications error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-34d0b231/notifications/read-all', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const all = await kv.getByPrefix(`notification:${user.email}:`);
    for (const n of all) {
      if (!n.read) {
        n.read = true;
        await kv.set(`notification:${user.email}:${n.createdAt}:${n.id}`, n);
      }
    }
    return c.json({ success: true });
  } catch (error) {
    console.log(`Read all notifications error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === NOTIFICATION PREFERENCES ===

app.get('/make-server-34d0b231/notification-preferences', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const prefs = await kv.get(`notif-prefs:${user.email}`);
    return c.json({
      emailEnabled: prefs?.emailEnabled ?? true,
      whatsappEnabled: prefs?.whatsappEnabled ?? true,
      pushEnabled: prefs?.pushEnabled ?? true,
    });
  } catch (error) {
    console.log(`Get notif prefs error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-34d0b231/notification-preferences', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { emailEnabled, whatsappEnabled, pushEnabled } = await c.req.json();
    await kv.set(`notif-prefs:${user.email}`, {
      emailEnabled: emailEnabled ?? true,
      whatsappEnabled: whatsappEnabled ?? true,
      pushEnabled: pushEnabled ?? true,
    });
    return c.json({ success: true });
  } catch (error) {
    console.log(`Update notif prefs error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === GROUP ARCHIVING ===

app.put('/make-server-34d0b231/groups/:id/archive', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('id');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Not authorized - admin only' }, 403);

    const group = await kv.get(`group:${groupId}`);
    if (!group) return c.json({ error: 'Group not found' }, 404);

    group.archived = true;
    group.archivedAt = new Date().toISOString();
    group.archivedBy = user.email;
    await kv.set(`group:${groupId}`, group);

    logAudit(groupId, user.email, 'group_archived', {}).catch(console.warn);
    return c.json({ success: true, group });
  } catch (error) {
    console.log(`Archive group error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-34d0b231/groups/:id/unarchive', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('id');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Not authorized - admin only' }, 403);

    const group = await kv.get(`group:${groupId}`);
    if (!group) return c.json({ error: 'Group not found' }, 404);

    group.archived = false;
    group.archivedAt = null;
    group.archivedBy = null;
    await kv.set(`group:${groupId}`, group);

    logAudit(groupId, user.email, 'group_unarchived', {}).catch(console.warn);
    return c.json({ success: true, group });
  } catch (error) {
    console.log(`Unarchive group error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-34d0b231/groups/archived', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const allMemberships = await kv.getByPrefix('membership:');
    const userMemberships = allMemberships.filter(m => m.userEmail === user.email && m.status === 'approved');

    const groups = [];
    for (const membership of userMemberships) {
      const group = await kv.get(`group:${membership.groupId}`);
      if (group && group.archived) {
        groups.push({ ...group, userRole: membership.role });
      }
    }
    return c.json({ groups });
  } catch (error) {
    console.log(`Get archived groups error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === OVERDUE CONTRIBUTIONS ===

app.get('/make-server-34d0b231/groups/:groupId/overdue', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') return c.json({ error: 'Not a member of this group' }, 403);

    const group = await kv.get(`group:${groupId}`);
    const target = group?.contributionTarget || 0;

    const allMemberships = await kv.getByPrefix(`membership:${groupId}:`);
    const approved = allMemberships.filter(m => m.status === 'approved');

    const allContribs = await kv.getByPrefix(`contribution:${groupId}:`);

    const profiles = await Promise.all(
      approved.map(m => kv.get(`user:${m.userEmail}`).then(p => ({ email: m.userEmail, profile: p })))
    );
    const profileMap = Object.fromEntries(profiles.map(p => [p.email, p.profile]));

    const result = approved.map(m => {
      const memberContribs = allContribs.filter(c => c.userEmail === m.userEmail);
      const totalPaid = memberContribs.filter(c => c.paid).reduce((s, c) => s + c.amount, 0);
      const unpaidAmount = memberContribs.filter(c => !c.paid).reduce((s, c) => s + c.amount, 0);
      const isOverdue = target > 0 && totalPaid < target;
      const deficit = target > 0 ? Math.max(0, target - totalPaid) : 0;
      const profile = profileMap[m.userEmail];
      return {
        email: m.userEmail,
        fullName: profile?.fullName || 'Unknown',
        surname: profile?.surname || '',
        totalPaid,
        unpaidAmount,
        contributionCount: memberContribs.length,
        isOverdue,
        deficit,
        target,
      };
    });

    return c.json({ members: result, target });
  } catch (error) {
    console.log(`Get overdue error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === MEETING RSVP ===

app.post('/make-server-34d0b231/meetings/:id/rsvp', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const meetingId = c.req.param('id');
    const { response } = await c.req.json(); // 'yes' | 'no' | 'maybe'

    if (!['yes', 'no', 'maybe'].includes(response)) {
      return c.json({ error: 'Response must be yes, no, or maybe' }, 400);
    }

    // Find meeting to get groupId
    const allMeetings = await kv.getByPrefix('meeting:');
    const meeting = allMeetings.find(m => m.id === meetingId);
    if (!meeting) return c.json({ error: 'Meeting not found' }, 404);

    // Verify membership
    const membership = await kv.get(`membership:${meeting.groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') return c.json({ error: 'Not a member of this group' }, 403);

    await kv.set(`rsvp:${meeting.groupId}:${meetingId}:${user.email}`, {
      meetingId,
      groupId: meeting.groupId,
      userEmail: user.email,
      response,
      updatedAt: new Date().toISOString(),
    });

    return c.json({ success: true, response });
  } catch (error) {
    console.log(`RSVP error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-34d0b231/meetings/:id/rsvps', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const meetingId = c.req.param('id');

    const allMeetings = await kv.getByPrefix('meeting:');
    const meeting = allMeetings.find(m => m.id === meetingId);
    if (!meeting) return c.json({ error: 'Meeting not found' }, 404);

    const membership = await kv.get(`membership:${meeting.groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') return c.json({ error: 'Not a member of this group' }, 403);

    const rsvps = await kv.getByPrefix(`rsvp:${meeting.groupId}:${meetingId}:`);
    const summary = {
      yes: rsvps.filter(r => r.response === 'yes').length,
      no: rsvps.filter(r => r.response === 'no').length,
      maybe: rsvps.filter(r => r.response === 'maybe').length,
      myResponse: rsvps.find(r => r.userEmail === user.email)?.response || null,
    };

    return c.json({ rsvps, summary });
  } catch (error) {
    console.log(`Get RSVPs error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === ADMIN HANDOVER ===

app.post('/make-server-34d0b231/groups/:id/transfer-admin', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('id');
    const { newOwnerEmail } = await c.req.json();

    const group = await kv.get(`group:${groupId}`);
    if (!group) return c.json({ error: 'Group not found' }, 404);

    // Only the creator (admin1 = createdBy) can transfer ownership
    if (group.createdBy !== user.email) {
      return c.json({ error: 'Only the group creator can transfer ownership' }, 403);
    }

    // Verify new owner is an approved member
    const newOwnerMembership = await kv.get(`membership:${groupId}:${newOwnerEmail}`);
    if (!newOwnerMembership || newOwnerMembership.status !== 'approved') {
      return c.json({ error: 'New owner must be an approved group member' }, 400);
    }

    // Promote new owner to admin if not already
    if (newOwnerMembership.role !== 'admin') {
      newOwnerMembership.role = 'admin';
      newOwnerMembership.promotedAt = new Date().toISOString();
      newOwnerMembership.promotedBy = user.email;
      await kv.set(`membership:${groupId}:${newOwnerEmail}`, newOwnerMembership);
    }

    // Update group ownership
    const oldOwner = group.createdBy;
    group.createdBy = newOwnerEmail;
    // Move new owner into admin1 slot; push current admin1 to admin2 slot
    if (group.admin1 !== newOwnerEmail) {
      group.admin2 = group.admin1;
      group.admin1 = newOwnerEmail;
    }
    await kv.set(`group:${groupId}`, group);

    logAudit(groupId, user.email, 'admin_handover', { from: oldOwner, to: newOwnerEmail }).catch(console.warn);

    // Notify new owner
    const groupNameForHandover = group.name;
    storeNotification(newOwnerEmail, groupId, 'You are now the group owner', `${user.email} has transferred ownership of "${groupNameForHandover}" to you.`, 'success').catch(console.warn);
    sendEmail(newOwnerEmail, `You are now the owner of ${groupNameForHandover}`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#1e293b;margin-bottom:8px;">Group ownership transferred 🎉</h2>
        <p style="color:#475569;"><strong>${user.email}</strong> has transferred ownership of <strong>${groupNameForHandover}</strong> to you.</p>
        <p style="color:#475569;">You are now the primary admin for this group.</p>
      </div>`
    ).catch(console.warn);

    return c.json({ success: true, group });
  } catch (error) {
    console.log(`Transfer admin error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// === WEEKLY DIGEST ===

async function sendGroupDigest(groupId: string) {
  const group = await kv.get(`group:${groupId}`);
  if (!group || group.archived) return;

  const allMemberships = await kv.getByPrefix(`membership:${groupId}:`);
  const admins = allMemberships.filter(m => m.role === 'admin' && m.status === 'approved');
  if (admins.length === 0) return;

  const allContribs = await kv.getByPrefix(`contribution:${groupId}:`);
  const allPayouts = await kv.getByPrefix(`payout:${groupId}:`);

  // Stats for last 7 days
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentContribs = allContribs.filter(c => c.createdAt >= cutoff);
  const paidThisWeek = recentContribs.filter(c => c.paid).reduce((s, c) => s + c.amount, 0);
  const unpaidCount = allContribs.filter(c => !c.paid).length;
  const scheduledPayouts = allPayouts.filter(p => p.status === 'scheduled');

  // Overdue members (if target set)
  const target = group.contributionTarget || 0;
  const overdueList: string[] = [];
  if (target > 0) {
    const approvedMembers = allMemberships.filter(m => m.status === 'approved');
    for (const m of approvedMembers) {
      const paid = allContribs.filter(c => c.userEmail === m.userEmail && c.paid).reduce((s, c) => s + c.amount, 0);
      if (paid < target) overdueList.push(m.userEmail);
    }
  }

  const subject = `Weekly digest – ${group.name}`;
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;">
      <h2 style="color:#1e293b;margin-bottom:4px;">Weekly Group Digest 📊</h2>
      <p style="color:#64748b;margin-top:0;">${group.name} · ${new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#475569;">Contributions this week</td><td style="padding:8px 0;font-weight:600;text-align:right;">R ${paidThisWeek.toFixed(2)}</td></tr>
        <tr><td style="padding:8px 0;color:#475569;">Unpaid contributions</td><td style="padding:8px 0;font-weight:600;text-align:right;color:${unpaidCount > 0 ? '#f59e0b' : '#22c55e'};">${unpaidCount}</td></tr>
        <tr><td style="padding:8px 0;color:#475569;">Scheduled payouts</td><td style="padding:8px 0;font-weight:600;text-align:right;">${scheduledPayouts.length}</td></tr>
        ${target > 0 ? `<tr><td style="padding:8px 0;color:#475569;">Members overdue</td><td style="padding:8px 0;font-weight:600;text-align:right;color:${overdueList.length > 0 ? '#ef4444' : '#22c55e'};">${overdueList.length}</td></tr>` : ''}
      </table>
      ${overdueList.length > 0 ? `<div style="background:#fef2f2;border-radius:8px;padding:16px;margin-top:16px;"><p style="color:#991b1b;font-size:13px;margin:0;"><strong>Overdue members:</strong> ${overdueList.join(', ')}</p></div>` : ''}
      <p style="color:#94a3b8;font-size:12px;margin-top:32px;">You are receiving this because you are a group admin. Manage notification preferences in Stokpile settings.</p>
    </div>
  `;

  for (const admin of admins) {
    await sendEmail(admin.userEmail, subject, html).catch(console.warn);
  }
}

app.post('/make-server-34d0b231/admin/send-weekly-digest', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const { groupId } = await c.req.json();

    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Not authorized - admin only' }, 403);

    await sendGroupDigest(groupId);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Send digest error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// Schedule weekly digest every Monday at 7am UTC
try {
  Deno.cron('weekly-group-digest', '0 7 * * 1', async () => {
    const allGroups = await kv.getByPrefix('group:').catch(() => []);
    for (const group of allGroups) {
      if (!group.archived) {
        await sendGroupDigest(group.id).catch(console.warn);
      }
    }
  });
} catch {
  // Deno.cron may not be available in all environments
}

// === ERROR LOGGING ===

app.post('/make-server-34d0b231/errors/log', async (c) => {
  try {
    const { message, stack, componentStack, url, timestamp } = await c.req.json();
    const errorId = generateId();
    await kv.set(`error:${timestamp || new Date().toISOString()}:${errorId}`, {
      id: errorId,
      message,
      stack,
      componentStack,
      url,
      timestamp: timestamp || new Date().toISOString(),
    });
    return c.json({ success: true });
  } catch {
    return c.json({ success: false }, 500);
  }
});

// ============================================================
// ANNOUNCEMENTS
// ============================================================

app.post('/make-server-34d0b231/groups/:groupId/announcements', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') return c.json({ error: 'Not a member' }, 403);
    if (membership.role !== 'admin') return c.json({ error: 'Admins only' }, 403);

    const { title, content, urgent = false, pinned = false } = await c.req.json();
    if (!title?.trim() || !content?.trim()) return c.json({ error: 'Title and content are required' }, 400);

    const id = generateId();
    const now = new Date().toISOString();
    const profile = await kv.get(`user:${user.email}`) || {};
    const announcement = {
      id, groupId, title: title.trim(), content: content.trim(),
      urgent: !!urgent, pinned: !!pinned,
      createdBy: user.email, createdAt: now,
      author: { fullName: profile.fullName || '', surname: profile.surname || '', profilePictureUrl: profile.profilePictureUrl || null },
    };
    await kv.set(`announcement:${groupId}:${id}`, announcement);

    logAudit(groupId, user.email, 'announcement_created', { id, title: title.trim(), urgent }).catch(console.warn);

    // Notify all members
    const allMemberships = await kv.getByPrefix(`membership:${groupId}:`);
    const approved = allMemberships.filter(m => m.status === 'approved' && m.userEmail !== user.email);
    const group = await kv.get(`group:${groupId}`);
    const notifTitle = urgent ? `🚨 Urgent: ${title.trim()}` : `📢 ${title.trim()}`;
    await Promise.all(approved.map(m =>
      storeNotification(m.userEmail, groupId, notifTitle, content.trim().substring(0, 120), urgent ? 'warning' : 'info').catch(console.warn)
    ));
    if (urgent && group) {
      const phones = await getGroupMemberPhones(groupId);
      for (const phone of phones) {
        sendWhatsApp(phone, `🚨 *${group.name}* — Urgent announcement: *${title.trim()}*\n\n${content.trim()}`).catch(console.warn);
      }
    }

    return c.json({ announcement });
  } catch (error) {
    console.log(`Create announcement error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-34d0b231/groups/:groupId/announcements', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') return c.json({ error: 'Not a member' }, 403);

    const all = await kv.getByPrefix(`announcement:${groupId}:`);
    const announcements = all.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return c.json({ announcements });
  } catch (error) {
    console.log(`Get announcements error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-34d0b231/groups/:groupId/announcements/:announcementId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const announcementId = c.req.param('announcementId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Admins only' }, 403);

    const existing = await kv.get(`announcement:${groupId}:${announcementId}`);
    if (!existing) return c.json({ error: 'Announcement not found' }, 404);

    const { title, content, urgent, pinned } = await c.req.json();
    const updated = {
      ...existing,
      ...(title !== undefined && { title: title.trim() }),
      ...(content !== undefined && { content: content.trim() }),
      ...(urgent !== undefined && { urgent: !!urgent }),
      ...(pinned !== undefined && { pinned: !!pinned }),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`announcement:${groupId}:${announcementId}`, updated);
    logAudit(groupId, user.email, 'announcement_updated', { id: announcementId }).catch(console.warn);
    return c.json({ announcement: updated });
  } catch (error) {
    console.log(`Update announcement error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/make-server-34d0b231/groups/:groupId/announcements/:announcementId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const announcementId = c.req.param('announcementId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Admins only' }, 403);

    await kv.del(`announcement:${groupId}:${announcementId}`);
    logAudit(groupId, user.email, 'announcement_deleted', { id: announcementId }).catch(console.warn);
    return c.json({ message: 'Announcement deleted' });
  } catch (error) {
    console.log(`Delete announcement error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================
// PAYMENT PROOFS
// ============================================================

const PROOF_BUCKET = 'make-34d0b231-payment-proofs';

async function ensureProofBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.some(b => b.name === PROOF_BUCKET)) {
    await supabaseAdmin.storage.createBucket(PROOF_BUCKET, { public: false, fileSizeLimit: 10485760 });
  }
}

app.post('/make-server-34d0b231/groups/:groupId/proofs/:linkedType/:linkedId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const linkedType = c.req.param('linkedType') as 'payout' | 'contribution';
    const linkedId = c.req.param('linkedId');

    if (!['payout', 'contribution'].includes(linkedType)) return c.json({ error: 'Invalid type' }, 400);

    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') return c.json({ error: 'Not a member' }, 403);

    // Verify the linked entity exists and belongs to this group
    const entity = await kv.get(`${linkedType}:${groupId}:${linkedId}`);
    if (!entity) return c.json({ error: `${linkedType} not found` }, 404);

    // Permission: admin always allowed; for contributions the owner can also upload
    const isAdmin = membership.role === 'admin';
    if (!isAdmin) {
      if (linkedType === 'contribution' && entity.userEmail !== user.email) return c.json({ error: 'Forbidden' }, 403);
      if (linkedType === 'payout') return c.json({ error: 'Admins only for payout proofs' }, 403);
    }

    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return c.json({ error: 'No file provided' }, 400);

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) return c.json({ error: 'Only JPEG, PNG, WebP, or PDF allowed' }, 400);
    if (file.size > 10 * 1024 * 1024) return c.json({ error: 'File must be under 10 MB' }, 400);

    const referenceNumber = formData.get('referenceNumber')?.toString() || undefined;
    const notes = formData.get('notes')?.toString() || undefined;

    await ensureProofBucket();

    // Delete old proof file if one exists
    const oldProof = await kv.get(`payment-proof:${groupId}:${linkedId}`);
    if (oldProof?.filePath) {
      await supabaseAdmin.storage.from(PROOF_BUCKET).remove([oldProof.filePath]).catch(console.warn);
    }

    const ext = file.name.split('.').pop();
    const filePath = `proofs/${groupId}/${linkedId}-${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage.from(PROOF_BUCKET)
      .upload(filePath, arrayBuffer, { contentType: file.type, upsert: true });
    if (uploadError) throw new Error(uploadError.message);

    const proof = {
      id: generateId(), groupId, linkedId, linkedType,
      fileName: file.name, filePath, fileType: file.type, fileSize: file.size,
      uploadedBy: user.email, uploadedAt: new Date().toISOString(),
      referenceNumber, notes,
    };
    await kv.set(`payment-proof:${groupId}:${linkedId}`, proof);
    logAudit(groupId, user.email, 'proof_uploaded', { linkedId, linkedType, fileName: file.name }).catch(console.warn);
    return c.json({ proof });
  } catch (error) {
    console.log(`Upload proof error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.get('/make-server-34d0b231/groups/:groupId/proofs/:linkedType/:linkedId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const linkedId = c.req.param('linkedId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') return c.json({ error: 'Not a member' }, 403);

    const proof = await kv.get(`payment-proof:${groupId}:${linkedId}`);
    if (!proof) return c.json({ proof: null });

    const { data: urlData } = await supabaseAdmin.storage.from(PROOF_BUCKET)
      .createSignedUrl(proof.filePath, 3600);
    return c.json({ proof: { ...proof, downloadUrl: urlData?.signedUrl || null } });
  } catch (error) {
    console.log(`Get proof error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/make-server-34d0b231/groups/:groupId/proofs/:linkedType/:linkedId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const linkedId = c.req.param('linkedId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Admins only' }, 403);

    const proof = await kv.get(`payment-proof:${groupId}:${linkedId}`);
    if (proof?.filePath) {
      await supabaseAdmin.storage.from(PROOF_BUCKET).remove([proof.filePath]).catch(console.warn);
    }
    await kv.del(`payment-proof:${groupId}:${linkedId}`);
    logAudit(groupId, user.email, 'proof_deleted', { linkedId }).catch(console.warn);
    return c.json({ message: 'Proof deleted' });
  } catch (error) {
    console.log(`Delete proof error: ${error.message}`);
    return c.json({ error: error.message }, 500);
  }
});

// ─── SMS Helper (Africa's Talking) ───────────────────────────────────────────

async function sendSMS(phone: string, message: string): Promise<void> {
  const apiKey = Deno.env.get('AFRICAS_TALKING_API_KEY');
  const username = Deno.env.get('AFRICAS_TALKING_USERNAME') || 'sandbox';
  if (!apiKey || !phone) return;
  try {
    const params = new URLSearchParams({ username, to: phone, message });
    await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: { apiKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
  } catch (e) {
    console.warn('SMS send failed:', e.message);
  }
}

// ─── Flutterwave Payment Link ─────────────────────────────────────────────────

app.post('/make-server-34d0b231/contributions/:contributionId/flutterwave-link', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const secretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    if (!secretKey) return c.json({ error: 'Flutterwave not configured' }, 503);

    const contributionId = c.req.param('contributionId');
    const contribution = await kv.get(`contribution:${contributionId}`);
    if (!contribution) return c.json({ error: 'Contribution not found' }, 404);

    const membership = await kv.get(`membership:${contribution.groupId}:${user.email}`);
    if (!membership) return c.json({ error: 'Not a group member' }, 403);
    if (contribution.userEmail !== user.email) return c.json({ error: 'Not your contribution' }, 403);

    const profile = await kv.get(`user:${user.email}`);
    const txRef = `stk-${contributionId}-${Date.now()}`;

    const payload = {
      tx_ref: txRef,
      amount: contribution.amount,
      currency: contribution.currency || 'ZAR',
      redirect_url: `${Deno.env.get('APP_URL') || 'https://stokpile.app'}/payment-callback`,
      customer: { email: user.email, name: `${profile?.fullName || ''} ${profile?.surname || ''}`.trim() },
      customizations: { title: 'Stokpile Contribution', description: `Contribution payment for group` },
      meta: { contributionId, groupId: contribution.groupId },
    };

    const res = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.status !== 'success') return c.json({ error: data.message || 'Flutterwave error' }, 400);
    return c.json({ paymentLink: data.data.link, txRef });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Flutterwave webhook — verify and mark contribution paid
app.post('/make-server-34d0b231/flutterwave/webhook', async (c) => {
  try {
    const secretHash = Deno.env.get('FLUTTERWAVE_SECRET_HASH');
    const sig = c.req.header('verif-hash');
    if (secretHash && sig !== secretHash) return c.json({ error: 'Invalid signature' }, 401);

    const body = await c.req.json();
    if (body.event !== 'charge.completed' || body.data?.status !== 'successful') return c.json({ ok: true });

    const contributionId = body.data?.meta?.contributionId;
    if (!contributionId) return c.json({ ok: true });

    const contribution = await kv.get(`contribution:${contributionId}`);
    if (contribution && !contribution.paid) {
      await kv.set(`contribution:${contributionId}`, { ...contribution, paid: true });
      storeNotification(contribution.groupId, contribution.userEmail, 'Contribution Paid', `Payment of ${contribution.amount} received via Flutterwave`, 'success').catch(console.warn);
    }
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// ─── Rotation Order ───────────────────────────────────────────────────────────

app.get('/make-server-34d0b231/groups/:groupId/rotation', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') return c.json({ error: 'Not a member' }, 403);

    const rotation = await kv.get(`rotation:${groupId}`);
    if (!rotation) return c.json({ rotation: null });

    // Enrich slots with profile data
    const enriched = await Promise.all(rotation.slots.map(async (slot: { email: string; position: number; cycleReceived: boolean }) => {
      const profile = await kv.get(`user:${slot.email}`);
      return { ...slot, fullName: profile?.fullName, surname: profile?.surname, profilePictureUrl: profile?.profilePictureUrl };
    }));
    return c.json({ rotation: { ...rotation, slots: enriched } });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-34d0b231/groups/:groupId/rotation/init', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Admins only' }, 403);

    const allMemberships = await kv.getByPrefix(`membership:${groupId}:`);
    const approved = allMemberships.filter((m: { status: string }) => m.status === 'approved');
    const slots = approved.map((m: { email: string }, i: number) => ({ email: m.email, position: i + 1, cycleReceived: false }));

    const rotation = { groupId, slots, currentPosition: 1, currentCycle: 1, updatedAt: new Date().toISOString() };
    await kv.set(`rotation:${groupId}`, rotation);
    logAudit(groupId, user.email, 'rotation_initialized', { memberCount: slots.length }).catch(console.warn);
    return c.json({ message: 'Rotation initialized', rotation });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-34d0b231/groups/:groupId/rotation/advance', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Admins only' }, 403);

    const rotation = await kv.get(`rotation:${groupId}`);
    if (!rotation) return c.json({ error: 'Rotation not initialized' }, 404);

    const updatedSlots = rotation.slots.map((s: { position: number; cycleReceived: boolean }) =>
      s.position === rotation.currentPosition ? { ...s, cycleReceived: true } : s
    );
    const nextPosition = rotation.currentPosition + 1;
    const allDone = nextPosition > rotation.slots.length;
    const newRotation = {
      ...rotation,
      slots: allDone ? updatedSlots.map((s: { cycleReceived: boolean }) => ({ ...s, cycleReceived: false })) : updatedSlots,
      currentPosition: allDone ? 1 : nextPosition,
      currentCycle: allDone ? rotation.currentCycle + 1 : rotation.currentCycle,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`rotation:${groupId}`, newRotation);
    logAudit(groupId, user.email, 'rotation_advanced', { position: rotation.currentPosition, newCycle: allDone }).catch(console.warn);
    return c.json({ message: 'Rotation advanced', rotation: newRotation });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-34d0b231/groups/:groupId/rotation/reorder', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Admins only' }, 403);

    const { slots } = await c.req.json();
    const rotation = await kv.get(`rotation:${groupId}`);
    if (!rotation) return c.json({ error: 'Rotation not initialized' }, 404);

    const updatedSlots = slots.map((s: { email: string; position: number }) => {
      const existing = rotation.slots.find((r: { email: string }) => r.email === s.email);
      return { ...existing, position: s.position };
    });
    const updated = { ...rotation, slots: updatedSlots, updatedAt: new Date().toISOString() };
    await kv.set(`rotation:${groupId}`, updated);
    return c.json({ message: 'Rotation reordered', rotation: updated });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// ─── Grocery Items ────────────────────────────────────────────────────────────

app.get('/make-server-34d0b231/groups/:groupId/grocery', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') return c.json({ error: 'Not a member' }, 403);

    const items = await kv.getByPrefix(`grocery-item:${groupId}:`);
    return c.json({ items: items.sort((a: { createdAt: string }, b: { createdAt: string }) => a.createdAt.localeCompare(b.createdAt)) });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-34d0b231/groups/:groupId/grocery', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') return c.json({ error: 'Not a member' }, 403);

    const { name, quantity, unit, estimatedCost, assignedTo, notes } = await c.req.json();
    if (!name || !quantity || !unit) return c.json({ error: 'name, quantity, and unit are required' }, 400);

    const id = generateId();
    const item = { id, groupId, name, quantity: Number(quantity), unit, estimatedCost: Number(estimatedCost) || 0, assignedTo: assignedTo || null, status: 'needed', notes: notes || null, addedBy: user.email, createdAt: new Date().toISOString() };
    await kv.set(`grocery-item:${groupId}:${id}`, item);
    return c.json({ item });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-34d0b231/groups/:groupId/grocery/:itemId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const itemId = c.req.param('itemId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') return c.json({ error: 'Not a member' }, 403);

    const existing = await kv.get(`grocery-item:${groupId}:${itemId}`);
    if (!existing) return c.json({ error: 'Item not found' }, 404);

    const updates = await c.req.json();
    await kv.set(`grocery-item:${groupId}:${itemId}`, { ...existing, ...updates, updatedAt: new Date().toISOString() });
    return c.json({ message: 'Item updated' });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/make-server-34d0b231/groups/:groupId/grocery/:itemId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const itemId = c.req.param('itemId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Admins only' }, 403);

    await kv.del(`grocery-item:${groupId}:${itemId}`);
    return c.json({ message: 'Item removed' });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// ─── Burial Society — Beneficiaries ──────────────────────────────────────────

app.get('/make-server-34d0b231/groups/:groupId/burial/beneficiaries', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') return c.json({ error: 'Not a member' }, 403);

    const beneficiaries = await kv.getByPrefix(`burial-beneficiary:${groupId}:`);
    return c.json({ beneficiaries: beneficiaries.sort((a: { createdAt: string }, b: { createdAt: string }) => a.createdAt.localeCompare(b.createdAt)) });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-34d0b231/groups/:groupId/burial/beneficiaries', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') return c.json({ error: 'Not a member' }, 403);

    const { name, relationship, idNumber, phone } = await c.req.json();
    if (!name || !relationship) return c.json({ error: 'name and relationship are required' }, 400);

    const id = generateId();
    const beneficiary = { id, groupId, memberEmail: user.email, name, relationship, idNumber: idNumber || null, phone: phone || null, createdAt: new Date().toISOString() };
    await kv.set(`burial-beneficiary:${groupId}:${id}`, beneficiary);
    return c.json({ beneficiary });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/make-server-34d0b231/groups/:groupId/burial/beneficiaries/:beneficiaryId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const beneficiaryId = c.req.param('beneficiaryId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') return c.json({ error: 'Not a member' }, 403);

    const existing = await kv.get(`burial-beneficiary:${groupId}:${beneficiaryId}`);
    if (!existing) return c.json({ error: 'Not found' }, 404);
    if (existing.memberEmail !== user.email && membership.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

    await kv.del(`burial-beneficiary:${groupId}:${beneficiaryId}`);
    return c.json({ message: 'Beneficiary removed' });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// ─── Burial Society — Claims ──────────────────────────────────────────────────

app.get('/make-server-34d0b231/groups/:groupId/burial/claims', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') return c.json({ error: 'Not a member' }, 403);

    const claims = await kv.getByPrefix(`burial-claim:${groupId}:`);
    return c.json({ claims: claims.sort((a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt)) });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-34d0b231/groups/:groupId/burial/claims', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') return c.json({ error: 'Not a member' }, 403);

    const { beneficiaryName, relationship, deceasedName, dateOfDeath, amount, notes } = await c.req.json();
    if (!beneficiaryName || !deceasedName || !dateOfDeath || !amount) return c.json({ error: 'Missing required fields' }, 400);

    const id = generateId();
    const claim = { id, groupId, claimantEmail: user.email, beneficiaryName, relationship: relationship || '', deceasedName, dateOfDeath, amount: Number(amount), status: 'pending', notes: notes || null, createdAt: new Date().toISOString() };
    await kv.set(`burial-claim:${groupId}:${id}`, claim);

    // Notify all admins
    const memberships = await kv.getByPrefix(`membership:${groupId}:`);
    const adminEmails = memberships.filter((m: { role: string; status: string }) => m.role === 'admin' && m.status === 'approved').map((m: { email: string }) => m.email);
    for (const adminEmail of adminEmails) {
      storeNotification(groupId, adminEmail, 'New Burial Claim', `A burial claim has been submitted by ${user.email}`, 'warning').catch(console.warn);
    }
    logAudit(groupId, user.email, 'burial_claim_submitted', { claimId: id, amount }).catch(console.warn);
    return c.json({ claim });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-34d0b231/groups/:groupId/burial/claims/:claimId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const claimId = c.req.param('claimId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Admins only' }, 403);

    const claim = await kv.get(`burial-claim:${groupId}:${claimId}`);
    if (!claim) return c.json({ error: 'Claim not found' }, 404);

    const { status } = await c.req.json();
    const updated = { ...claim, status, processedAt: new Date().toISOString(), processedBy: user.email };
    await kv.set(`burial-claim:${groupId}:${claimId}`, updated);

    storeNotification(groupId, claim.claimantEmail, 'Claim Updated', `Your burial claim status is now: ${status}`, status === 'approved' || status === 'paid' ? 'success' : 'warning').catch(console.warn);
    logAudit(groupId, user.email, `burial_claim_${status}`, { claimId, claimantEmail: claim.claimantEmail }).catch(console.warn);
    return c.json({ message: 'Claim updated', claim: updated });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// ─── Penalties / Fines ────────────────────────────────────────────────────────

app.get('/make-server-34d0b231/groups/:groupId/penalties', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.status !== 'approved') return c.json({ error: 'Not a member' }, 403);

    const rules = await kv.getByPrefix(`penalty-rule:${groupId}:`);
    const charges = await kv.getByPrefix(`penalty-charge:${groupId}:`);
    return c.json({ rules, charges });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-34d0b231/groups/:groupId/penalties/rules', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Admins only' }, 403);

    const { name, amount, description } = await c.req.json();
    if (!name || !amount) return c.json({ error: 'name and amount required' }, 400);

    const id = generateId();
    const rule = { id, groupId, name, amount: Number(amount), description: description || null, createdBy: user.email, createdAt: new Date().toISOString() };
    await kv.set(`penalty-rule:${groupId}:${id}`, rule);
    return c.json({ rule });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/make-server-34d0b231/groups/:groupId/penalties/rules/:ruleId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Admins only' }, 403);

    await kv.del(`penalty-rule:${groupId}:${c.req.param('ruleId')}`);
    return c.json({ message: 'Rule removed' });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/make-server-34d0b231/groups/:groupId/penalties/charge', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Admins only' }, 403);

    const { memberEmail, ruleId, reason } = await c.req.json();
    const rule = await kv.get(`penalty-rule:${groupId}:${ruleId}`);
    if (!rule) return c.json({ error: 'Penalty rule not found' }, 404);

    const id = generateId();
    const charge = { id, groupId, memberEmail, ruleId, ruleName: rule.name, amount: rule.amount, reason: reason || rule.name, status: 'outstanding', createdBy: user.email, createdAt: new Date().toISOString() };
    await kv.set(`penalty-charge:${groupId}:${id}`, charge);

    storeNotification(groupId, memberEmail, 'Fine Issued', `A fine of ${rule.amount} has been issued: ${rule.name}`, 'warning').catch(console.warn);
    logAudit(groupId, user.email, 'penalty_charged', { memberEmail, amount: rule.amount, reason: rule.name }).catch(console.warn);

    // SMS notification if member has phone and smsEnabled
    const prefs = await kv.get(`notification-prefs:${memberEmail}`);
    if (prefs?.smsEnabled) {
      const profile = await kv.get(`user:${memberEmail}`);
      if (profile?.phone) sendSMS(profile.phone, `Stokpile: A fine of ${rule.amount} has been issued to your account: ${rule.name}`).catch(console.warn);
    }
    return c.json({ charge });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.put('/make-server-34d0b231/groups/:groupId/penalties/charges/:chargeId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const groupId = c.req.param('groupId');
    const chargeId = c.req.param('chargeId');
    const membership = await kv.get(`membership:${groupId}:${user.email}`);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Admins only' }, 403);

    const existing = await kv.get(`penalty-charge:${groupId}:${chargeId}`);
    if (!existing) return c.json({ error: 'Charge not found' }, 404);

    const { status } = await c.req.json();
    await kv.set(`penalty-charge:${groupId}:${chargeId}`, { ...existing, status, updatedAt: new Date().toISOString() });
    return c.json({ message: 'Charge updated' });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// === BILLING ===

const PLAN_CODES: Record<string, string | undefined> = {
  community: Deno.env.get('PAYSTACK_COMMUNITY_PLAN_CODE'),
  pro:       Deno.env.get('PAYSTACK_PRO_PLAN_CODE'),
};

app.post('/billing/initialize', requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const { groupId, tier, email } = await c.req.json();

    if (!['community', 'pro'].includes(tier)) {
      return c.json({ error: 'Invalid tier for billing' }, 400);
    }

    const membership = await kv.get(`membership:${groupId}:${userId}`);
    if (!membership || membership.role !== 'admin') {
      return c.json({ error: 'Admin only' }, 403);
    }

    const planCode = PLAN_CODES[tier];
    if (!planCode) return c.json({ error: `Plan code for ${tier} not configured` }, 503);

    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) return c.json({ error: 'Payment not configured' }, 503);

    const appUrl = Deno.env.get('APP_URL') || 'https://stokpilev1.vercel.app';
    const reference = `sub-${groupId}-${tier}-${Date.now()}`;

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: tier === 'community' ? 4900 : 9900, // ZAR cents (R49 / R99)
        currency: 'ZAR',
        plan: planCode,
        reference,
        callback_url: `${appUrl}?billing=success&groupId=${groupId}&tier=${tier}`,
        metadata: { groupId, tier },
      }),
    });

    const data = await res.json();
    if (!data.status) return c.json({ error: data.message || 'Payment init failed' }, 400);

    return c.json({
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/billing/webhook/paystack', async (c) => {
  try {
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) return c.json({ error: 'Not configured' }, 503);

    // Verify signature
    const signature = c.req.header('x-paystack-signature');
    const rawBody = await c.req.text();
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(paystackSecretKey),
      { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
    const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (hex !== signature) return c.json({ error: 'Invalid signature' }, 401);

    const event = JSON.parse(rawBody);
    const { groupId, tier } = event.data?.metadata || {};

    if (event.event === 'charge.success' && groupId && tier) {
      const existing = await kv.get(`subscription:${groupId}`) || {};
      await kv.set(`subscription:${groupId}`, {
        ...existing,
        groupId,
        tier,
        updatedAt: new Date().toISOString(),
      });
    }

    if (event.event === 'subscription.create' && groupId) {
      const existing = await kv.get(`subscription:${groupId}`) || {};
      await kv.set(`subscription:${groupId}`, {
        ...existing,
        paystackSubscriptionCode: event.data?.subscription_code ?? null,
        paystackCustomerCode: event.data?.customer?.customer_code ?? null,
        nextBillingDate: event.data?.next_payment_date ?? null,
        updatedAt: new Date().toISOString(),
      });
    }

    if (event.event === 'subscription.disable' && groupId) {
      const existing = await kv.get(`subscription:${groupId}`) || {};
      await kv.set(`subscription:${groupId}`, {
        ...existing,
        tier: 'free',
        paystackSubscriptionCode: null,
        nextBillingDate: null,
        updatedAt: new Date().toISOString(),
      });
    }

    if (event.event === 'invoice.update' && groupId) {
      const existing = await kv.get(`subscription:${groupId}`) || {};
      await kv.set(`subscription:${groupId}`, {
        ...existing,
        nextBillingDate: event.data?.next_payment_date ?? existing.nextBillingDate,
        updatedAt: new Date().toISOString(),
      });
    }

    return c.json({ received: true });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/billing/cancel', requireAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const { groupId } = await c.req.json();

    const membership = await kv.get(`membership:${groupId}:${userId}`);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Admin only' }, 403);

    const sub = await kv.get(`subscription:${groupId}`);
    if (!sub?.paystackSubscriptionCode) return c.json({ error: 'No active subscription' }, 400);

    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    const res = await fetch(`https://api.paystack.co/subscription/disable`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: sub.paystackSubscriptionCode,
        token: sub.paystackCustomerCode,
      }),
    });

    const data = await res.json();
    if (!data.status) return c.json({ error: data.message }, 400);

    // Webhook will handle the actual downgrade; optimistically clear code
    await kv.set(`subscription:${groupId}`, {
      ...sub,
      paystackSubscriptionCode: null,
      nextBillingDate: null,
      updatedAt: new Date().toISOString(),
    });

    return c.json({ message: 'Subscription cancelled' });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// === SUBSCRIPTION ===

const VALID_TIERS = ['free', 'community', 'pro', 'enterprise'];
const TRIAL_DAYS = 90;

app.get('/groups/:groupId/subscription', requireAuth, async (c) => {
  try {
    const groupId = c.req.param('groupId');
    const userId = c.get('userId');

    const membership = await kv.get(`membership:${groupId}:${userId}`);
    if (!membership) return c.json({ error: 'Not a member' }, 403);

    let sub = await kv.get(`subscription:${groupId}`);

    if (!sub) {
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      sub = {
        groupId,
        tier: 'trial',
        trialStartedAt: now.toISOString(),
        trialEndsAt: trialEndsAt.toISOString(),
        updatedAt: now.toISOString(),
      };
      await kv.set(`subscription:${groupId}`, sub);
      return c.json(sub);
    }

    // Auto-downgrade expired trials
    if (sub.tier === 'trial' && new Date(sub.trialEndsAt) < new Date()) {
      sub = { ...sub, tier: 'free', updatedAt: new Date().toISOString() };
      await kv.set(`subscription:${groupId}`, sub);
    }

    return c.json(sub);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post('/groups/:groupId/subscription', requireAuth, async (c) => {
  try {
    const groupId = c.req.param('groupId');
    const userId = c.get('userId');

    const membership = await kv.get(`membership:${groupId}:${userId}`);
    if (!membership || membership.role !== 'admin') return c.json({ error: 'Admin only' }, 403);

    const { tier } = await c.req.json();
    if (!VALID_TIERS.includes(tier)) return c.json({ error: 'Invalid tier' }, 400);
    if (tier === 'enterprise') return c.json({ error: 'Contact us to upgrade to Enterprise' }, 400);

    const existing = await kv.get(`subscription:${groupId}`);
    const now = new Date().toISOString();
    const updated = {
      groupId,
      tier,
      trialStartedAt: existing?.trialStartedAt ?? null,
      trialEndsAt: existing?.trialEndsAt ?? null,
      updatedAt: now,
    };
    await kv.set(`subscription:${groupId}`, updated);
    return c.json(updated);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

Deno.serve(app.fetch);
