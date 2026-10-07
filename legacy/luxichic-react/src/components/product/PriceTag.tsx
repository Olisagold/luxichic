import React from 'react';
import { formatNaira } from '../../utils/currency';
import { cn } from '../../utils/cn';

interface PriceTagProps {
  price: number;
  original?: number;
  size?: 'sm' | 'lg';
  light?: boolean;
  className?: string;
}

export function PriceTag({ price, original, size = 'sm', light, className }: PriceTagProps) {
  const discounted = !!original && original > price;
  return (
    <p className={cn('flex flex-wrap items-baseline gap-x-2', className)}>
      <span className={cn('font-semibold tabular-nums', light ? 'text-white' : 'text-ink', size === 'lg' ? 'text-2xl' : 'text-[15px]')}>
        <span className="sr-only">{discounted ? 'Sale price: ' : 'Price: '}</span>
        {formatNaira(price)}
      </span>
      {discounted &&
      <span className={cn('tabular-nums line-through', light ? 'text-white/60' : 'text-subtle', size === 'lg' ? 'text-base' : 'text-xs')}>
          <span className="sr-only">Original price: </span>
          {formatNaira(original)}
        </span>
      }
    </p>);

}