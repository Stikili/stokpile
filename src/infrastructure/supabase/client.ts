/**
 * Supabase client for direct reads from the browser.
 *
 * Uses the anon key + RLS policies — no Edge Function needed for reads.
 * The Edge Function is still used for writes that need server logic
 * (signup, billing, SMS, email, etc.).
 */

import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './config';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(supabaseUrl, publicAnonKey, {
  auth: { persistSession: false },
});

/**
 * Set the auth token so RLS policies can identify the user.
 * Call this after login with the access token from the Edge Function.
 */
export async function setSupabaseSession(accessToken: string) {
  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: '',
  });
}
