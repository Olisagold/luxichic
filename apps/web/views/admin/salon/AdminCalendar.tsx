'use client';

import React, { useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { toast } from 'sonner';
import { BanIcon, ChevronLeftIcon, ChevronRightIcon, LockOpenIcon } from 'lucide-react';
import type { Appointment } from '@/types/salon';
import { useOrders } from '@/contexts/OrdersContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useActor } from '@/hooks/useActor';
import { useDb } from '@/lib/mock-db/db';
import { addBlock, removeBlock } from '@/lib/mock-db/salon';
import { businessConfig } from '@/data/config';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { adminInputClass } from '@/components/admin/ui/AdminField';
import { AppointmentDrawer } from '@/components/admin/salon/AppointmentDrawer';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { isBlocked } from '@/lib/utils/availability';
import { formatLongDate, formatSlot, toISODate } from '@/lib/utils/dates';
import { cn } from '@/lib/utils/cn';

type View = 'day' | 'week' | 'month';
const active = (a: Appointment) => !['Rejected', 'Cancelled'].includes(a.status);
const dot: Record<string, string> = {
  Pending: 'bg-pink',
  Confirmed: 'bg-ink',
  Rescheduled: 'bg-amber-500',
  Completed: 'bg-emerald-600',
};

export function AdminCalendar() {
  const { appointments } = useOrders();
  const { can } = useAdminAuth();
  const actor = useActor();
  const services = useDb((s) => s.services);
  const blocks = useDb((s) => s.blocks);
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(toISODate(new Date()));
  const [service, setService] = useState('');
  const [openRef, setOpenRef] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const m: Record<string, Appointment[]> = {};
    appointments
      .filter(active)
      .filter((a) => !service || a.serviceSlug === service)
      .forEach((a) => {
        (m[a.date] ??= []).push(a);
      });
    Object.values(m).forEach((l) => l.sort((x, y) => x.time.localeCompare(y.time)));
    return m;
  }, [appointments, service]);

  const days = useMemo(() => {
    if (view === 'month')
      return eachDayOfInterval({
        start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
      });
    if (view === 'week')
      return eachDayOfInterval({
        start: startOfWeek(cursor, { weekStartsOn: 1 }),
        end: endOfWeek(cursor, { weekStartsOn: 1 }),
      });
    return [cursor];
  }, [view, cursor]);

  const move = (dir: 1 | -1) =>
    setCursor((c) => (view === 'month' ? addMonths(c, dir) : addDays(c, dir * (view === 'week' ? 7 : 1))));
  const title =
    view === 'month'
      ? format(cursor, 'MMMM yyyy')
      : view === 'week'
        ? `${format(days[0], 'd MMM')} – ${format(days[6], 'd MMM yyyy')}`
        : format(cursor, 'EEEE, d MMMM yyyy');
  const dayKey = view === 'day' ? toISODate(cursor) : selected;
  const closed = (d: Date) => businessConfig.salon.closedWeekdays.includes(d.getDay());

  const toggleSlot = (time: string | null) => {
    const existing = blocks.find(
      (b) => b.date === dayKey && b.start === time && (b.serviceSlug ?? '') === service && !b.specialistId,
    );
    if (existing) {
      removeBlock(actor, existing.id);
      toast.success('Slot reopened');
    } else {
      addBlock(actor, {
        date: dayKey,
        start: time,
        end: time ? `${String(Number(time.slice(0, 2)) + 1).padStart(2, '0')}:00` : null,
        serviceSlug: service || null,
        specialistId: null,
        reason: 'Blocked from calendar',
      });
      toast.success(time ? `${formatSlot(time)} blocked` : 'Whole day blocked', {
        description: service ? `Only for ${services.find((s) => s.slug === service)?.name}.` : 'For all services.',
      });
    }
  };

  const dayAppts = byDate[dayKey] ?? [];
  const dayBlocked = blocks.find(
    (b) => b.date === dayKey && b.start === null && (b.serviceSlug ?? '') === service && !b.specialistId,
  );

  return (
    <div>
      <PageHeader title="Calendar" description="See bookings and block times so customers can’t book them." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border border-line bg-white" aria-label="Calendar">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => move(-1)}
                className="rounded-md border border-line p-1.5 hover:bg-canvas"
                aria-label="Previous"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => move(1)}
                className="rounded-md border border-line p-1.5 hover:bg-canvas"
                aria-label="Next"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
              <AdminButton
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCursor(new Date());
                  setSelected(toISODate(new Date()));
                }}
              >
                Today
              </AdminButton>
            </div>
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <select
                aria-label="Filter by service"
                value={service}
                onChange={(e) => setService(e.target.value)}
                className={cn(adminInputClass, 'h-8 w-44')}
              >
                <option value="">All services</option>
                {services.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Calendar view">
                {(['day', 'week', 'month'] as View[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      setView(v);
                      if (v === 'day') setCursor(new Date(selected));
                    }}
                    aria-pressed={view === v}
                    className={cn(
                      'h-7 rounded-md px-2.5 text-xs font-semibold capitalize',
                      view === v ? 'bg-ink text-white' : 'text-charcoal hover:bg-canvas',
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {view !== 'day' ? (
            <div className={cn('grid grid-cols-7', view === 'week' && 'min-h-[420px]')}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="border-b border-line px-2 py-1.5 text-[11px] font-semibold text-subtle">
                  {d}
                </div>
              ))}
              {days.map((d) => {
                const key = toISODate(d);
                const list = byDate[key] ?? [];
                const isSel = key === selected;
                const isToday = key === toISODate(new Date());
                const blockedDay = blocks.some((b) => b.date === key && b.start === null && !b.specialistId);
                return (
                  <button
                    key={key}
                    onClick={() => setSelected(key)}
                    aria-pressed={isSel}
                    aria-label={`${formatLongDate(key)}, ${list.length} appointments`}
                    className={cn(
                      'relative flex flex-col items-stretch gap-1 border-b border-r border-line p-1.5 text-left transition-colors duration-150 [&:nth-child(7n+7)]:border-r-0',
                      view === 'month' ? 'min-h-[86px]' : 'min-h-[360px]',
                      !isSameMonth(d, cursor) && view === 'month' && 'bg-canvas/40 text-muted',
                      closed(d) && 'bg-canvas/70',
                      isSel ? 'bg-pink/[0.06] ring-1 ring-inset ring-pink' : 'hover:bg-canvas/50',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                        isToday ? 'bg-ink text-white' : 'text-ink',
                      )}
                    >
                      {format(d, 'd')}
                    </span>
                    {closed(d) && <span className="text-[10px] text-subtle">Closed</span>}
                    {blockedDay && (
                      <span className="rounded bg-red-50 px-1 text-[10px] font-semibold text-red-700">Blocked</span>
                    )}
                    {(view === 'month' ? list.slice(0, 3) : list).map((a) => (
                      <span
                        key={a.reference}
                        className="flex items-center gap-1 truncate rounded bg-white/80 text-[10px] leading-tight text-charcoal"
                      >
                        <span
                          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dot[a.status] ?? 'bg-muted')}
                          aria-hidden
                        />
                        <span className="truncate">
                          {formatSlot(a.time)} {a.serviceName}
                        </span>
                      </span>
                    ))}
                    {view === 'month' && list.length > 3 && (
                      <span className="text-[10px] font-semibold text-subtle">+{list.length - 3} more</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <DaySlots
              dayKey={dayKey}
              appts={dayAppts}
              service={service}
              onOpen={setOpenRef}
              onToggle={can('salon.availability') ? toggleSlot : undefined}
            />
          )}
          <div className="flex flex-wrap gap-4 border-t border-line px-4 py-2.5 text-[11px] text-subtle">
            {Object.entries(dot).map(([s, c]) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', c)} />
                {s}
              </span>
            ))}
          </div>
        </section>

        {view !== 'day' && (
          <aside className="rounded-xl border border-line bg-white">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-ink">{formatLongDate(dayKey)}</h2>
                <p className="text-xs text-subtle">
                  {dayAppts.length} booking{dayAppts.length === 1 ? '' : 's'}
                  {service ? ` · ${services.find((s) => s.slug === service)?.name}` : ''}
                </p>
              </div>
              {can('salon.availability') && (
                <AdminButton
                  size="xs"
                  variant={dayBlocked ? 'outline' : 'dangerGhost'}
                  icon={dayBlocked ? <LockOpenIcon className="h-3 w-3" /> : <BanIcon className="h-3 w-3" />}
                  onClick={() => toggleSlot(null)}
                >
                  {dayBlocked ? 'Reopen day' : 'Block day'}
                </AdminButton>
              )}
            </div>
            <DaySlots
              dayKey={dayKey}
              appts={dayAppts}
              service={service}
              onOpen={setOpenRef}
              onToggle={can('salon.availability') ? toggleSlot : undefined}
              compact
            />
          </aside>
        )}
      </div>
      <AppointmentDrawer
        appointment={appointments.find((a) => a.reference === openRef) ?? null}
        onClose={() => setOpenRef(null)}
      />
    </div>
  );
}

function DaySlots({
  dayKey,
  appts,
  service,
  onOpen,
  onToggle,
  compact,
}: {
  dayKey: string;
  appts: Appointment[];
  service: string;
  onOpen: (r: string) => void;
  onToggle?: (t: string | null) => void;
  compact?: boolean;
}) {
  const blocks = useDb((s) => s.blocks);
  const isClosed = businessConfig.salon.closedWeekdays.includes(new Date(dayKey).getDay());
  if (isClosed)
    return <p className="px-4 py-10 text-center text-[13px] text-subtle">The salon is closed on this day.</p>;
  return (
    <ul className={cn('divide-y divide-line', !compact && 'min-h-[360px]')}>
      {businessConfig.salon.slots.map((time) => {
        const booked = appts.filter((a) => a.time === time);
        const block =
          isBlocked(blocks, dayKey, time, service || null, null) ??
          (!service ? blocks.find((b) => b.date === dayKey && b.start === time && !b.specialistId) : undefined);
        return (
          <li key={time} className="flex items-start gap-3 px-4 py-2">
            <span className="w-16 shrink-0 pt-1 text-xs font-semibold tabular-nums text-subtle">
              {formatSlot(time)}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              {booked.map((a) => (
                <button
                  key={a.reference}
                  onClick={() => onOpen(a.reference)}
                  className="flex w-full items-center justify-between gap-2 rounded-md bg-canvas px-2.5 py-1.5 text-left hover:bg-line/60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-ink">{a.serviceName}</span>
                    <span className="block truncate text-[11px] text-subtle">
                      {a.customer.fullName}
                      {a.personnelName ? ` · ${a.personnelName}` : ''}
                    </span>
                  </span>
                  <StatusBadge status={a.status} />
                </button>
              ))}
              {block && (
                <p className="rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-800">
                  Blocked{block.serviceSlug ? ` · ${block.serviceSlug.replace(/-/g, ' ')}` : ''}
                  {block.reason ? ` — ${block.reason}` : ''}
                </p>
              )}
              {!booked.length && !block && <p className="py-1 text-xs text-muted">Open</p>}
            </div>
            {onToggle && (
              <button
                onClick={() => onToggle(time)}
                className="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-subtle hover:bg-canvas hover:text-ink"
              >
                {block ? 'Unblock' : 'Block'}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
