import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PlusIcon, ScissorsIcon } from 'lucide-react';
import type { AdminService } from '../../../types/admin';
import { useOrders } from '../../../contexts/OrdersContext';
import { useActor } from '../../../hooks/useActor';
import { useDb } from '../../../services/db';
import { setServiceStatus } from '../../../services/salon';
import { PageHeader } from '../../../components/admin/ui/PageHeader';
import { FilterTabs } from '../../../components/admin/ui/FilterTabs';
import { SearchInput } from '../../../components/admin/ui/SearchInput';
import { AdminButton } from '../../../components/admin/ui/AdminButton';
import { AdminEmpty } from '../../../components/admin/ui/AdminEmpty';
import { Toggle } from '../../../components/admin/ui/Toggle';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { formatNaira } from '../../../utils/currency';

type Tab = 'all' | AdminService['status'];
const label = { published: 'Published', draft: 'Draft', archived: 'Archived' } as const;

export function SalonServices() {
  const actor = useActor();
  const services = useDb((s) => s.services);
  const specialists = useDb((s) => s.specialists);
  const { appointments } = useOrders();
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return services.
    filter((s) => tab === 'all' ? s.status !== 'archived' : s.status === tab).
    filter((s) => !t || s.name.toLowerCase().includes(t) || s.category.toLowerCase().includes(t));
  }, [services, tab, q]);

  return (
    <div>
      <PageHeader
        title="Salon services"
        description="Services customers can view and book. Unpublished services disappear from the salon pages and booking form."
        actions={<AdminButton variant="primary" icon={<PlusIcon className="h-4 w-4" />} to="/admin/salon/services/new">Add service</AdminButton>} />
      
      <div className="rounded-xl border border-line bg-white">
        <div className="space-y-3 border-b border-line p-3 sm:p-4">
          <FilterTabs label="Service status" value={tab} onChange={setTab} options={[
          { value: 'all', label: 'Active', count: services.filter((s) => s.status !== 'archived').length },
          { value: 'published', label: 'Published', count: services.filter((s) => s.status === 'published').length },
          { value: 'draft', label: 'Draft', count: services.filter((s) => s.status === 'draft').length },
          { value: 'archived', label: 'Archived', count: services.filter((s) => s.status === 'archived').length }]
          } />
          <SearchInput value={q} onChange={setQ} placeholder="Search services" className="sm:max-w-sm" />
        </div>
        {filtered.length === 0 ? <AdminEmpty icon={<ScissorsIcon className="h-5 w-5" />} title="No services here" /> :
        <ul className="divide-y divide-line">
            {filtered.map((s) => {
            const team = specialists.filter((sp) => sp.serviceSlugs.includes(s.slug) && sp.status !== 'archived');
            const upcoming = appointments.filter((a) => a.serviceSlug === s.slug && ['Pending', 'Confirmed', 'Rescheduled'].includes(a.status)).length;
            return (
              <li key={s.slug} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                  <img src={s.image} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/salon/services/${s.slug}`} className="block truncate text-[13px] font-semibold text-ink hover:underline">{s.name}</Link>
                    <p className="truncate text-xs text-subtle">{s.category} · {s.startingPrice ? `from ${formatNaira(s.startingPrice)}` : 'Price on consultation'} · {s.duration ?? `${s.durationMinutes} min`}</p>
                  </div>
                  <div className="hidden text-right text-xs text-subtle md:block">
                    <p className="font-medium text-ink">{team.length ? team.map((t) => t.name).join(', ') : 'No specialist assigned'}</p>
                    <p>{upcoming} upcoming booking{upcoming === 1 ? '' : 's'}</p>
                  </div>
                  <StatusBadge status={label[s.status]} />
                  {s.status !== 'archived' &&
                <Toggle
                  srOnlyLabel
                  label={`Publish ${s.name}`}
                  checked={s.status === 'published'}
                  onChange={(on) => {setServiceStatus(actor, s.slug, on ? 'published' : 'draft');toast.success(on ? `${s.name} is live` : `${s.name} hidden from the salon pages`);}} />

                }
                  <AdminButton size="sm" to={`/admin/salon/services/${s.slug}`}>Edit</AdminButton>
                </li>);

          })}
          </ul>
        }
      </div>
    </div>);

}