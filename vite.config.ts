import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// Names that look like secrets — if any of these slip into a VITE_-prefixed
// var by accident they'd be inlined into the public client bundle. We refuse
// to build in that case.
const SECRET_NEEDLES = [
  'SERVICE_ROLE',
  'PRIVATE_KEY',
  'SECRET_KEY',
  'PAYSTACK_SECRET',
  'FLUTTERWAVE_SECRET',
  'TWILIO_AUTH',
  'AFRICAS_TALKING',
  'RESEND_API',
  'WEBHOOK_SECRET',
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  // Guardrail: refuse to expose anything that looks sensitive
  const exposed = Object.keys(env);
  const leaks = exposed.filter((key) =>
    SECRET_NEEDLES.some((needle) => key.toUpperCase().includes(needle))
  );
  if (leaks.length > 0) {
    throw new Error(
      `\n\n[security] Refusing to build — these VITE_ env vars look like secrets ` +
      `and would be inlined into the public client bundle:\n` +
      leaks.map((k) => `  - ${k}`).join('\n') +
      `\n\nMove them to your Supabase Edge Function environment (no VITE_ prefix) ` +
      `and reference them server-side via Deno.env.get(...).\n`
    );
  }

  return {
    plugins: [react(), tailwindcss()],
    // Only VITE_-prefixed vars are exposed to client code (Vite default).
    // Do NOT widen this — the rest of process.env stays server-side.
    envPrefix: 'VITE_',
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
    },
    server: {
      port: 3000,
      open: true,
    },
  };
});
