'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { BanIcon, MessageSquareIcon, PencilIcon, TrashIcon, UserXIcon } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useAdminCustomers } from '@/components/admin/AdminCustomersProvider';
import { addCustomerNote, deleteCustomer, setCustomerBlocked, updateCustomer } from '@/lib/customers/admin-actions';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { AdminInput } from '@/components/admin/ui/AdminField';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Stars } from '@/components/ui/Stars';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { buildCustomerRows, customerAppointments, customerOrders } from '@/lib/utils/customers';
import { formatNaira } from '@/lib/utils/currency';
import { formatDate, formatDateTime, formatSlot } from '@/lib/utils/dates';
import { initials } from '@/lib/utils/text';
import { isValidEmail } from '@/lib/utils/validation';

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { users, orders, appointments, reviews, notes = [] } = useAdminCustomers();
  const { can } = useAdminAuth();
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<'block' | 'delete' | 'edit' | null>(null);
  const [note, setNote] = useState('');

  /** Runs a server action, reports the result and reloads the page's data. */
  const run = async (action: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
    setBusy(true);
    const res = await action().catch(() => null);
    setBusy(false);
    setDialog(null);
    if (!res?.ok) {
      toast.error(res?.error ?? 'Something went wrong. Please try again.');
      return false;
    }
    toast.success(success);
    router.refresh();
    return true;
  };

  const row = useMemo(
    () => buildCustomerRows(users, orders, appointments).find((r) => r.id === decodeURIComponent(id)),
    [users, orders, appointments, id],
  );

  if (!row) {
    return (
      <div className="rounded-xl border border-line bg-white">
        <AdminEmpty
          icon={<UserXIcon className="h-5 w-5" />}
          title="Customer not found"
          action={<AdminButton to="/admin/customers">Back to customers</AdminButton>}
        />
      </div>
    );
  }

  const cOrders = customerOrders(row.email, orders);
  const cAppts = customerAppointments(row.email, appointments);
  const cReviews = reviews.filter((r) => r.authorEmail?.toLowerCase() === row.email.toLowerCase());
  const avg = row.orders
    ? Math.round(row.spent / Math.max(1, cOrders.filter((o) => o.status !== 'Cancelled').length))
    : 0;
  const u = row.user;

  return (
    <div>
      <PageHeader
        back={{ to: '/admin/customers', label: 'Customers' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {row.fullName}{' '}
            <StatusBadge status={row.status === 'guest' ? 'Guest' : row.status === 'blocked' ? 'Blocked' : 'Active'} />
          </span>
        }
        description={`${row.registered ? 'Registered' : 'Guest'} since ${formatDate(row.joinedAt)}${row.lastActivity ? ` · last active ${formatDate(row.lastActivity)}` : ''}`}
        actions={
          u && (
            <>
              {can('customers.edit') && (
                <AdminButton icon={<PencilIcon className="h-4 w-4" />} onClick={() => setDialog('edit')}>
                  Edit
                </AdminButton>
              )}
              {can('customers.block') && (
                <AdminButton
                  variant={u.status === 'blocked' ? 'outline' : 'dangerGhost'}
                  icon={<BanIcon className="h-4 w-4" />}
                  disabled={busy}
                  onClick={() =>
                    u.status === 'blocked'
                      ? run(() => setCustomerBlocked(u.id, false), 'Customer unblocked')
                      : setDialog('block')
                  }
                >
                  {u.status === 'blocked' ? 'Unblock' : 'Block'}
                </AdminButton>
              )}
              {can('customers.delete') && (
                <AdminButton
                  variant="dangerGhost"
                  icon={<TrashIcon className="h-4 w-4" />}
                  onClick={() => setDialog('delete')}
                >
                  Delete
                </AdminButton>
              )}
            </>
          )
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
            {[
              ['Total spent', formatNaira(row.spent)],
              ['Orders', String(row.orders)],
              ['Average order', avg ? formatNaira(avg) : '—'],
              ['Appointments', String(row.appointments)],
            ].map(([l, v], i) => (
              <div key={l} className="bg-white px-4 py-3">
                <dt className="text-xs text-subtle">{l}</dt>
                <dd
                  className={
                    i === 0 ? 'text-xl font-bold tabular-nums text-ink' : 'text-lg font-semibold tabular-nums text-ink'
                  }
                >
                  {v}
                </dd>
              </div>
            ))}
          </dl>

          <Panel title={`Orders (${cOrders.length})`} bodyClassName="p-0">
            {cOrders.length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-subtle">No orders yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {cOrders.map((o) => (
                  <li key={o.orderNumber}>
                    <Link
                      href={`/admin/orders/${o.orderNumber}`}
                      className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13px] hover:bg-canvas/50"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{o.orderNumber}</span>
                        <span className="block text-xs text-subtle">
                          {formatDate(o.createdAt)} · {o.items.reduce((s, i) => s + i.quantity, 0)} item(s)
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="font-semibold tabular-nums text-ink">{formatNaira(o.total)}</span>
                        <StatusBadge status={o.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={`Appointments (${cAppts.length})`} bodyClassName="p-0">
            {cAppts.length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-subtle">No appointments yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {cAppts.map((a) => (
                  <li key={a.reference}>
                    <Link
                      href={`/admin/appointments?status=all&ref=${a.reference}`}
                      className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13px] hover:bg-canvas/50"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{a.serviceName}</span>
                        <span className="block text-xs text-subtle">
                          {formatDate(a.date)} · {formatSlot(a.time)}
                          {a.personnelName ? ` · ${a.personnelName}` : ''}
                        </span>
                      </span>
                      <StatusBadge status={a.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={`Reviews (${cReviews.length})`} bodyClassName="p-0">
            {cReviews.length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-subtle">No reviews yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {cReviews.map((r) => (
                  <li key={r.id} className="px-5 py-3 text-[13px]">
                    <div className="flex items-center justify-between gap-3">
                      <Stars rating={r.rating} />
                      <StatusBadge
                        status={
                          (r.status ?? 'visible') === 'visible'
                            ? 'Visible'
                            : r.status === 'hidden'
                              ? 'Hidden'
                              : 'Archived'
                        }
                      />
                    </div>
                    <p className="mt-1 font-semibold text-ink">{r.title}</p>
                    <p className="text-xs text-subtle">
                      {r.productName} · {formatDate(r.date)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Contact">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
                {initials(row.fullName)}
              </span>
              <div className="min-w-0 text-[13px]">
                <p className="truncate font-semibold text-ink">{row.email}</p>
                <p className="text-charcoal">{row.phone || 'No phone'}</p>
              </div>
            </div>
            {row.phone && (
              <div className="mt-4">
                <WhatsAppButton
                  size="sm"
                  number={row.phone.replace(/\D/g, '').replace(/^0/, '234')}
                  message={`Hello ${row.fullName.split(' ')[0]}, this is LUXICHIC.`}
                  label="Message on WhatsApp"
                />
              </div>
            )}
            {u?.pendingSetup && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Account created by an admin — waiting for the customer to set a password.
              </p>
            )}
          </Panel>

          <Panel title="Saved addresses">
            {!u?.addresses.length ? (
              <p className="text-[13px] text-subtle">
                {row.registered ? 'No saved addresses.' : 'Guests don’t have saved addresses.'}
              </p>
            ) : (
              <ul className="space-y-3">
                {u.addresses.map((a) => (
                  <li key={a.id} className="text-[13px] leading-relaxed text-charcoal">
                    {a.isDefault && <span className="mb-0.5 block text-[11px] font-semibold text-ink">Default</span>}
                    {[a.houseNumber, a.street].filter(Boolean).join(' ')}, {a.city}, {a.state}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Internal notes" description="Only visible to admins.">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!note.trim() || !u) return;
                if (await run(() => addCustomerNote(u.id, note), 'Note added')) setNote('');
              }}
              className="flex gap-2"
            >
              <label htmlFor="c-note" className="sr-only">
                Add a note
              </label>
              <input
                id="c-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Prefers evening delivery"
                className="h-9 min-w-0 flex-1 rounded-lg border border-line px-3 text-[13px] focus:border-ink focus:outline-none"
              />
              <AdminButton type="submit" variant="primary" icon={<MessageSquareIcon className="h-4 w-4" />}>
                Add
              </AdminButton>
            </form>
            {notes.length > 0 && (
              <ul className="mt-4 space-y-2.5">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-lg bg-canvas/70 px-3 py-2 text-[13px]">
                    <p className="text-ink">{n.text}</p>
                    <p className="mt-0.5 text-[11px] text-subtle">
                      {n.by} · {formatDateTime(n.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {u && (
        <>
          <ConfirmDialog
            open={dialog === 'block'}
            onClose={() => setDialog(null)}
            onConfirm={() => run(() => setCustomerBlocked(u.id, true), 'Customer blocked')}
            title={`Block ${u.fullName}?`}
            tone="danger"
            confirmLabel="Block customer"
            message="They won’t be able to sign in, place orders or book appointments until you unblock them."
          />

          <ConfirmDialog
            open={dialog === 'delete'}
            onClose={() => setDialog(null)}
            onConfirm={async () => {
              setBusy(true);
              const res = await deleteCustomer(u.id).catch(() => null);
              setBusy(false);
              setDialog(null);
              if (!res?.ok) return toast.error(res?.error ?? 'Could not delete the account.');
              toast.success('Customer deleted');
              router.push('/admin/customers');
            }}
            title={`Delete ${u.fullName}’s account?`}
            tone="danger"
            confirmLabel="Delete account"
            message="Their login, saved addresses, cart and wishlist are removed. Past orders, bookings and reviews stay in your records without the account link."
          />

          <EditCustomerDialog
            key={u.id + String(dialog === 'edit')}
            open={dialog === 'edit'}
            onClose={() => setDialog(null)}
            user={u}
          />
        </>
      )}
    </div>
  );
}

function EditCustomerDialog({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: NonNullable<ReturnType<typeof buildCustomerRows>[number]['user']>;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: user.fullName, email: user.email, phone: user.phone });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Edit customer" className="max-w-md rounded-2xl">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!form.fullName.trim() || !isValidEmail(form.email)) return setError('Enter a name and a valid email.');
          setSaving(true);
          const res = await updateCustomer(user.id, {
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
          }).catch(() => null);
          setSaving(false);
          if (!res?.ok) return setError(res?.error ?? 'Could not save the customer.');
          toast.success('Customer updated');
          onClose();
          router.refresh();
        }}
        className="space-y-4 p-5"
      >
        <AdminInput
          id="ec-name"
          label="Full name"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />
        <AdminInput
          id="ec-email"
          type="email"
          label="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <AdminInput
          id="ec-phone"
          label="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        {error && (
          <p className="text-xs text-red-700" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <AdminButton variant="ghost" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" variant="primary" loading={saving}>
            Save
          </AdminButton>
        </div>
      </form>
    </Modal>
  );
}
