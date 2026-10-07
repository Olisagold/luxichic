'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Order } from '@/types/order';
import { useOrders } from '@/contexts/OrdersContext';
import { useAuth } from '@/contexts/AuthContext';
import { OrderDetailsView } from '@/components/orders/OrderDetailsView';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/FormField';
import { isValidEmail, wait } from '@/lib/utils/validation';

export function TrackOrder() {
  const params = useSearchParams();
  const { lookupOrder, getOrder } = useOrders();
  const { user } = useAuth();
  const [orderNumber, setOrderNumber] = useState(params.get('order') ?? '');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState<string | null>(null);
  const order: Order | undefined = found ? getOrder(found) : undefined;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!orderNumber.trim()) errs.order = 'Please enter your order number.';
    if (!isValidEmail(email)) errs.email = 'Please enter the email used for the order.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    await wait(600);
    const match = lookupOrder(orderNumber, email);
    setLoading(false);
    if (match) setFound(match.orderNumber);
    else {
      setFound(null);
      setErrors({
        form: 'We couldn’t find an order with those details. Check your order number (e.g. LXC-482913) and email.',
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-10 lg:px-8">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Track an Order' }]} />
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_420px] lg:items-end">
        <div>
          <h1 className="font-display text-5xl text-ink md:text-6xl">Track your order</h1>
          <p className="mt-3 max-w-xl text-[15px] text-subtle">
            Enter the order number from your confirmation email and the email address you used at checkout.
            {user ? (
              <>
                {' '}
                You can also view everything in{' '}
                <Link
                  href="/account/orders"
                  className="font-semibold text-pink-deep underline-offset-4 hover:underline"
                >
                  your order history
                </Link>
                .
              </>
            ) : (
              <>
                {' '}
                Have an account?{' '}
                <Link
                  href="/login?redirect=/account/orders"
                  className="font-semibold text-pink-deep underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
                .
              </>
            )}
          </p>
        </div>
        <form onSubmit={submit} noValidate className="space-y-4 rounded-[28px] bg-white p-6">
          <TextField
            id="track-order"
            label="Order number"
            placeholder="LXC-000000"
            value={orderNumber}
            error={errors.order}
            onChange={(e) => setOrderNumber(e.target.value)}
          />
          <TextField
            id="track-email"
            type="email"
            label="Email address"
            value={email}
            error={errors.email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.form && (
            <p className="text-sm text-red-700" role="alert">
              {errors.form}
            </p>
          )}
          <Button type="submit" fullWidth loading={loading}>
            Find my order
          </Button>
        </form>
      </div>
      {order && (
        <div className="mt-14">
          <OrderDetailsView order={order} />
        </div>
      )}
    </div>
  );
}
