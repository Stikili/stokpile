// Supabase project configuration
// Set these in your .env file (see .env.example)

export const projectId: string = import.meta.env.VITE_SUPABASE_PROJECT_ID;
export const publicAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!projectId || !publicAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy .env.example to .env and fill in your project credentials.'
  );
}
