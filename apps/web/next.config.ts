import type { NextConfig } from 'next';
// Fail the build / dev server early if environment variables are invalid.
import './lib/env';

const nextConfig: NextConfig = {
  // Fixed when the build runs and compiled into the code, so the build and every request it serves share one
  // data-cache scope, and the next build starts fresh (lib/cache-scope.ts).
  env: { LUXICHIC_BUILD_STAMP: Date.now().toString(36) },
  // Images are resized once, on upload, to the widths in lib/media/urls.ts. The loader picks one of those, so
  // nothing is resized per request (no Vercel or Supabase image transformations).
  images: {
    loader: 'custom',
    loaderFile: './lib/media/loader.ts',
    imageSizes: [300],
    deviceSizes: [600, 1200, 1920],
  },
  // Review photos are shrunk in the browser first (lib/media/shrink.ts); this leaves room for one.
  experimental: { serverActions: { bodySizeLimit: '3mb' } },
};

export default nextConfig;
