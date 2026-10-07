import React from 'react';
import { Link } from 'react-router-dom';
import { MailIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { Order } from '../../types/order';
import { PrototypeNote } from '../ui/PrototypeNote';
import { Button } from '../ui/Button';
import { useOrders } from '../../contexts/OrdersContext';
import { formatNaira } from '../../utils/currency';
import { formatDateTime } from '../../utils/dates';
import { formatAddress, paymentMethodLabel } from './OrderDetailsView';

function EmailPreview({ subject, to, children }: {subject: string;to: string;children: React.ReactNode;}) {
  return (
    <details className="group mt-3 rounded-xl border border-line bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm">
        <MailIcon className="h-4 w-4 shrink-0 text-gold" aria-hidden />
        <span className="flex-1 font-semibold text-ink">{subject}</span>
        <span className="text-xs text-subtle group-open:hidden">Preview</span>
        <span className="hidden text-xs text-subtle group-open:inline">Hide</span>
      </summary>
      <div className="space-y-2 border-t border-line px-4 py-4 text-sm text-charcoal">
        <p className="text-xs text-subtle">To: {to}</p>
        {children}
      </div>
    </details>);

}

/** Shows what the backend will send (SMTP / WhatsApp API) and lets the demo simulate admin confirmation. */
export function OrderEmailSimulator({ order }: {order: Order;}) {
  const { simulateConfirmation } = useOrders();
  const confirmed = order.status !== 'Pending' && order.status !== 'Cancelled';
  const tokenValid = order.accountToken && new Date(order.accountToken.expiresAt).getTime() > Date.now();

  return (
    <PrototypeNote>
      <p>
        No emails or WhatsApp messages are actually sent in this prototype. Once the backend is connected, the customer receives the emails below and the
        LUXICHIC administrator receives the order details through the WhatsApp API.
      </p>

      <EmailPreview subject={`Order received — ${order.orderNumber} (pending)`} to={order.customer.email}>
        <p>Hi {order.customer.fullName.split(' ')[0]}, thank you for shopping with LUXICHIC. Your order is pending.</p>
        <p>Order number: <strong>{order.orderNumber}</strong> · Transaction reference: <strong>{order.reference}</strong></p>
        <ul className="list-inside list-disc">
          {order.items.map((i) => <li key={i.key}>{i.name} × {i.quantity}</li>)}
        </ul>
        <p>Total: <strong>{formatNaira(order.total)}</strong> · {paymentMethodLabel(order.paymentMethod)}</p>
        <p>Deliver to: {formatAddress(order.address).join(', ')}</p>
        <p>
          {order.paymentMethod === 'bank_transfer' ?
          `Transfer ${formatNaira(order.total)} using ${order.reference} as your narration, then send your receipt on WhatsApp.` :
          'Pay for your order when it is delivered.'}
        </p>
      </EmailPreview>

      {!confirmed && order.status === 'Pending' &&
      <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
          size="sm"
          variant="outline"
          onClick={() => {
            simulateConfirmation(order.orderNumber);
            toast.success('Simulated: the administrator confirmed this order');
          }}>
          
            Simulate admin confirmation
          </Button>
          <span className="text-xs text-subtle">In production, this happens in the admin dashboard after payment is verified.</span>
        </div>
      }

      {confirmed &&
      <EmailPreview subject={`Your order ${order.orderNumber} is confirmed`} to={order.customer.email}>
          <p>Great news — your order has been confirmed.</p>
          <p>Payment status: <strong>{order.paymentStatus}</strong> · Order status: <strong>{order.status}</strong></p>
          <ul className="list-inside list-disc">
            {order.items.map((i) => <li key={i.key}>{i.name} × {i.quantity}</li>)}
          </ul>
          {order.accountToken && !order.accountEmail &&
        <div className="mt-3 rounded-xl bg-blush/60 p-4">
              <p className="font-semibold text-ink">Create your LUXICHIC account</p>
              <p className="mt-1 text-xs text-subtle">
                {tokenValid ? `Secure link — expires ${formatDateTime(order.accountToken.expiresAt)}.` : 'This link has expired.'}
              </p>
              {tokenValid &&
          <Link
            to={`/create-account?token=${order.accountToken.token}`}
            className="mt-3 inline-flex h-9 items-center rounded-full bg-ink px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
            
                  Create my account
                </Link>
          }
            </div>
        }
        </EmailPreview>
      }
    </PrototypeNote>);

}