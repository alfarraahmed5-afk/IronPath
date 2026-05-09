import * as Sentry from '@sentry/react';

export function initSentry(appName: 'admin' | 'console'): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || import.meta.env.MODE === 'development') {
    // No DSN in dev — keep noise low.
    return;
  }
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_ENV ?? import.meta.env.MODE,
    release: import.meta.env.VITE_COMMIT_SHA,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    initialScope: { tags: { app: appName } },
  });
}

export { Sentry };
