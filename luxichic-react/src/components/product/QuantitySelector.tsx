import React from 'react';
import { MinusIcon, PlusIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface QuantitySelectorProps {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  size?: 'sm' | 'lg';
  label?: string;
}

export function QuantitySelector({ value, onChange, max = 99, size = 'sm', label = 'Quantity' }: QuantitySelectorProps) {
  const h = size === 'lg' ? 'h-14' : 'h-10';
  const btn = size === 'lg' ? 'w-12' : 'w-9';
  return (
    <div className={cn('inline-flex items-center rounded-full border border-line bg-white', h)} role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        className={cn('flex h-full items-center justify-center rounded-l-full text-charcoal transition-colors duration-150 hover:bg-ivory disabled:opacity-30', btn)}
        aria-label="Decrease quantity">
        
        <MinusIcon className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={cn('flex h-full items-center justify-center rounded-r-full text-charcoal transition-colors duration-150 hover:bg-ivory disabled:opacity-30', btn)}
        aria-label="Increase quantity">
        
        <PlusIcon className="h-3.5 w-3.5" />
      </button>
    </div>);

}