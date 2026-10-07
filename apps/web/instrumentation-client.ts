import * as Sentry from '@sentry/nextjs';
import { env } from '@/lib/env';

// Without a DSN (local dev, CI) Sentry stays disabled.
Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
