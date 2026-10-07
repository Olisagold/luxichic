import React from 'react';
import { BanknoteIcon, TruckIcon } from 'lucide-react';
import type { PaymentMethod } from '../../types/order';
import { cn } from '../../utils/cn';

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  payOnDeliveryEnabled: boolean;
}

export function PaymentMethodSelector({ value, onChange, payOnDeliveryEnabled }: PaymentMethodSelectorProps) {
  const options = [
  { id: 'bank_transfer' as const, title: 'Bank Transfer', text: 'Transfer to our account using your unique reference.', icon: BanknoteIcon },
  ...(payOnDeliveryEnabled ?
  [{ id: 'pay_on_delivery' as const, title: 'Pay on Delivery', text: 'Pay for your order when it is delivered.', icon: TruckIcon }] :
  [])];


  return (
    <div role="radiogroup" aria-label="Payment method" className="grid gap-3 sm:grid-cols-2">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={cn(
              'flex items-start gap-4 rounded-2xl border p-5 text-left transition-[border-color,background-color] duration-150',
              active ? 'border-ink bg-white ring-1 ring-ink' : 'border-line bg-white hover:border-charcoal'
            )}>
            
            <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', active ? 'border-ink' : 'border-line')}>
              {active && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
            </span>
            <span className="flex-1">
              <span className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                <o.icon className="h-4 w-4 text-gold" aria-hidden /> {o.title}
              </span>
              <span className="mt-1 block text-sm text-subtle">{o.text}</span>
            </span>
          </button>);

      })}
    </div>);

}