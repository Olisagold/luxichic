'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckIcon, PackageSearchIcon } from 'lucide-react';
import { useOrders } from '@/contexts/OrdersContext';
import { useAuth } from '@/contexts/AuthContext';
import { CheckoutStepper } from '@/components/checkout/CheckoutStepper';
import { BankTransferInstructions } from '@/components/checkout/BankTransferInstructions';
import { OrderDetailsView } from '@/components/orders/OrderDetailsView';
import { OrderEmailSimulator } from '@/components/orders/OrderEmailSimulator';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { businessConfig } from '@/data/config';
import { receiptMessage } from '@/lib/utils/whatsapp';

export function OrderConfirmation() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { getOrder, ready } = useOrders();
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const order = getOrder(orderNumber);

  if (!ready) return <div className="min-h-[60vh]" aria-busy="true" />;

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-24">
        <EmptyState icon={<PackageSearchIcon className="h-7 w-7" />} title="Order not found" text="We couldn’t find this order on this device. Try looking it up with your order number and email." actions={<Button to="/track-order">Track an order</Button>} />
      </div>);

  }

  const isTransfer = order.paymentMethod === 'bank_transfer';
  const awaiting = isTransfer && order.paymentStatus === 'Pending Verification';

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-10 lg:px-8">
      <CheckoutStepper current={4} />

      <motion.header
        className="mx-auto mt-12 max-w-3xl text-center"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}>
        
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ink text-pink"><CheckIcon className="h-8 w-8" aria-hidden /></span>
        <h1 className="mt-6 font-display text-4xl leading-tight text-ink md:text-6xl">Thank you, {order.customer.fullName.split(' ')[0]}.</h1>
        <p className="mt-3 text-[15px] text-charcoal">
          {order.status === 'Pending' ?
          isTransfer ?
          'Your order has been placed. We’ll confirm it once we’ve verified your payment.' :
          'Your order has been placed and is pending. Our team will process and confirm it shortly.' :
          `Your order is ${order.status.toLowerCase()}.`}
        </p>
        <p className="mt-6 text-xs font-semibold text-subtle">Order {order.orderNumber} · Transaction reference</p>
        <p className="font-mono text-4xl font-semibold tracking-[0.22em] text-ink md:text-5xl">{order.reference}</p>
      </motion.header>

      <div className="mx-auto mt-12 max-w-3xl space-y-6">
        {awaiting &&
        <section className="rounded-[28px] bg-white p-6 md:p-8" aria-labelledby="pay-heading">
            <h2 id="pay-heading" className="font-display text-3xl text-ink">Complete your bank transfer</h2>
            <p className="mt-2 text-sm text-subtle">Payment status: <strong className="text-ink">Pending Verification</strong></p>
            <div className="mt-5"><BankTransferInstructions amount={order.total} reference={order.reference} /></div>
            <WhatsAppButton number={businessConfig.whatsapp.orders} message={receiptMessage(order)} label="Send Payment Receipt on WhatsApp" size="lg" fullWidth className="mt-5" />
            <p className="mt-3 text-xs leading-relaxed text-subtle">
              Attach your transfer receipt in the WhatsApp chat. Sending the receipt does not mark your order as paid — it will be confirmed once LUXICHIC verifies your payment.
            </p>
          </section>
        }
        {!isTransfer && order.status === 'Pending' &&
        <section className="rounded-[28px] bg-white p-6 md:p-8">
            <h2 className="font-display text-3xl text-ink">Pay on delivery</h2>
            <p className="mt-2 text-sm leading-relaxed text-charcoal">Pay for your order when it is delivered. Your order stays pending until it has been processed according to our confirmation procedure.</p>
          </section>
        }
        {!user && !order.accountEmail &&
        <p className="rounded-2xl bg-blush/60 p-5 text-sm leading-relaxed text-ink">
            Once your order is confirmed, we’ll email you a secure link to create your LUXICHIC account — your order will already be in it.
          </p>
        }
        <OrderEmailSimulator order={order} />
      </div>

      <div className="mt-16"><OrderDetailsView order={order} showPaymentActions={false} /></div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button to="/hairs" variant="outline">Continue Shopping</Button>
        <Button to={user ? `/account/orders/${order.orderNumber}` : `/track-order?order=${order.orderNumber}`}>Track this order</Button>
      </div>
    </div>);

}