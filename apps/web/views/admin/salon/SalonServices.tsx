'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PlusIcon, ScissorsIcon } from 'lucide-react';
import type { AdminService } from '@/types/admin';
import { useRouter } from 'next/navigation';
import { useAdminSalon } from '@/components/admin/AdminSalonProvider';
import { setServiceStatus } from '@/lib/salon/admin-actions';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { FilterTabs } from '@/components/admin/ui/FilterTabs';
import { SearchInput } from '@/components/admin/ui/SearchInput';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { Toggle } from '@/components/admin/ui/Toggle';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatNaira } from '@/lib/utils/currency';

type Tab = 'all' | AdminService['status'];
const label = { published: 'Published', draft: 'Draft', archived: 'Archived' } as const;

export function SalonServices() {
  const { services, specialists, appointments } = useAdminSalon();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return services
      .filter((s) => (tab === 'all' ? s.status !== 'archived' : s.status === tab))
      .filter((s) => !t || s.name.toLowerCase().includes(t) || s.category.toLowerCase().includes(t));
  }, [services, tab, q]);

  return (
    <div>
      <PageHeader
        title="Salon services"
        description="Services customers can view and book. Unpublished services disappear from the salon pages and booking form."
        actions={
          <AdminButton variant="primary" icon={<PlusIcon className="h-4 w-4" />} to="/admin/salon/services/new">
            Add service
          </AdminButton>
        }
      />

      <div className="rounded-xl border border-line bg-white">
        <div className="space-y-3 border-b border-line p-3 sm:p-4">
          <FilterTabs
            label="Service status"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'all', label: 'Active', count: services.filter((s) => s.status !== 'archived').length },
              {
                value: 'published',
                label: 'Published',
                count: services.filter((s) => s.status === 'published').length,
              },
              { value: 'draft', label: 'Draft', count: services.filter((s) => s.status === 'draft').length },
              { value: 'archived', label: 'Archived', count: services.filter((s) => s.status === 'archived').length },
            ]}
          />
          <SearchInput value={q} onChange={setQ} placeholder="Search services" className="sm:max-w-sm" />
        </div>
        {filtered.length === 0 ? (
          <AdminEmpty icon={<ScissorsIcon className="h-5 w-5" />} title="No services here" />
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((s) => {
              const team = specialists.filter((sp) => sp.serviceSlugs.includes(s.slug) && sp.status !== 'archived');
              const upcoming = appointments.filter(
                (a) => a.serviceSlug === s.slug && ['Pending', 'Confirmed', 'Rescheduled'].includes(a.status),
              ).length;
              return (
                <li key={s.slug} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                  <img src={s.image} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/salon/services/${s.slug}`}
                      className="block truncate text-[13px] font-semibold text-ink hover:underline"
                    >
                      {s.name}
                    </Link>
                    <p className="truncate text-xs text-subtle">
                      {s.category} ·{' '}
                      {s.startingPrice ? `from ${formatNaira(s.startingPrice)}` : 'Price on consultation'} ·{' '}
                      {s.duration ?? `${s.durationMinutes} min`}
                    </p>
                  </div>
                  <div className="hidden text-right text-xs text-subtle md:block">
                    <p className="font-medium text-ink">
                      {team.length ? team.map((t) => t.name).join(', ') : 'No specialist assigned'}
                    </p>
                    <p>
                      {upcoming} upcoming booking{upcoming === 1 ? '' : 's'}
                    </p>
                  </div>
                  <StatusBadge status={label[s.status]} />
                  {s.status !== 'archived' && (
                    <Toggle
                      srOnlyLabel
                      label={`Publish ${s.name}`}
                      checked={s.status === 'published'}
                      onChange={async (on) => {
                        const res = await setServiceStatus(s.slug, on ? 'published' : 'draft').catch(() => null);
                        if (!res?.ok) return toast.error(res?.error ?? 'Could not update the service.');
                        toast.success(on ? `${s.name} is live` : `${s.name} hidden from the salon pages`);
                        router.refresh();
                      }}
                    />
                  )}
                  <AdminButton size="sm" to={`/admin/salon/services/${s.slug}`}>
                    Edit
                  </AdminButton>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
