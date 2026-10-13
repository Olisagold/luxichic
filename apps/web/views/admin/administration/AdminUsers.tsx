'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { KeyRoundIcon, PencilIcon, ShieldCheckIcon, TrashIcon, UserPlusIcon } from 'lucide-react';
import type { AdminUser, Permission } from '@/types/admin';
import { useActor } from '@/hooks/useActor';
import { useRouter } from 'next/navigation';
import { useAdminTeam } from '@/components/admin/AdminTeamProvider';
import { createAdmin, deleteAdmin, resetAdminPassword, updateAdmin } from '@/lib/admins/admin-actions';
import { rolePresets } from '@/data/adminSeed';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminInput, AdminSelect } from '@/components/admin/ui/AdminField';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { PermissionMatrix } from '@/components/admin/PermissionMatrix';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatDateTime } from '@/lib/utils/dates';
import { initials } from '@/lib/utils/text';
import { isValidEmail, passwordError } from '@/lib/utils/validation';

const roles: AdminUser['role'][] = [
  'Super Admin',
  'Order Manager',
  'Product Manager',
  'Salon Manager',
  'Content Manager',
  'Customer Support',
  'Custom',
];

export function AdminUsers() {
  const actor = useActor();
  const router = useRouter();
  const { admins } = useAdminTeam();
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null);
  const [resetting, setResetting] = useState<AdminUser | null>(null);
  const [removing, setRemoving] = useState<AdminUser | null>(null);

  return (
    <div>
      <PageHeader
        title="Admin users"
        description="Create accounts for your team and choose exactly what each person can do. Only the main administrator can’t be edited or removed."
        actions={
          <AdminButton variant="primary" icon={<UserPlusIcon className="h-4 w-4" />} onClick={() => setEditing('new')}>
            Add admin
          </AdminButton>
        }
      />

      <ul className="divide-y divide-line rounded-xl border border-line bg-white">
        {admins.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
              {initials(a.fullName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink">
                {a.fullName}
                {a.isOwner && (
                  <span className="inline-flex items-center gap-1 rounded bg-pink/20 px-1.5 py-0.5 text-[10px] font-bold text-ink">
                    <ShieldCheckIcon className="h-3 w-3" aria-hidden />
                    Main admin
                  </span>
                )}
                {a.id === actor.id && <span className="text-[11px] font-normal text-subtle">(you)</span>}
              </p>
              <p className="truncate text-xs text-subtle">
                {a.email} · {a.role} · {a.isOwner ? 'All permissions' : `${a.permissions.length} permissions`}
              </p>
            </div>
            <div className="hidden text-right text-xs text-subtle md:block">
              <p>{a.lastLoginAt ? `Last login ${formatDateTime(a.lastLoginAt)}` : 'Never logged in'}</p>
              <p>Added {formatDate(a.createdAt)}</p>
            </div>
            <StatusBadge status={a.status === 'active' ? 'Active' : 'Suspended'} />
            {!a.isOwner && (
              <div className="flex gap-1">
                <button
                  onClick={() => setEditing(a)}
                  className="rounded-md p-1.5 text-subtle hover:bg-canvas hover:text-ink"
                  aria-label={`Edit ${a.fullName}`}
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setResetting(a)}
                  className="rounded-md p-1.5 text-subtle hover:bg-canvas hover:text-ink"
                  aria-label={`Reset password for ${a.fullName}`}
                >
                  <KeyRoundIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setRemoving(a)}
                  className="rounded-md p-1.5 text-subtle hover:bg-red-50 hover:text-red-700"
                  aria-label={`Delete ${a.fullName}`}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <AdminDialog
        key={editing === 'new' ? 'new' : (editing?.id ?? 'closed')}
        editing={editing}
        onClose={() => setEditing(null)}
      />
      <ResetPasswordDialog
        admin={resetting}
        onClose={() => setResetting(null)}
        onDone={async (pw) => {
          if (!resetting) return;
          const res = await resetAdminPassword(resetting.id, pw).catch(() => null);
          if (!res?.ok) return toast.error(res?.error ?? 'Could not reset the password.');
          toast.success('Password reset', {
            description: 'Share it with them securely. They should change it after signing in.',
          });
          setResetting(null);
        }}
      />
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          const res = await deleteAdmin(removing.id).catch(() => null);
          setRemoving(null);
          if (!res?.ok) return toast.error(res?.error ?? 'Could not remove the admin.');
          toast.success('Admin removed');
          router.refresh();
        }}
        title={`Remove ${removing?.fullName}?`}
        tone="danger"
        confirmLabel="Remove admin"
        message="They’ll be signed out and can no longer access the dashboard. Their past actions stay in the activity log. Suspend instead if it’s temporary."
      />
    </div>
  );
}

function AdminDialog({ editing, onClose }: { editing: AdminUser | 'new' | null; onClose: () => void }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const isNew = editing === 'new';
  const base = editing && editing !== 'new' ? editing : null;
  const [form, setForm] = useState({
    fullName: base?.fullName ?? '',
    email: base?.email ?? '',
    username: base?.username ?? '',
    password: '',
    role: base?.role ?? ('Order Manager' as AdminUser['role']),
    status: base?.status ?? ('active' as AdminUser['status']),
    permissions: base?.permissions ?? rolePresets['Order Manager'],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setRole = (role: AdminUser['role']) =>
    setForm((f) => ({ ...f, role, permissions: role === 'Custom' ? f.permissions : rolePresets[role] }));
  const setPerms = (permissions: Permission[]) => setForm((f) => ({ ...f, permissions, role: 'Custom' }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = 'Enter their name.';
    if (!isValidEmail(form.email)) errs.email = 'Enter a valid email.';
    if (isNew) {
      const pe = passwordError(form.password);
      if (pe) errs.password = pe;
    }
    if (!form.permissions.length) errs.permissions = 'Choose at least one permission.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    if (isNew) {
      const res = await createAdmin({ ...form, fullName: form.fullName.trim(), email: form.email.trim() }).catch(
        () => null,
      );
      setSaving(false);
      if (!res?.ok) return setErrors({ form: res?.error ?? 'Could not create admin.' });
      toast.success('Admin created', {
        description: `${form.fullName} can now sign in at /admin/login with the temporary password.`,
      });
    } else if (base) {
      const res = await updateAdmin(base.id, {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        username: form.username || undefined,
        role: form.role,
        status: form.status,
        permissions: form.permissions,
      }).catch(() => null);
      setSaving(false);
      if (!res?.ok) return setErrors({ form: res?.error ?? 'Could not save the admin.' });
      toast.success('Admin updated');
    }
    onClose();
    router.refresh();
  };

  return (
    <Modal
      open={!!editing}
      onClose={onClose}
      title={isNew ? 'Add admin' : `Edit ${base?.fullName}`}
      className="max-w-3xl rounded-2xl"
    >
      <form onSubmit={submit} className="space-y-5 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AdminInput
            id="au-name"
            label="Full name"
            value={form.fullName}
            error={errors.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
          <AdminInput
            id="au-email"
            type="email"
            label="Email"
            value={form.email}
            error={errors.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <AdminInput
            id="au-user"
            label="Username"
            optional
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          {isNew && (
            <AdminInput
              id="au-pass"
              type="password"
              autoComplete="new-password"
              label="Temporary password"
              value={form.password}
              error={errors.password}
              hint="At least 8 characters with a number."
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          )}
          <AdminSelect
            id="au-role"
            label="Role"
            value={form.role}
            onChange={(e) => setRole(e.target.value as AdminUser['role'])}
            options={roles.map((r) => ({ value: r, label: r }))}
            hint="Choosing a role fills in its permissions. Adjust below."
          />
          <AdminSelect
            id="au-status"
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as AdminUser['status'] })}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'suspended', label: 'Suspended' },
            ]}
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-charcoal">Permissions ({form.permissions.length})</p>
          {errors.permissions && <p className="mb-2 text-xs text-red-700">{errors.permissions}</p>}
          <PermissionMatrix value={form.permissions} onChange={setPerms} />
        </div>
        {errors.form && (
          <p className="text-xs text-red-700" role="alert">
            {errors.form}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <AdminButton variant="ghost" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" variant="primary" loading={saving}>
            {isNew ? 'Create admin' : 'Save changes'}
          </AdminButton>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordDialog({
  admin,
  onClose,
  onDone,
}: {
  admin: AdminUser | null;
  onClose: () => void;
  onDone: (pw: string) => void | Promise<unknown>;
}) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  return (
    <Modal
      open={!!admin}
      onClose={onClose}
      title={`Reset password for ${admin?.fullName ?? ''}`}
      className="max-w-md rounded-2xl"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const er = passwordError(pw);
          if (er) return setError(er);
          onDone(pw);
          setPw('');
        }}
        className="space-y-4 p-5"
      >
        <AdminInput
          id="rp-pw"
          type="password"
          autoComplete="new-password"
          label="New temporary password"
          value={pw}
          error={error}
          onChange={(e) => setPw(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <AdminButton variant="ghost" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" variant="primary">
            Reset password
          </AdminButton>
        </div>
      </form>
    </Modal>
  );
}
