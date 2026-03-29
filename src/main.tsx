import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.tsx'
import './styles/globals.css'

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
