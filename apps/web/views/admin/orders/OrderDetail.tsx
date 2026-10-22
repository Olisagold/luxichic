'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  MailIcon,
  MessageSquareIcon,
  PackageCheckIcon,
  TrashIcon,
  TruckIcon,
  XCircleIcon,
} from 'lucide-react';
import type { OrderStatus } from '@/types/order';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  addOrderNote,
  confirmPayment as confirmPaymentAction,
  deleteOrder,
  setOrderStatus,
} from '@/lib/orders/admin-actions';
import type { AdminOrder, OrderActivity, OrderNote } from '@/lib/orders/admin-queries';
import { PageHeader } from '@/components/admin/ui/PageHeader';
import { Panel } from '@/components/admin/ui/Panel';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminEmpty } from '@/components/admin/ui/AdminEmpty';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { EmailPreviewDialog, type EmailPreview } from '@/components/admin/EmailPreviewDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { OrderItemsList } from '@/components/checkout/OrderItemsList';
import { formatAddress, paymentMethodLabel } from '@/components/orders/OrderDetailsView';
import { formatNaira } from '@/lib/utils/currency';
import { formatDateTime } from '@/lib/utils/dates';

const nextStep: Partial<Record<OrderStatus, { status: OrderStatus; label: string; icon: React.ReactNode }>> = {
  Confirmed: { status: 'Processing', label: 'Start processing', icon: <PackageCheckIcon className="h-4 w-4" /> },
  Processing: { status: 'Shipped', label: 'Mark shipped / ready', icon: <TruckIcon className="h-4 w-4" /> },
  Shipped: { status: 'Delivered', label: 'Mark delivered', icon: <CheckCircle2Icon className="h-4 w-4" /> },
};

/** One order, loaded on the server with its notes and admin activity; `data` is null if it doesn't exist. */
export function OrderDetail({
  data,
}: {
  data: { order: AdminOrder; notes: OrderNote[]; activity: OrderActivity[] } | null;
}) {
  const router = useRouter();
  const { can } = useAdminAuth();
  const order = data?.order;
  const notes = data?.notes ?? [];
  const activity = data?.activity ?? [];
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<'confirm' | 'cancel' | 'delete' | 'pod' | null>(null);
  const [justConfirmed, setJustConfirmed] = useState(false);
  const [email, setEmail] = useState<EmailPreview | null>(null);
  const [note, setNote] = useState('');

  if (!order) {
    return (
      <div className="rounded-xl border border-line bg-white">
        <AdminEmpty
          icon={<XCircleIcon className="h-5 w-5" />}
          title="Order not found"
          action={<AdminButton to="/admin/orders">Back to orders</AdminButton>}
        />
      </div>
    );
  }

  const awaitingTransfer =
    order.paymentMethod === 'bank_transfer' &&
    order.paymentStatus === 'Pending Verification' &&
    order.status === 'Pending';
  const pendingPod = order.paymentMethod === 'pay_on_delivery' && order.status === 'Pending';
  const step = nextStep[order.status];
  /** The customer's latest email for this order. */
  const latestEmail: EmailPreview = {
    order: order.orderNumber,
    event:
      order.status === 'Pending'
        ? 'placed'
        : order.status === 'Cancelled'
          ? 'cancelled'
          : order.status === 'Shipped'
            ? 'shipped'
            : order.status === 'Delivered'
              ? 'delivered'
              : order.paymentMethod === 'bank_transfer'
                ? 'payment_confirmed'
                : 'confirmed',
  };

  /** Runs a server action, then shows the result and reloads the order. */
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

  const confirmPayment = async () => {
    if (await run(() => confirmPaymentAction(order.orderNumber), 'Payment confirmed')) setJustConfirmed(true);
  };

  const confirmPod = () => run(() => setOrderStatus(order.orderNumber, 'Confirmed'), 'Order confirmed');

  return (
    <div>
      <PageHeader
        back={{ to: '/admin/orders', label: 'Orders' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {order.orderNumber} <StatusBadge status={order.status} />
          </span>
        }
        description={`Placed ${formatDateTime(order.createdAt)} · ${order.accountEmail ? 'Registered customer' : 'Guest checkout'}`}
        actions={
          <>
            <AdminButton icon={<MailIcon className="h-4 w-4" />} onClick={() => setEmail(latestEmail)}>
              Preview email
            </AdminButton>
            {step && can('orders.edit') && (
              <AdminButton
                variant="primary"
                icon={step.icon}
                disabled={busy}
                onClick={() =>
                  run(() => setOrderStatus(order.orderNumber, step.status), `Marked ${step.status.toLowerCase()}`)
                }
              >
                {step.label}
              </AdminButton>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {awaitingTransfer && (
            <section aria-labelledby="verify" className="overflow-hidden rounded-xl border-2 border-ink bg-white">
              <div className="flex items-center gap-2 bg-ink px-5 py-3 text-white">
                <AlertTriangleIcon className="h-4 w-4 text-pink" aria-hidden />
                <h2 id="verify" className="text-sm font-semibold">
                  Bank transfer awaiting verification
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-subtle">Expected amount</p>
                  <p className="text-2xl font-bold tabular-nums text-ink">{formatNaira(order.total)}</p>
                </div>
                <div>
                  <p className="text-xs text-subtle">Narration / reference</p>
                  <p className="font-mono text-2xl font-bold tracking-wider text-ink">{order.reference}</p>
                </div>
                <div>
                  <p className="text-xs text-subtle">From</p>
                  <p className="text-[13px] font-semibold text-ink">{order.customer.fullName}</p>
                  <p className="text-xs text-subtle">{order.customer.phone}</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 border-t border-line bg-canvas/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-charcoal">
                  Check your bank app for a transfer with this exact amount and reference. A WhatsApp receipt alone is
                  not proof of payment.
                </p>
                {can('orders.confirmPayment') ? (
                  <AdminButton variant="pink" onClick={() => setDialog('confirm')}>
                    Confirm payment
                  </AdminButton>
                ) : (
                  <span className="text-xs text-subtle">You can’t confirm payments.</span>
                )}
              </div>
            </section>
          )}

          <AnimatePresence>
            {justConfirmed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
                role="status"
              >
                <motion.span
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white"
                >
                  <CheckCircle2Icon className="h-5 w-5" aria-hidden />
                </motion.span>
                <div className="min-w-0 flex-1 text-[13px]">
                  <p className="font-semibold text-emerald-900">Payment confirmed and order moved to Confirmed</p>
                  <p className="text-emerald-800">
                    Recorded in the activity log under your name. The customer has been emailed that their payment was
                    received.
                  </p>
                </div>
                <AdminButton
                  size="sm"
                  onClick={() => setEmail({ order: order.orderNumber, event: 'payment_confirmed' })}
                >
                  See email
                </AdminButton>
              </motion.div>
            )}
          </AnimatePresence>

          {pendingPod && can('orders.edit') && (
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] text-charcoal">
                <span className="font-semibold text-ink">Pay on Delivery.</span> Confirm once you’ve checked stock and
                the delivery address.
              </p>
              <AdminButton variant="primary" onClick={() => setDialog('pod')}>
                Confirm order
              </AdminButton>
            </div>
          )}

          <Panel title={`Items (${order.items.reduce((s, i) => s + i.quantity, 0)})`} bodyClassName="px-5 py-0">
            <OrderItemsList items={order.items} />
            <dl className="space-y-1.5 border-t border-line py-4 text-[13px]">
              <Row label="Subtotal" value={formatNaira(order.subtotal)} />
              <Row
                label={`Delivery (${order.address.state})`}
                value={order.deliveryFee ? formatNaira(order.deliveryFee) : 'Free'}
              />
              {order.discount > 0 && <Row label="Discount" value={`−${formatNaira(order.discount)}`} />}
              <div className="flex justify-between pt-1.5 text-sm font-bold text-ink">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatNaira(order.total)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Internal notes" description="Only visible to admins.">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!note.trim()) return;
                if (await run(() => addOrderNote(order.orderNumber, note), 'Note added')) setNote('');
              }}
              className="flex gap-2"
            >
              <label htmlFor="order-note" className="sr-only">
                Add a note
              </label>
              <input
                id="order-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Customer asked for evening delivery"
                className="h-9 flex-1 rounded-lg border border-line px-3 text-[13px] focus:border-ink focus:outline-none"
              />
              <AdminButton type="submit" variant="primary" icon={<MessageSquareIcon className="h-4 w-4" />}>
                Add
              </AdminButton>
            </form>
            {notes.length > 0 && (
              <ul className="mt-4 space-y-3">
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

        <div className="space-y-5">
          <Panel title="Payment">
            <dl className="space-y-2 text-[13px]">
              <Row label="Method" value={paymentMethodLabel(order.paymentMethod)} />
              <div className="flex items-center justify-between">
                <dt className="text-subtle">Status</dt>
                <dd>
                  <StatusBadge status={order.paymentStatus} />
                </dd>
              </div>
              <Row label="Amount expected" value={formatNaira(order.total)} />
              <Row label="Transaction ref" value={<span className="font-mono font-semibold">{order.reference}</span>} />
              {order.confirmedBy && <Row label="Confirmed by" value={order.confirmedBy} />}
            </dl>
          </Panel>

          <Panel title="Customer">
            <p className="text-[13px] font-semibold text-ink">{order.customer.fullName}</p>
            <p className="text-[13px] text-charcoal">{order.customer.email}</p>
            <p className="text-[13px] text-charcoal">{order.customer.phone}</p>
            <p className="mt-3 text-xs font-semibold text-subtle">Delivery address</p>
            <address className="mt-1 text-[13px] not-italic leading-relaxed text-charcoal">
              {formatAddress(order.address).map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </address>
            {order.address.instructions && (
              <p className="mt-2 rounded-lg bg-canvas px-3 py-2 text-xs text-charcoal">
                “{order.address.instructions}”
              </p>
            )}
          </Panel>

          <Panel title="Timeline">
            <OrderTimeline order={order} />
          </Panel>

          {activity.length > 0 && (
            <Panel title="Admin activity">
              <ul className="space-y-2.5 text-[13px]">
                {activity.slice(0, 8).map((a) => (
                  <li key={a.id}>
                    <p className="text-ink">
                      <span className="font-semibold">{a.adminName}</span> {a.action.toLowerCase()}
                    </p>
                    <p className="text-[11px] text-subtle">{formatDateTime(a.at)}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <div className="flex flex-wrap gap-2">
            {order.status !== 'Cancelled' && order.status !== 'Delivered' && can('orders.edit') && (
              <AdminButton
                variant="dangerGhost"
                icon={<XCircleIcon className="h-4 w-4" />}
                onClick={() => setDialog('cancel')}
              >
                Cancel order
              </AdminButton>
            )}
            {can('orders.delete') && (
              <AdminButton
                variant="dangerGhost"
                icon={<TrashIcon className="h-4 w-4" />}
                onClick={() => setDialog('delete')}
              >
                Delete
              </AdminButton>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={dialog === 'confirm'}
        onClose={() => setDialog(null)}
        onConfirm={confirmPayment}
        title="Confirm this payment?"
        confirmLabel="Confirm payment"
        message={
          <>
            <strong>
              Only confirm payment after verifying that the funds have actually been received in the LUXICHIC business
              account.
            </strong>{' '}
            This can’t be undone from the dashboard.
          </>
        }
        acknowledgement={`I have verified ${formatNaira(order.total)} with reference ${order.reference} in the business account.`}
      />

      <ConfirmDialog
        open={dialog === 'pod'}
        onClose={() => setDialog(null)}
        onConfirm={confirmPod}
        title="Confirm this Pay on Delivery order?"
        message="The customer is emailed that their order is confirmed. Payment is collected on delivery."
        confirmLabel="Confirm order"
      />
      <ConfirmDialog
        open={dialog === 'cancel'}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => run(() => setOrderStatus(order.orderNumber, 'Cancelled', reason), 'Order cancelled')}
        title="Cancel this order?"
        tone="danger"
        confirmLabel="Cancel order"
        message="The items go back into stock and any promo-code use is given back."
        requireReason={{ label: 'Reason', placeholder: 'e.g. Payment not received within 48 hours' }}
      />

      <ConfirmDialog
        open={dialog === 'delete'}
        onClose={() => setDialog(null)}
        onConfirm={async () => {
          setBusy(true);
          const res = await deleteOrder(order.orderNumber).catch(() => null);
          setBusy(false);
          setDialog(null);
          if (!res?.ok) return toast.error(res?.error ?? 'Could not delete the order.');
          toast.success('Order deleted');
          router.push('/admin/orders');
        }}
        title="Delete this order permanently?"
        tone="danger"
        confirmLabel="Delete order"
        message="Prefer cancelling. Deletion removes the order from the customer’s history and can’t be undone."
      />

      <EmailPreviewDialog preview={email} onClose={() => setEmail(null)} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-subtle">{label}</dt>
      <dd className="text-right tabular-nums text-ink">{value}</dd>
    </div>
  );
}
