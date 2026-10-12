'use client';

import React, { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarClockIcon, CalendarDaysIcon } from 'lucide-react';
import type { AppointmentStatus } from '@/types/salon';
import { useAdminSalon } from '@/components/admin/AdminSalonProvider';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { FilterTabs } from '@/components/admin/ui/FilterTabs';
import { SearchInput } from '@/components/admin/ui/SearchInput';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { TablePager, paginate } from '@/components/admin/ui/TablePager';
import { AppointmentDrawer } from '@/components/admin/salon/AppointmentDrawer';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatSlot, toISODate } from '@/lib/utils/dates';
import { cn } from '@/lib/utils/cn';

type Tab = 'upcoming' | 'all' | AppointmentStatus;
const PAGE = 15;

export function Appointments() {
  const { appointments } = useAdminSalon();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = (params.get('status') as Tab) || 'upcoming';
  const ref = params.get('ref');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const today = toISODate(new Date());

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return appointments
      .filter((a) =>
        tab === 'all'
          ? true
          : tab === 'upcoming'
            ? a.date >= today && ['Pending', 'Confirmed', 'Rescheduled'].includes(a.status)
            : a.status === tab,
      )
      .filter(
        (a) =>
          !t ||
          [
            a.reference,
            a.customer.fullName,
            a.customer.email,
            a.customer.phone,
            a.serviceName,
            a.personnelName ?? '',
          ].some((f) => f.toLowerCase().includes(t)),
      )
      .sort((a, b) =>
        tab === 'upcoming'
          ? `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)
          : `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`),
      );
  }, [appointments, tab, q, today]);

  const count = (s: AppointmentStatus) => appointments.filter((a) => a.status === s).length;
  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <div>
      <PageHeader
        title="Appointments"
        description="Confirm, reschedule or reject salon bookings. Customers pay after their service."
        actions={
          <AdminButton icon={<CalendarDaysIcon className="h-4 w-4" />} to="/admin/calendar">
            Calendar view
          </AdminButton>
        }
      />

      <div className="rounded-xl border border-line bg-white">
        <div className="space-y-3 border-b border-line p-3 sm:p-4">
          <FilterTabs
            label="Appointment status"
            value={tab}
            onChange={(v) => {
              setParam('status', v === 'upcoming' ? null : v);
              setPage(1);
            }}
            options={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'Pending', label: 'Pending', count: count('Pending') },
              { value: 'Confirmed', label: 'Confirmed', count: count('Confirmed') },
              { value: 'Rescheduled', label: 'Rescheduled', count: count('Rescheduled') },
              { value: 'Completed', label: 'Completed', count: count('Completed') },
              { value: 'Rejected', label: 'Rejected', count: count('Rejected') },
              { value: 'Cancelled', label: 'Cancelled', count: count('Cancelled') },
              { value: 'all', label: 'All', count: appointments.length },
            ]}
          />

          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Reference, customer, phone, service or specialist"
            className="sm:max-w-md"
          />
        </div>

        {filtered.length === 0 ? (
          <AdminEmpty
            icon={<CalendarClockIcon className="h-5 w-5" />}
            title="No appointments"
            text="Nothing matches this view."
          />
        ) : (
          <>
            <div className="hidden relative overflow-x-auto md:block">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-line text-xs text-subtle">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">When</th>
                    <th className="px-2 py-2.5 font-semibold">Service</th>
                    <th className="px-2 py-2.5 font-semibold">Customer</th>
                    <th className="px-2 py-2.5 font-semibold">Specialist</th>
                    <th className="px-2 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paginate(filtered, page, PAGE).map((a) => (
                    <tr
                      key={a.reference}
                      onClick={() => setParam('ref', a.reference)}
                      className={cn(
                        'cursor-pointer transition-colors duration-150 hover:bg-canvas/50',
                        a.status === 'Pending' && 'bg-pink/[0.03]',
                      )}
                    >
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <p className="font-semibold text-ink">
                          {formatDate(a.date)}
                          {a.date === today && (
                            <span className="ml-1.5 rounded bg-ink px-1 text-[10px] text-white">Today</span>
                          )}
                        </p>
                        <p className="text-xs text-subtle">{formatSlot(a.time)}</p>
                      </td>
                      <td className="px-2 py-2.5">
                        <p className="font-medium text-ink">{a.serviceName}</p>
                        <p className="font-mono text-[11px] text-subtle">{a.reference}</p>
                      </td>
                      <td className="max-w-[220px] px-2 py-2.5">
                        <p className="truncate text-ink">{a.customer.fullName}</p>
                        <p className="truncate text-xs text-subtle">
                          {a.customer.phone} · {a.customer.email}
                        </p>
                      </td>
                      <td className="px-2 py-2.5 text-charcoal">{a.personnelName ?? '—'}</td>
                      <td className="px-2 py-2.5">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <AdminButton
                          size="xs"
                          variant={a.status === 'Pending' ? 'primary' : 'outline'}
                          onClick={(e) => {
                            e.stopPropagation();
                            setParam('ref', a.reference);
                          }}
                        >
                          {a.status === 'Pending' ? 'Review' : 'Open'}
                        </AdminButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-line md:hidden">
              {paginate(filtered, page, PAGE).map((a) => (
                <li key={a.reference}>
                  <button
                    onClick={() => setParam('ref', a.reference)}
                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-ink">{a.serviceName}</span>
                      <span className="block text-xs text-subtle">
                        {formatDate(a.date)} · {formatSlot(a.time)} · {a.customer.fullName}
                      </span>
                    </span>
                    <StatusBadge status={a.status} />
                  </button>
                </li>
              ))}
            </ul>
            <TablePager page={page} pageSize={PAGE} total={filtered.length} onChange={setPage} />
          </>
        )}
      </div>
      <AppointmentDrawer
        appointment={appointments.find((a) => a.reference === ref) ?? null}
        onClose={() => setParam('ref', null)}
      />
    </div>
  );
}
