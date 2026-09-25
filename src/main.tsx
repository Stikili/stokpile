import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
// Design kit v2 type: Archivo (display, variable width), Public Sans (body),
// IBM Plex Mono (labels and every figure). Self-hosted, no Google Fonts.
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource/public-sans/400.css'
import '@fontsource/public-sans/500.css'
import '@fontsource/public-sans/600.css'
import '@fontsource/public-sans/700.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import App from './App.tsx'
// Order matters: tokens → components → app (Tailwind + shadcn mapping)
import './styles/tokens.css'
import './styles/components.css'
import './styles/globals.css'
import { supabaseConfigMissing } from './infrastructure/supabase/config'

// Initialise Sentry — only when DSN is configured (set VITE_SENTRY_DSN in production)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,
    tracesSampleRate: 0.2,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.browserTracingIntegration()],
  });
}

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(event.reason);
  }
  if (import.meta.env.DEV) {
    console.error('Unhandled promise rejection:', event.reason);
  }
});

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed, silently continue
    });
  });
}

if (supabaseConfigMissing) {
  document.getElementById('root')!.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;padding:2rem;text-align:center;">
      <h1 style="font-size:1.5rem;font-weight:700;margin-bottom:1rem;">Configuration Error</h1>
      <p style="color:#555;max-width:480px;">Supabase environment variables are missing. Set <code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code>, and <code>VITE_SUPABASE_PROJECT_ID</code> in your deployment environment.</p>
    </div>`;
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
