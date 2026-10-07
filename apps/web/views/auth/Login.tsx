'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navigate } from '@/components/ui/Navigate';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { TextField } from '@/components/ui/FormField';
import { PasswordField } from '@/components/ui/PasswordField';
import { Button } from '@/components/ui/Button';
import { PrototypeNote } from '@/components/ui/PrototypeNote';
import { useAuth } from '@/contexts/AuthContext';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/data/seed';
import { isValidEmail } from '@/lib/utils/validation';

export function safeRedirect(value: string | null, fallback = '/account'): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}

export function Login() {
  const { user, login } = useAuth();
  const params = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'));
  const router = useRouter();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  if (user && !loading) return <Navigate to={redirect} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!isValidEmail(email)) errs.email = 'Please enter a valid email address.';
    if (!password) errs.password = 'Please enter your password.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    const res = await login(email, password, remember);
    setLoading(false);
    if (!res.ok) return setErrors({ form: res.error ?? 'Sign in failed.' });
    toast.success('Welcome back to LUXICHIC');
    router.replace(redirect);
  };

  return (
    <AuthLayout
      title={
        <>
          Welcome <span className="italic text-pink-deep">back</span>
        </>
      }
      text="Sign in to track orders, manage appointments and check out faster."
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <TextField
          id="login-email"
          type="email"
          label="Email address"
          autoComplete="email"
          value={email}
          error={errors.email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
          id="login-password"
          label="Password"
          value={password}
          onChange={setPassword}
          error={errors.password}
        />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-charcoal">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-ink"
            />{' '}
            Remember me
          </label>
          <Link href="/forgot-password" className="font-semibold text-pink-deep underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        </div>
        {errors.form && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
            {errors.form}
          </p>
        )}
        <Button type="submit" fullWidth size="lg" loading={loading}>
          Sign In
        </Button>
        <p className="text-center text-sm text-subtle">
          New to LUXICHIC?{' '}
          <Link
            href={`/register${params.get('redirect') ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
            className="font-semibold text-ink underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </form>
      <PrototypeNote title="Demo account" className="mt-8">
        <p>
          Email: <strong>{DEMO_EMAIL}</strong> · Password: <strong>{DEMO_PASSWORD}</strong>
        </p>
        <button
          type="button"
          className="mt-2 text-xs font-semibold text-pink-deep underline-offset-4 hover:underline"
          onClick={() => {
            setEmail(DEMO_EMAIL);
            setPassword(DEMO_PASSWORD);
          }}
        >
          Fill demo details
        </button>
      </PrototypeNote>
    </AuthLayout>
  );
}
