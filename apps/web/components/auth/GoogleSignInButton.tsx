'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { env, isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/client';

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29V6.6H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l4.01-3.11z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.6l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77z"
      />
    </svg>
  );
}

/** Whether Google is switched on in this Supabase project (its public Auth settings). */
async function googleEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
    });
    if (!res.ok) return true; // Can't tell; let Supabase decide.
    const settings = (await res.json()) as { external?: Record<string, boolean> };
    return settings.external?.google === true;
  } catch {
    return true;
  }
}

/** Customer sign-in with Google. Supabase redirects back to /auth/callback, which finishes the sign-in. */
export function GoogleSignInButton({ next = '/account' }: { next?: string }) {
  const [loading, setLoading] = useState(false);

  const unavailable = () => {
    setLoading(false);
    toast.error('Google sign-in is not available right now. Please use your email and password.');
  };

  const start = async () => {
    if (!isSupabaseConfigured) return unavailable();
    setLoading(true);
    // Supabase only reports a disabled provider after redirecting, on a bare error page, so ask first.
    if (!(await googleEnabled())) return unavailable();
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    // On success the browser is already leaving for Google.
    if (error) unavailable();
  };

  return (
    <Button variant="outline" fullWidth size="lg" loading={loading} onClick={start}>
      {!loading && <GoogleMark />} Continue with Google
    </Button>
  );
}

/** "or" separator between Google and the email form. */
export function AuthDivider() {
  return (
    <div className="flex items-center gap-4 text-xs text-subtle" aria-hidden>
      <span className="h-px flex-1 bg-line" />
      or
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
