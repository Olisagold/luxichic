'use client';

import React from 'react';
import { toast } from 'sonner';
import { BellRingIcon } from 'lucide-react';
import { usePush } from '@/hooks/usePush';
import { pushCopy } from '@/components/push/pushCopy';
import { Button } from '@/components/ui/Button';

/** Lets a signed-in customer get order and appointment updates as phone notifications. */
export function PushCard() {
  const push = usePush('customer');
  const { status, busy } = push;
  if (status === 'checking' || status === 'unsupported') return null;

  const enable = async () => {
    const error = await push.enable();
    if (error) toast.error(error);
    else
      toast.success('Notifications are on', {
        description: 'We’ll let you know when your orders and bookings change.',
      });
  };

  return (
    <section aria-labelledby="push-title" className="flex flex-wrap items-center gap-4 rounded-[24px] bg-blush p-6">
      <BellRingIcon className="h-6 w-6 shrink-0 text-pink-deep" aria-hidden />
      <div className="min-w-0 flex-1">
        <h2 id="push-title" className="font-semibold text-ink">
          Order and appointment updates on this phone
        </h2>
        <p className="mt-1 text-sm text-charcoal">
          {status === 'off'
            ? 'Payment received, shipped, delivered, appointment confirmed or moved, and a reminder the day before.'
            : pushCopy(status, 'LUXICHIC')}
        </p>
      </div>
      {status === 'off' && (
        <Button onClick={enable} loading={busy}>
          Turn on
        </Button>
      )}
      {status === 'on' && (
        <Button variant="ghost" onClick={() => push.disable()} loading={busy}>
          Turn off
        </Button>
      )}
    </section>
  );
}
