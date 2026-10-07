'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="font-display text-4xl text-ink">Something went wrong</h1>
      <p className="mt-3 text-subtle">Please try again. If it keeps happening, contact LUXICHIC.</p>
      <button
        onClick={reset}
        className="mt-6 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-charcoal"
      >
        Try again
      </button>
    </div>
  );
}
