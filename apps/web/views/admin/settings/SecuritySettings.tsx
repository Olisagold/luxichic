'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { MonitorSmartphoneIcon } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useActor } from '@/hooks/useActor';
import { useDb } from '@/lib/mock-db/db';
import { updateSettings } from '@/lib/mock-db/settings';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminSelect } from '@/components/admin/ui/AdminField';
import { Toggle } from '@/components/admin/ui/Toggle';
import { PasswordField } from '@/components/ui/PasswordField';
import { formatDateTime } from '@/lib/utils/dates';
import { passwordError } from '@/lib/utils/validation';

export function SecuritySettings() {
  const { changePassword, can } = useAdminAuth();
  const actor = useActor();
  const security = useDb((s) => s.settings.security);
  const logins = useDb((s) => s.loginHistory);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const mine = actor.isOwner || can('admins.manage') ? logins : logins.filter((l) => l.adminId === actor.id);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!pw.current) errs.current = 'Enter your current password.';
    const pe = passwordError(pw.next);
    if (pe) errs.next = pe;
    else if (pw.next === pw.current) errs.next = 'Choose a password you haven’t used here.';
    if (pw.confirm !== pw.next) errs.confirm = 'Passwords don’t match.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const res = await changePassword(pw.current, pw.next);
    setSaving(false);
    if (!res.ok) return setErrors({ current: res.error ?? 'Could not change password.' });
    setPw({ current: '', next: '', confirm: '' });
    toast.success('Password changed');
  };

  const setSec = (patch: Partial<typeof security>, action: string) => {
    updateSettings(actor, 'security', { ...security, ...patch }, 'Security', action);
    toast.success('Saved');
  };

  return (
    <div>
      <PageHeader title="Security" description="Your password, sign-in alerts and recent logins." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Change password">
          <form onSubmit={submit} className="space-y-4">
            <PasswordField
              id="sec-cur"
              label="Current password"
              value={pw.current}
              error={errors.current}
              onChange={(v) => setPw({ ...pw, current: v })}
            />
            <PasswordField
              id="sec-new"
              label="New password"
              value={pw.next}
              error={errors.next}
              showStrength
              autoComplete="new-password"
              onChange={(v) => setPw({ ...pw, next: v })}
            />
            <PasswordField
              id="sec-conf"
              label="Confirm new password"
              value={pw.confirm}
              error={errors.confirm}
              autoComplete="new-password"
              onChange={(v) => setPw({ ...pw, confirm: v })}
            />
            <AdminButton type="submit" variant="primary" loading={saving}>
              Update password
            </AdminButton>
          </form>
        </Panel>

        {(actor.isOwner || can('settings.general')) && (
          <Panel title="Sign-in protection">
            <div className="space-y-4">
              <Toggle
                label="Email me when someone signs in"
                description="Sends a login alert with the date, time and device."
                checked={security.loginAlerts}
                onChange={(v) => setSec({ loginAlerts: v }, v ? 'Enabled login alerts' : 'Disabled login alerts')}
              />
              <AdminSelect
                id="sec-timeout"
                label="Sign out after inactivity"
                value={String(security.sessionTimeoutMinutes)}
                onChange={(e) => setSec({ sessionTimeoutMinutes: Number(e.target.value) }, 'Changed session timeout')}
                options={[
                  ['15', '15 minutes'],
                  ['30', '30 minutes'],
                  ['60', '1 hour'],
                  ['240', '4 hours'],
                  ['1440', '24 hours'],
                ].map(([value, label]) => ({ value, label }))}
              />

              <p className="rounded-lg bg-canvas px-3 py-2 text-xs text-subtle">
                Sessions, timeouts and alerts are enforced by the server in production.
              </p>
            </div>
          </Panel>
        )}

        <Panel title="Recent logins" bodyClassName="p-0" className="lg:col-span-2">
          {mine.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No logins recorded.</p>
          ) : (
            <ul className="divide-y divide-line">
              {mine.slice(0, 15).map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-5 py-3 text-[13px]">
                  <MonitorSmartphoneIcon className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-ink">
                      <span className="font-semibold">{l.adminName}</span> · {l.browser} on {l.device}
                    </p>
                    <p className="text-xs text-subtle">
                      {l.location} · {l.email}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-subtle">{formatDateTime(l.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
