'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2Icon, LinkIcon } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { PasswordField } from '@/components/ui/PasswordField';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { validatePassword } from '@/lib/utils/validation';

export function ResetPassword() {
  // The emailed link signs the customer in with a short-lived recovery session (see app/auth/callback).
  const { user, ready, resetPassword } = useAuth();
  const valid = !!user;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!ready) return <div className="min-h-[60vh]" aria-busy="true" />;

  if (!valid && !done) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24">
        <EmptyState
          icon={<LinkIcon className="h-7 w-7" />}
          title="This link is invalid or has expired"
          text="Password reset links expire after one hour. Please request a new one."
          actions={<Button to="/forgot-password">Request a new link</Button>}
        />
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const pw = validatePassword(password);
    if (pw) errs.password = pw;
    if (confirm !== password) errs.confirm = 'Passwords do not match.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    const res = await resetPassword(password);
    setLoading(false);
    if (!res.ok) return setErrors({ form: res.error ?? 'Something went wrong.' });
    setDone(true);
  };

  return (
    <AuthLayout title="Set a new password" text="Choose a strong password you haven’t used before.">
      {done ? (
        <div role="status" className="rounded-[24px] bg-white p-6">
          <CheckCircle2Icon className="h-8 w-8 text-emerald-600" aria-hidden />
          <p className="mt-4 font-display text-2xl text-ink">Password updated</p>
          <p className="mt-2 text-sm text-subtle">You are signed in with your new password.</p>
          <Button to="/account" className="mt-6">
            Go to My Account
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <PasswordField
            id="rp-password"
            label="New password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            showStrength
          />
          <PasswordField
            id="rp-confirm"
            label="Confirm new password"
            autoComplete="new-password"
            value={confirm}
            onChange={setConfirm}
            error={errors.confirm}
          />
          {errors.form && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
              {errors.form}
            </p>
          )}
          <Button type="submit" fullWidth size="lg" loading={loading}>
            Update Password
          </Button>
          <p className="text-center text-sm">
            <Link href="/login" className="font-semibold text-ink underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
