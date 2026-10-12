'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { PencilIcon, PlusIcon, UserRoundIcon } from 'lucide-react';
import type { Specialist } from '@/types/admin';
import { useRouter } from 'next/navigation';
import { useAdminSalon } from '@/components/admin/AdminSalonProvider';
import { deleteSpecialist, saveSpecialist } from '@/lib/salon/admin-actions';
import { uploadAdminImage } from '@/lib/media/upload-client';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { AdminInput, AdminSelect, AdminTextarea } from '@/components/admin/ui/AdminField';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { generateId } from '@/lib/utils/references';
import { toISODate } from '@/lib/utils/dates';
import { cn } from '@/lib/utils/cn';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const statusLabel = { active: 'Active', 'on-leave': 'On Leave', archived: 'Archived' } as const;
const blank = (): Specialist => ({
  id: '',
  name: '',
  title: '',
  image: '',
  bio: '',
  specialties: [],
  serviceSlugs: [],
  workingDays: [1, 2, 3, 4, 5, 6],
  hours: { start: '09:00', end: '18:00' },
  status: 'active',
});

export function Specialists() {
  const { specialists, services, appointments } = useAdminSalon();
  const router = useRouter();
  const [editing, setEditing] = useState<Specialist | null>(null);
  const [removing, setRemoving] = useState<Specialist | null>(null);
  const today = toISODate(new Date());

  return (
    <div>
      <PageHeader
        title="Specialists"
        description="Your salon team. Customers can choose a specialist when booking; those on leave can’t be selected."
        actions={
          <AdminButton variant="primary" icon={<PlusIcon className="h-4 w-4" />} onClick={() => setEditing(blank())}>
            Add specialist
          </AdminButton>
        }
      />

      {specialists.length === 0 ? (
        <div className="rounded-xl border border-line bg-white">
          <AdminEmpty icon={<UserRoundIcon className="h-5 w-5" />} title="No specialists yet" />
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white">
          {specialists.map((sp) => {
            const upcoming = appointments.filter(
              (a) =>
                a.personnelId === sp.id &&
                a.date >= today &&
                ['Pending', 'Confirmed', 'Rescheduled'].includes(a.status),
            ).length;
            return (
              <li
                key={sp.id}
                className={cn(
                  'flex flex-wrap items-center gap-4 px-4 py-3 sm:flex-nowrap',
                  sp.status === 'archived' && 'opacity-60',
                )}
              >
                {sp.image ? (
                  <img src={sp.image} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-canvas">
                    <UserRoundIcon className="h-5 w-5 text-subtle" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    {sp.name} <StatusBadge status={statusLabel[sp.status]} />
                  </p>
                  <p className="truncate text-xs text-subtle">
                    {sp.title} ·{' '}
                    {sp.serviceSlugs
                      .map((slug) => services.find((s) => s.slug === slug)?.name)
                      .filter(Boolean)
                      .join(', ') || 'No services'}
                  </p>
                </div>
                <div className="hidden text-right text-xs text-subtle md:block">
                  <p className="font-medium text-ink">
                    {sp.workingDays
                      .slice()
                      .sort()
                      .map((d) => days[d])
                      .join(' · ')}
                  </p>
                  <p>
                    {sp.hours.start}–{sp.hours.end} · {upcoming} upcoming
                  </p>
                </div>
                <AdminButton size="sm" icon={<PencilIcon className="h-3.5 w-3.5" />} onClick={() => setEditing(sp)}>
                  Edit
                </AdminButton>
              </li>
            );
          })}
        </ul>
      )}

      <SpecialistDialog
        key={editing?.id || (editing ? 'new' : 'closed')}
        specialist={editing}
        onClose={() => setEditing(null)}
        onDelete={
          editing?.id
            ? () => {
                setRemoving(editing);
                setEditing(null);
              }
            : undefined
        }
        onSave={async (sp) => {
          const res = await saveSpecialist(sp).catch(() => null);
          if (!res?.ok) return res?.error ?? 'Could not save the specialist.';
          toast.success('Specialist saved');
          setEditing(null);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          const res = await deleteSpecialist(removing.id).catch(() => null);
          setRemoving(null);
          if (!res?.ok) return toast.error(res?.error ?? 'Could not remove the specialist.');
          toast.success('Specialist removed');
          router.refresh();
        }}
        title={`Remove ${removing?.name}?`}
        tone="danger"
        confirmLabel="Remove"
        message="Existing appointments keep their specialist name. Set them as archived instead to keep their history visible here."
      />
    </div>
  );
}

function SpecialistDialog({
  specialist,
  onClose,
  onSave,
  onDelete,
}: {
  specialist: Specialist | null;
  onClose: () => void;
  /** Saves; resolves to an error message if it couldn't. */
  onSave: (s: Specialist) => Promise<string | void>;
  onDelete?: () => void;
}) {
  const services = useAdminSalon().services.filter((x) => x.status !== 'archived');
  const [saving, setSaving] = useState(false);
  const [sp, setSp] = useState<Specialist>(specialist ?? blank());
  const [specialties, setSpecialties] = useState((specialist?.specialties ?? []).join(', '));
  const [error, setError] = useState('');
  const set = (patch: Partial<Specialist>) => setSp((x) => ({ ...x, ...patch }));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sp.name.trim() || !sp.title.trim()) return setError('Enter a name and title.');
    if (sp.hours.end <= sp.hours.start) return setError('Finish time must be after start time.');
    setSaving(true);
    // New specialists get their id from the server.
    const failed = await onSave({
      ...sp,
      id: sp.id || generateId('sp'),
      name: sp.name.trim(),
      specialties: specialties
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    });
    setSaving(false);
    if (failed) setError(failed);
  };

  return (
    <Modal
      open={!!specialist}
      onClose={onClose}
      title={specialist?.id ? 'Edit specialist' : 'Add specialist'}
      className="max-w-xl rounded-2xl"
    >
      <form onSubmit={submit} className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          {sp.image ? (
            <img src={sp.image} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <span className="h-14 w-14 rounded-full bg-canvas" />
          )}
          <label className="cursor-pointer rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-ink/40">
            Upload photo
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f)
                  try {
                    set({ image: await uploadAdminImage(f, 'salon', 'salon') });
                  } catch {
                    toast.error('Could not read image');
                  }
              }}
            />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AdminInput id="sp-name" label="Name" value={sp.name} onChange={(e) => set({ name: e.target.value })} />
          <AdminInput
            id="sp-title"
            label="Title"
            value={sp.title}
            placeholder="e.g. Senior Nail Technician"
            onChange={(e) => set({ title: e.target.value })}
          />
        </div>
        <AdminTextarea
          id="sp-bio"
          label="Bio"
          optional
          value={sp.bio}
          onChange={(e) => set({ bio: e.target.value })}
          className="min-h-[64px]"
        />
        <AdminInput
          id="sp-spec"
          label="Specialties"
          optional
          value={specialties}
          onChange={(e) => setSpecialties(e.target.value)}
          hint="Separate with commas."
        />
        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold text-charcoal">Services</legend>
          <div className="flex flex-wrap gap-1.5">
            {services.map((s) => (
              <button
                key={s.slug}
                type="button"
                aria-pressed={sp.serviceSlugs.includes(s.slug)}
                onClick={() => set({ serviceSlugs: toggle(sp.serviceSlugs, s.slug) })}
                className={cn(
                  'h-7 rounded-md border px-2.5 text-xs font-medium',
                  sp.serviceSlugs.includes(s.slug)
                    ? 'border-ink bg-ink text-white'
                    : 'border-line text-charcoal hover:border-ink/40',
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold text-charcoal">Working days</legend>
          <div className="flex gap-1.5">
            {days.map((d, i) => (
              <button
                key={d}
                type="button"
                aria-pressed={sp.workingDays.includes(i)}
                onClick={() => set({ workingDays: toggle(sp.workingDays, i) })}
                className={cn(
                  'h-8 w-11 rounded-md border text-xs font-semibold',
                  sp.workingDays.includes(i)
                    ? 'border-ink bg-ink text-white'
                    : 'border-line text-charcoal hover:border-ink/40',
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <AdminInput
            id="sp-start"
            type="time"
            label="Starts"
            value={sp.hours.start}
            onChange={(e) => set({ hours: { ...sp.hours, start: e.target.value } })}
          />
          <AdminInput
            id="sp-end"
            type="time"
            label="Finishes"
            value={sp.hours.end}
            onChange={(e) => set({ hours: { ...sp.hours, end: e.target.value } })}
          />
          <AdminSelect
            id="sp-status"
            label="Status"
            value={sp.status}
            onChange={(e) => set({ status: e.target.value as Specialist['status'] })}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'on-leave', label: 'On leave' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        </div>
        {error && (
          <p className="text-xs text-red-700" role="alert">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          {onDelete ? (
            <AdminButton variant="dangerGhost" onClick={onDelete}>
              Remove
            </AdminButton>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <AdminButton variant="ghost" onClick={onClose}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" variant="primary" loading={saving}>
              Save
            </AdminButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}
