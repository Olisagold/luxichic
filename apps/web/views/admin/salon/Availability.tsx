'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { BanIcon, CalendarOffIcon, TrashIcon } from 'lucide-react';
import { useActor } from '@/hooks/useActor';
import { useDb } from '@/lib/mock-db/db';
import { addBlock, removeBlock } from '@/lib/mock-db/salon';
import { businessConfig } from '@/data/config';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { AdminInput, AdminSelect } from '@/components/admin/ui/AdminField';
import { Toggle } from '@/components/admin/ui/Toggle';
import { formatLongDate, formatSlot, toISODate } from '@/lib/utils/dates';

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function Availability() {
  const actor = useActor();
  const blocks = useDb((s) => s.blocks);
  const services = useDb((s) => s.services.filter((x) => x.status !== 'archived'));
  const specialists = useDb((s) => s.specialists.filter((x) => x.status !== 'archived'));
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
  const [showPast, setShowPast] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date) return setError('Choose a date.');
    if (form.date < today) return setError('Choose today or a future date.');
    if (!form.allDay && form.end <= form.start) return setError('End time must be after start time.');
    setError('');
    addBlock(actor, {
      date: form.date,
      start: form.allDay ? null : form.start,
      end: form.allDay ? null : form.end,
      serviceSlug: form.serviceSlug || null,
      specialistId: form.specialistId || null,
      reason: form.reason.trim() || 'Unavailable',
    });
    toast.success('Time blocked', { description: 'Customers can no longer book it.' });
    setForm({ ...form, reason: '' });
  };

  const list = blocks
    .filter((b) => showPast || b.date >= today)
    .sort((a, b) => `${a.date}${a.start ?? ''}`.localeCompare(`${b.date}${b.start ?? ''}`));
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
                    options={businessConfig.salon.slots.map((t) => ({ value: t, label: formatSlot(t) }))}
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
                  <span
                    className={businessConfig.salon.closedWeekdays.includes(i) ? 'text-subtle' : 'font-medium text-ink'}
                  >
                    {businessConfig.salon.closedWeekdays.includes(i)
                      ? 'Closed'
                      : `${formatSlot(businessConfig.salon.slots[0])} – last booking ${formatSlot(businessConfig.salon.slots[businessConfig.salon.slots.length - 1])}`}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel
          title={`Blocked times (${list.length})`}
          bodyClassName="p-0"
          actions={
            <label className="flex items-center gap-2 text-xs text-subtle">
              <input
                type="checkbox"
                checked={showPast}
                onChange={(e) => setShowPast(e.target.checked)}
                className="h-3.5 w-3.5 accent-ink"
              />
              Show past
            </label>
          }
        >
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
                    onClick={() => {
                      removeBlock(actor, b.id);
                      toast.success('Time reopened');
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
