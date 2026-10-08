'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { TextField } from '@/components/ui/FormField';
import { PasswordField } from '@/components/ui/PasswordField';
import { Button } from '@/components/ui/Button';
import { isValidEmail, isValidPhone, validatePassword } from '@/lib/utils/validation';

export function AccountProfile() {
  const { user, updateProfile, changePassword } = useAuth();
  const [profile, setProfile] = useState({
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  });
  const [pErrors, setPErrors] = useState<Record<string, string>>({});
  const [pSaving, setPSaving] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [wErrors, setWErrors] = useState<Record<string, string>>({});
  const [wSaving, setWSaving] = useState(false);
  if (!user) return null;

  const emailChanged = profile.email.trim().toLowerCase() !== user.email.toLowerCase();

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (profile.fullName.trim().length < 2) errs.fullName = 'Please enter your full name.';
    if (!isValidEmail(profile.email)) errs.email = 'Please enter a valid email address.';
    if (!isValidPhone(profile.phone)) errs.phone = 'Please enter a valid phone number.';
    setPErrors(errs);
    if (Object.keys(errs).length) return;
    setPSaving(true);
    const res = await updateProfile(profile);
    setPSaving(false);
    if (!res.ok) return setPErrors({ form: res.error ?? 'Could not save.' });
    toast.success(
      'Profile updated',
      res.emailPending
        ? {
            description: `We sent a confirmation link to ${profile.email.trim()}. Your email changes once you open it.`,
            duration: 10000,
          }
        : undefined,
    );
    // Until it's confirmed, the account keeps the current email.
    if (res.emailPending) setProfile((p) => ({ ...p, email: user.email }));
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!pw.current) errs.current = 'Please enter your current password.';
    const v = validatePassword(pw.next);
    if (v) errs.next = v;
    if (pw.confirm !== pw.next) errs.confirm = 'Passwords do not match.';
    setWErrors(errs);
    if (Object.keys(errs).length) return;
    setWSaving(true);
    const res = await changePassword(pw.current, pw.next);
    setWSaving(false);
    if (!res.ok) return setWErrors({ current: res.error ?? 'Could not update password.' });
    setPw({ current: '', next: '', confirm: '' });
    toast.success('Password changed');
  };

  return (
    <div className="space-y-8">
      <h1 className="font-display text-5xl text-ink">Profile settings</h1>
      <form onSubmit={saveProfile} noValidate className="space-y-5 rounded-[24px] bg-white p-6 md:p-8">
        <h2 className="font-display text-2xl text-ink">Personal details</h2>
        <TextField
          id="pf-name"
          label="Full name"
          value={profile.fullName}
          error={pErrors.fullName}
          onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField
            id="pf-email"
            type="email"
            label="Email address"
            value={profile.email}
            error={pErrors.email}
            hint={emailChanged ? 'You’ll need to verify a new email address.' : undefined}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
          />
          <TextField
            id="pf-phone"
            type="tel"
            label="Phone number"
            value={profile.phone}
            error={pErrors.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
        </div>
        {pErrors.form && (
          <p className="text-sm text-red-700" role="alert">
            {pErrors.form}
          </p>
        )}
        <Button type="submit" loading={pSaving}>
          Save changes
        </Button>
      </form>

      <form onSubmit={savePassword} noValidate className="space-y-5 rounded-[24px] bg-white p-6 md:p-8">
        <h2 className="font-display text-2xl text-ink">Change password</h2>
        <PasswordField
          id="pw-current"
          label="Current password"
          value={pw.current}
          onChange={(v) => setPw({ ...pw, current: v })}
          error={wErrors.current}
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <PasswordField
            id="pw-next"
            label="New password"
            autoComplete="new-password"
            value={pw.next}
            onChange={(v) => setPw({ ...pw, next: v })}
            error={wErrors.next}
            showStrength
          />
          <PasswordField
            id="pw-confirm"
            label="Confirm new password"
            autoComplete="new-password"
            value={pw.confirm}
            onChange={(v) => setPw({ ...pw, confirm: v })}
            error={wErrors.confirm}
          />
        </div>
        <Button type="submit" variant="outline" loading={wSaving}>
          Update password
        </Button>
      </form>
    </div>
  );
}
