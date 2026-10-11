import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';
// Fail the build / dev server early if environment variables are invalid.
import './lib/env';

const nextConfig: NextConfig = {
  // Images are resized once, on upload, to the widths in lib/media/urls.ts. The loader picks one of those, so
  // nothing is resized per request (no Vercel or Supabase image transformations).
  images: {
    loader: 'custom',
    loaderFile: './lib/media/loader.ts',
    imageSizes: [300],
    deviceSizes: [600, 1200, 1920],
  },
};

// Source maps upload only when SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT are set (Vercel builds).
export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  widenClientFileUpload: true,
  telemetry: false,
});
