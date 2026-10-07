'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { DownloadIcon, UserPlusIcon, UsersIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/contexts/OrdersContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useAdminOps } from '@/hooks/useAdminOps';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { FilterTabs } from '@/components/admin/ui/FilterTabs';
import { SearchInput } from '@/components/admin/ui/SearchInput';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { AdminInput } from '@/components/admin/ui/AdminField';
import { Toggle } from '@/components/admin/ui/Toggle';
import { TablePager, paginate } from '@/components/admin/ui/TablePager';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { buildCustomerRows } from '@/lib/utils/customers';
import { formatNaira } from '@/lib/utils/currency';
import { formatDate } from '@/lib/utils/dates';
import { downloadCsv, initials } from '@/lib/utils/text';
import { isValidEmail, isValidPhone } from '@/lib/utils/validation';

type Tab = 'all' | 'registered' | 'guest' | 'blocked';
type Sort = 'recent' | 'spent' | 'orders' | 'name';
const PAGE = 20;
const statusLabel = { active: 'Active', blocked: 'Blocked', guest: 'Guest' } as const;

export function Customers() {
  const { users } = useAuth();
  const { orders, appointments } = useOrders();
  const { can } = useAdminAuth();
  const [tab, setTab] = useState<Tab>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);

  const rows = useMemo(() => buildCustomerRows(users, orders, appointments), [users, orders, appointments]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = rows.
    filter((r) => tab === 'all' ? true : tab === 'registered' ? r.registered : tab === 'guest' ? !r.registered : r.status === 'blocked').
    filter((r) => !t || [r.fullName, r.email, r.phone].some((f) => f.toLowerCase().includes(t)));
    return list.sort((a, b) =>
    sort === 'spent' ? b.spent - a.spent :
    sort === 'orders' ? b.orders - a.orders :
    sort === 'name' ? a.fullName.localeCompare(b.fullName) :
    (b.lastActivity ?? b.joinedAt).localeCompare(a.lastActivity ?? a.joinedAt)
    );
  }, [rows, tab, q, sort]);

  const exportCsv = () => {
    downloadCsv(`luxichic-customers-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Name', 'Email', 'Phone', 'Type', 'Status', 'Orders', 'Total spent (NGN)', 'Appointments', 'Joined', 'Last activity'],
    ...filtered.map((r) => [r.fullName, r.email, r.phone, r.registered ? 'Registered' : 'Guest', statusLabel[r.status], r.orders, r.spent, r.appointments, formatDate(r.joinedAt), r.lastActivity ? formatDate(r.lastActivity) : ''])]
    );
    toast.success(`Exported ${filtered.length} customers`);
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Registered accounts and guest buyers. Open a customer to see their orders, bookings and reviews."
        actions={
        <>
            <AdminButton icon={<DownloadIcon className="h-4 w-4" />} onClick={exportCsv}>Export</AdminButton>
            {can('customers.edit') && <AdminButton variant="primary" icon={<UserPlusIcon className="h-4 w-4" />} onClick={() => setAdding(true)}>Add customer</AdminButton>}
          </>
        } />
      

      <div className="rounded-xl border border-line bg-white">
        <div className="space-y-3 border-b border-line p-3 sm:p-4">
          <FilterTabs
            label="Customer type"
            value={tab}
            onChange={(v) => {setTab(v);setPage(1);}}
            options={[
            { value: 'all', label: 'All', count: rows.length },
            { value: 'registered', label: 'Registered', count: rows.filter((r) => r.registered).length },
            { value: 'guest', label: 'Guests', count: rows.filter((r) => !r.registered).length },
            { value: 'blocked', label: 'Blocked', count: rows.filter((r) => r.status === 'blocked').length }]
            } />
          
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput value={q} onChange={(v) => {setQ(v);setPage(1);}} placeholder="Name, email or phone" className="sm:max-w-sm sm:flex-1" />
            <label className="flex items-center gap-2 text-xs text-subtle">
              Sort
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-9 rounded-lg border border-line px-2 text-[13px] text-ink">
                <option value="recent">Recent activity</option>
                <option value="spent">Total spent</option>
                <option value="orders">Most orders</option>
                <option value="name">Name A–Z</option>
              </select>
            </label>
          </div>
        </div>

        {filtered.length === 0 ?
        <AdminEmpty icon={<UsersIcon className="h-5 w-5" />} title="No customers found" text="Try a different search or filter." /> :

        <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[13px]">
                <thead className="border-b border-line text-xs text-subtle">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Customer</th>
                    <th className="px-2 py-2.5 font-semibold">Phone</th>
                    <th className="px-2 py-2.5 font-semibold">Status</th>
                    <th className="px-2 py-2.5 text-right font-semibold">Orders</th>
                    <th className="px-2 py-2.5 text-right font-semibold">Spent</th>
                    <th className="px-2 py-2.5 text-right font-semibold">Bookings</th>
                    <th className="px-4 py-2.5 font-semibold">Last active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paginate(filtered, page, PAGE).map((r) =>
                <tr key={r.id} className="transition-colors duration-150 hover:bg-canvas/50">
                      <td className="px-4 py-2.5">
                        <Link href={`/admin/customers/${encodeURIComponent(r.id)}`} className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas text-[11px] font-bold text-ink">{initials(r.fullName)}</span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-ink hover:underline">{r.fullName}</span>
                            <span className="block truncate text-xs text-subtle">{r.email}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-charcoal">{r.phone || '—'}</td>
                      <td className="px-2 py-2.5"><StatusBadge status={statusLabel[r.status]} /></td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-ink">{r.orders}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-right font-semibold tabular-nums text-ink">{formatNaira(r.spent)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-ink">{r.appointments}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-subtle">{r.lastActivity ? formatDate(r.lastActivity) : '—'}</td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>
            <TablePager page={page} pageSize={PAGE} total={filtered.length} onChange={setPage} />
          </>
        }
      </div>
      <AddCustomerDialog open={adding} onClose={() => setAdding(false)} />
    </div>);

}

function AddCustomerDialog({ open, onClose }: {open: boolean;onClose: () => void;}) {
  const ops = useAdminOps();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', blocked: false });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = 'Enter the customer’s name.';
    if (!isValidEmail(form.email)) errs.email = 'Enter a valid email address.';
    if (form.phone && !isValidPhone(form.phone)) errs.phone = 'Enter a valid Nigerian phone number.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const res = ops.createCustomer({ fullName: form.fullName.trim(), email: form.email.trim(), phone: form.phone.trim(), status: form.blocked ? 'blocked' : 'active' });
    if (!res.ok) return setErrors({ email: res.error ?? 'Could not create customer.' });
    toast.success('Customer added', { description: 'They would receive an email to set their password.' });
    setForm({ fullName: '', email: '', phone: '', blocked: false });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add customer" className="max-w-md rounded-2xl">
      <form onSubmit={submit} className="space-y-4 p-5">
        <AdminInput id="nc-name" label="Full name" value={form.fullName} error={errors.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <AdminInput id="nc-email" type="email" label="Email" value={form.email} error={errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <AdminInput id="nc-phone" label="Phone" optional value={form.phone} error={errors.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0803 123 4567" />
        <Toggle label="Block this account" description="Blocked customers can’t sign in, order or book." checked={form.blocked} onChange={(v) => setForm({ ...form, blocked: v })} />
        <p className="rounded-lg bg-canvas px-3 py-2 text-xs text-subtle">The customer sets their own password from a secure setup link. You never choose it for them.</p>
        <div className="flex justify-end gap-2">
          <AdminButton variant="ghost" onClick={onClose}>Cancel</AdminButton>
          <AdminButton type="submit" variant="primary">Add customer</AdminButton>
        </div>
      </form>
    </Modal>);

}