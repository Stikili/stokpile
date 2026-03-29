// Supabase project configuration
// Set these in your .env file (see .env.example)

export const projectId: string = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? '';
export const publicAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigMissing = !projectId || !publicAnonKey;
