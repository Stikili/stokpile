// Lightweight analytics + error reporting wrapper.
// - Plausible (privacy-friendly, no cookies, GDPR-friendly)
// - Sentry (error monitoring) — only initialised if VITE_SENTRY_DSN is set
//
// Both are loaded lazily so they don't slow down initial render.

interface PlausibleWindow extends Window {
  plausible?: (event: string, opts?: { props?: Record<string, string | number> }) => void;
}

declare const window: PlausibleWindow;

let initialised = false;

export function initAnalytics() {
  if (initialised || typeof window === 'undefined') return;
  initialised = true;

  const plausibleDomain = (import.meta as any).env?.VITE_PLAUSIBLE_DOMAIN;
  if (plausibleDomain) {
    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://plausible.io/js/script.js';
    script.setAttribute('data-domain', plausibleDomain);
    document.head.appendChild(script);
  }

  const sentryDsn = (import.meta as any).env?.VITE_SENTRY_DSN;
  if (sentryDsn) {
    // Lazy-import so the bundle stays small for users who don't need Sentry
    import('@sentry/browser')
      .then((Sentry) => {
        Sentry.init({
          dsn: sentryDsn,
          tracesSampleRate: 0.1,
          environment: (import.meta as any).env?.MODE || 'production',
        });
      })
      .catch(() => {
        // Sentry not installed — silently skip
      });
  }
}

// Track a custom event (Plausible). No-op if Plausible isn't loaded.
export function track(event: string, props?: Record<string, string | number>) {
  if (typeof window === 'undefined' || !window.plausible) return;
  window.plausible(event, props ? { props } : undefined);
}

// Report an error to Sentry. No-op if Sentry isn't loaded.
export function reportError(error: unknown, context?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  // @ts-ignore — Sentry global may or may not exist
  if (window.Sentry?.captureException) {
    // @ts-ignore
    window.Sentry.captureException(error, { extra: context });
  } else {
    // eslint-disable-next-line no-console
    console.error('[reportError]', error, context);
  }
}
