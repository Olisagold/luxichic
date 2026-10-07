import React from 'react';
import { CheckIcon, XIcon } from 'lucide-react';
import type { Order } from '@/types/order';
import { formatDateTime } from '@/lib/utils/dates';
import { cn } from '@/lib/utils/cn';

const labels: Record<string, string> = { Shipped: 'Shipped / Ready for Pickup' };

export function OrderTimeline({ order }: {order: Order;}) {
  const cancelled = order.status === 'Cancelled';
  const entries = cancelled ? order.timeline.filter((t) => t.at || t.step === 'Cancelled') : order.timeline;
  const currentIndex = entries.findIndex((t) => !t.at);

  return (
    <ol className="relative">
      {entries.map((t, i) => {
        const done = !!t.at;
        const isCurrent = i === currentIndex;
        const isCancel = t.step === 'Cancelled';
        return (
          <li key={t.step} className="relative flex gap-4 pb-7 last:pb-0">
            {i < entries.length - 1 &&
            <span className={cn('absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-px', done ? 'bg-ink' : 'bg-line')} aria-hidden />
            }
            <span
              className={cn(
                'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                isCancel ? 'bg-red-600 text-white' : done ? 'bg-ink text-white' : isCurrent ? 'border-2 border-pink bg-white' : 'border border-line bg-white'
              )}>
              
              {isCancel ? <XIcon className="h-3.5 w-3.5" aria-hidden /> : done ? <CheckIcon className="h-3.5 w-3.5" aria-hidden /> : null}
            </span>
            <div className="pt-0.5">
              <p className={cn('text-sm font-semibold', done || isCurrent ? 'text-ink' : 'text-subtle')}>{labels[t.step] ?? t.step}</p>
              <p className="text-xs text-subtle">{t.at ? formatDateTime(t.at) : isCurrent ? 'In progress' : 'Pending'}</p>
            </div>
          </li>);

      })}
    </ol>);

}