import React from 'react';
import { CheckIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export const checkoutSteps = ['Customer', 'Delivery', 'Review', 'Payment', 'Confirmation'];

export function CheckoutStepper({ current }: {current: number;}) {
  return (
    <nav aria-label="Checkout progress">
      <ol className="flex items-center gap-2">
        {checkoutSteps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} className="flex flex-1 items-center gap-2 last:flex-none" aria-current={active ? 'step' : undefined}>
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-200',
                  done && 'bg-ink text-white',
                  active && 'bg-pink text-ink',
                  !done && !active && 'border border-line bg-white text-subtle'
                )}>
                
                {done ? <CheckIcon className="h-4 w-4" aria-hidden /> : i + 1}
              </span>
              <span className={cn('whitespace-nowrap text-xs font-semibold', active ? 'text-ink' : 'hidden text-subtle md:inline')}>{label}</span>
              {i < checkoutSteps.length - 1 && <span className={cn('h-px flex-1', done ? 'bg-ink' : 'bg-line')} aria-hidden />}
            </li>);

        })}
      </ol>
    </nav>);

}