'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { BanIcon, CalendarOffIcon, TrashIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAdminSalon } from '@/components/admin/AdminSalonProvider';
import { addBlock, removeBlock } from '@/lib/salon/admin-actions';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { AdminInput, AdminSelect } from '@/components/admin/ui/AdminField';
import { Toggle } from '@/components/admin/ui/Toggle';
import { formatLongDate, formatSlot, toISODate } from '@/lib/utils/dates';

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function Availability() {
  const router = useRouter();
  const salon = useAdminSalon();
  const blocks = salon.blocks;
  const services = salon.services.filter((x) => x.status !== 'archived');
  const specialists = salon.specialists.filter((x) => x.status !== 'archived');
  // Opening hours per weekday, from the active specialists' working hours.
  const opening = weekdays.map((_, day) => {
    const working = specialists.filter((sp) => sp.status === 'active' && sp.workingDays.includes(day));
    if (!working.length) return null;
    const start = working.map((sp) => sp.hours.start).sort()[0];
    const end = working
      .map((sp) => sp.hours.end)
      .sort()
      .at(-1)!;
    return { start, end };
  });
  const hourOptions = Array.from({ length: 15 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`);
  const today = toISODate(new Date());
  const [form, setForm] = useState({
    date: today,
    allDay: true,
    start: '09:00',
    end: '12:00',
    serviceSlug: '',
    specialistId: '',
    reason: '',
  });
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date) return setError('Choose a date.');
    if (form.date < today) return setError('Choose today or a future date.');
    if (!form.allDay && form.end <= form.start) return setError('End time must be after start time.');
    setError('');
    const res = await addBlock({
      date: form.date,
      start: form.allDay ? null : form.start,
      end: form.allDay ? null : form.end,
      serviceSlug: form.serviceSlug || null,
      specialistId: form.specialistId || null,
      reason: form.reason.trim() || 'Unavailable',
    }).catch(() => null);
    if (!res?.ok) return setError(res?.error ?? 'Could not block that time.');
    toast.success('Time blocked', { description: 'Customers can no longer book it.' });
    setForm({ ...form, reason: '' });
    router.refresh();
  };

  // Upcoming only (the page loads today onwards).
  const list = [...blocks].sort((a, b) => `${a.date}${a.start ?? ''}`.localeCompare(`${b.date}${b.start ?? ''}`));
  const name = (slug: string | null) => (slug ? (services.find((s) => s.slug === slug)?.name ?? slug) : 'All services');
  const spName = (id: string | null) =>
    id ? (specialists.find((s) => s.id === id)?.name ?? 'Specialist') : 'Any specialist';

  return (
    <div>
      <PageHeader
        title="Availability"
        description="Block dates and times for holidays, training or a specialist’s day off. You can also block single slots from the calendar."
      />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel title="Block time">
            <form onSubmit={submit} className="space-y-4">
              <AdminInput
                id="av-date"
                type="date"
                label="Date"
                min={today}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              <Toggle label="Entire day" checked={form.allDay} onChange={(v) => setForm({ ...form, allDay: v })} />
              {!form.allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <AdminSelect
                    id="av-start"
                    label="From"
                    value={form.start}
                    onChange={(e) => setForm({ ...form, start: e.target.value })}
                    options={hourOptions.map((t) => ({ value: t, label: formatSlot(t) }))}
                  />
                  <AdminInput
                    id="av-end"
                    type="time"
                    label="Until"
                    value={form.end}
                    onChange={(e) => setForm({ ...form, end: e.target.value })}
                  />
                </div>
              )}
              <AdminSelect
                id="av-svc"
                label="Service"
                value={form.serviceSlug}
                onChange={(e) => setForm({ ...form, serviceSlug: e.target.value })}
                options={[
                  { value: '', label: 'All services' },
                  ...services.map((s) => ({ value: s.slug, label: s.name })),
                ]}
              />
              <AdminSelect
                id="av-sp"
                label="Specialist"
                value={form.specialistId}
                onChange={(e) => setForm({ ...form, specialistId: e.target.value })}
                options={[
                  { value: '', label: 'Whole salon' },
                  ...specialists.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
              <AdminInput
                id="av-reason"
                label="Reason"
                optional
                value={form.reason}
                placeholder="e.g. Public holiday"
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
              {error && (
                <p className="text-xs text-red-700" role="alert">
                  {error}
                </p>
              )}
              <AdminButton type="submit" variant="primary" icon={<BanIcon className="h-4 w-4" />} className="w-full">
                Block this time
              </AdminButton>
            </form>
          </Panel>
          <Panel title="Opening hours">
            <ul className="space-y-1 text-[13px]">
              {weekdays.map((d, i) => (
                <li key={d} className="flex justify-between">
                  <span className="text-charcoal">{d}</span>
                  <span className={opening[i] ? 'font-medium text-ink' : 'text-subtle'}>
                    {opening[i] ? `${formatSlot(opening[i].start)} – ${formatSlot(opening[i].end)}` : 'Closed'}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel title={`Blocked times (${list.length})`} bodyClassName="p-0">
          {list.length === 0 ? (
            <AdminEmpty
              icon={<CalendarOffIcon className="h-5 w-5" />}
              title="Nothing blocked"
              text="All open slots can be booked."
            />
          ) : (
            <ul className="divide-y divide-line">
              {list.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-5 py-3 text-[13px]">
                  <div className="w-36 shrink-0">
                    <p className="font-semibold text-ink">{formatLongDate(b.date)}</p>
                    <p className="text-xs text-subtle">
                      {b.start ? `${formatSlot(b.start)}${b.end ? ` – ${formatSlot(b.end)}` : ''}` : 'Entire day'}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-ink">
                      {name(b.serviceSlug)} · {spName(b.specialistId)}
                    </p>
                    <p className="truncate text-xs text-subtle">
                      {b.reason} · by {b.createdBy}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      const res = await removeBlock(b.id).catch(() => null);
                      if (!res?.ok) return toast.error(res?.error ?? 'Could not reopen that time.');
                      toast.success('Time reopened');
                      router.refresh();
                    }}
                    className="rounded-md p-1.5 text-subtle hover:bg-red-50 hover:text-red-700"
                    aria-label="Remove block"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
