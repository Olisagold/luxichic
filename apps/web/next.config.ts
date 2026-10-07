import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';
// Fail the build / dev server early if environment variables are invalid.
import './lib/env';

const nextConfig: NextConfig = {};

// Source maps upload only when SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT are set (Vercel builds).
export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  widenClientFileUpload: true,
  telemetry: false,
});
