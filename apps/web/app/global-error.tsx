'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import './globals.css';

/** Last-resort error screen when the root layout itself fails. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-ivory px-5 text-center">
        <div>
          <h1 className="font-display text-4xl text-ink">Something went wrong</h1>
          <p className="mt-3 text-subtle">Please try again. If it keeps happening, contact LUXICHIC.</p>
          <button onClick={reset} className="mt-6 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white">
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
