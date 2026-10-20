'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2Icon, MailIcon } from 'lucide-react';
import { requestEmailConfirmation } from '@/lib/auth/customer-actions';
import { Button } from '@/components/ui/Button';

const describe = (orders: number, appointments: number) =>
  [
    orders ? `${orders} order${orders === 1 ? '' : 's'}` : '',
    appointments ? `${appointments} appointment${appointments === 1 ? '' : 's'}` : '',
  ]
    .filter(Boolean)
    .join(' and ');

/**
 * Earlier guest orders and bookings made with this account's email: after confirming, what was added; before,
 * how many are waiting and a button to (re)send the confirmation email. Never shows their details until then.
 */
export function LinkedRecordsNotice({ pending }: { pending: { orders: number; appointments: number } }) {
  const params = useSearchParams();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (params.get('confirmed')) {
    const added = describe(Number(params.get('orders') ?? 0), Number(params.get('appointments') ?? 0));
    return (
      <div className="flex items-start gap-4 rounded-[24px] bg-ink p-6 text-white" role="status">
        <CheckCircle2Icon className="h-6 w-6 shrink-0 text-pink" aria-hidden />
        <div>
          <p className="font-display text-2xl">Email confirmed</p>
          <p className="mt-1 text-sm text-white/75">
            {added
              ? `We’ve added your earlier ${added} to your account, and saved your delivery address.`
              : 'Your account is all set.'}
          </p>
        </div>
      </div>
    );
  }
  if (params.get('confirm') === 'invalid') {
    return (
      <p className="rounded-[24px] bg-blush p-5 text-sm text-ink" role="alert">
        That confirmation link is invalid or has expired, or it was sent to another account.
        {pending.orders + pending.appointments > 0 ? ' Send a new one below.' : ''}
      </p>
    );
  }

  const found = describe(pending.orders, pending.appointments);
  if (!found) return null;

  const send = async () => {
    setSending(true);
    const res = await requestEmailConfirmation().catch(() => null);
    setSending(false);
    if (!res?.ok) return toast.error(res?.error ?? 'The email couldn’t be sent. Please try again later.');
    setSent(true);
  };

  return (
    <section aria-labelledby="earlier-orders" className="flex flex-wrap items-center gap-4 rounded-[24px] bg-blush p-6">
      <MailIcon className="h-6 w-6 shrink-0 text-pink-deep" aria-hidden />
      <div className="min-w-0 flex-1">
        <h2 id="earlier-orders" className="font-semibold text-ink">
          We found {found} made with your email before you signed up
        </h2>
        <p className="mt-1 text-sm text-charcoal">
          {sent
            ? 'Check your inbox (and spam) for “Confirm your email” and tap the button. They’ll appear here.'
            : 'Confirm your email to add them to your account. We’ll send you a link.'}
        </p>
      </div>
      {!sent && (
        <Button onClick={send} loading={sending}>
          Send confirmation email
        </Button>
      )}
    </section>
  );
}
