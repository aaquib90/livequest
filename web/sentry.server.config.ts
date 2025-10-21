import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  tracesSampleRate: 0.1,
  _experiments: { enableLogs: true },
  integrations: [Sentry.consoleLoggingIntegration({ levels: ['error'] })],
});


