import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ActivityIcon, CalendarCheckIcon, ShoppingBagIcon, StarIcon, UserPlusIcon } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useOrders } from '../../../contexts/OrdersContext';
import { useReviews } from '../../../contexts/ReviewsContext';
import { useDb } from '../../../services/db';
import { PageHeader } from '../../../components/admin/ui/PageHeader';
import { FilterTabs } from '../../../components/admin/ui/FilterTabs';
import { AdminEmpty } from '../../../components/admin/ui/AdminEmpty';
import { TablePager, paginate } from '../../../components/admin/ui/TablePager';
import { formatNaira } from '../../../utils/currency';
import { formatDateTime } from '../../../utils/dates';

type Kind = 'all' | 'order' | 'appointment' | 'review' | 'signup';
interface Event {id: string;kind: Exclude<Kind, 'all'>;at: string;who: string;text: string;link: string;}
const icons = { order: ShoppingBagIcon, appointment: CalendarCheckIcon, review: StarIcon, signup: UserPlusIcon };
const PAGE = 25;

/** A single feed of what customers have done across the store and salon. */
export function CustomerActivity() {
  const { users } = useAuth();
  const { orders, appointments } = useOrders();
  const { all: reviews } = useReviews();
  const products = useDb((s) => s.products);
  const [kind, setKind] = useState<Kind>('all');
  const [page, setPage] = useState(1);

  const events = useMemo<Event[]>(() => [
  ...orders.map((o) => ({ id: o.orderNumber, kind: 'order' as const, at: o.createdAt, who: o.customer.fullName, text: `placed order ${o.orderNumber} · ${formatNaira(o.total)}`, link: `/admin/orders/${o.orderNumber}` })),
  ...appointments.map((a) => ({ id: a.reference, kind: 'appointment' as const, at: a.createdAt, who: a.customer.fullName, text: `booked ${a.serviceName}`, link: `/admin/appointments?status=all&ref=${a.reference}` })),
  ...reviews.map((r) => ({ id: r.id, kind: 'review' as const, at: `${r.date}T12:00:00.000Z`, who: r.authorName, text: `reviewed ${products.find((p) => p.id === r.productId)?.name ?? 'a product'} · ${r.rating}★`, link: '/admin/reviews' })),
  ...users.map((u) => ({ id: u.id, kind: 'signup' as const, at: u.createdAt, who: u.fullName, text: 'created an account', link: `/admin/customers/${u.id}` }))].
  sort((a, b) => b.at.localeCompare(a.at)), [orders, appointments, reviews, users, products]);

  const filtered = kind === 'all' ? events : events.filter((e) => e.kind === kind);

  return (
    <div>
      <PageHeader title="Customer activity" description="Orders, bookings, reviews and sign-ups as they happen." />
      <div className="rounded-xl border border-line bg-white">
        <div className="border-b border-line p-3 sm:p-4">
          <FilterTabs label="Activity type" value={kind} onChange={(v) => {setKind(v);setPage(1);}} options={[
          { value: 'all', label: 'Everything' }, { value: 'order', label: 'Orders' }, { value: 'appointment', label: 'Bookings' }, { value: 'review', label: 'Reviews' }, { value: 'signup', label: 'Sign-ups' }]
          } />
        </div>
        {filtered.length === 0 ? <AdminEmpty icon={<ActivityIcon className="h-5 w-5" />} title="No activity yet" /> :
        <>
            <ul className="divide-y divide-line">
              {paginate(filtered, page, PAGE).map((e) => {
              const Icon = icons[e.kind];
              return (
                <li key={`${e.kind}-${e.id}`}>
                    <Link to={e.link} className="flex items-center gap-3 px-4 py-3 text-[13px] transition-colors duration-150 hover:bg-canvas/50">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas text-charcoal"><Icon className="h-4 w-4" aria-hidden /></span>
                      <p className="min-w-0 flex-1 truncate text-charcoal"><span className="font-semibold text-ink">{e.who}</span> {e.text}</p>
                      <span className="shrink-0 text-xs text-subtle">{formatDateTime(e.at)}</span>
                    </Link>
                  </li>);

            })}
            </ul>
            <TablePager page={page} pageSize={PAGE} total={filtered.length} onChange={setPage} />
          </>
        }
      </div>
    </div>);

}