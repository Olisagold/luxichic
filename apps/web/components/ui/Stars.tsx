import React from 'react';
import { StarIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function Stars({ rating, size = 'sm', className }: {rating: number;size?: 'sm' | 'md';className?: string;}) {
  const s = size === 'sm' ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]';
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) =>
      <span key={i} className={cn('relative', s)}>
          <StarIcon className={cn('absolute inset-0 text-line', s)} fill="currentColor" strokeWidth={0} aria-hidden />
          <span className="absolute inset-0 overflow-hidden" style={{ width: `${Math.max(0, Math.min(1, rating - i + 1)) * 100}%` }}>
            <StarIcon className={cn('text-gold', s)} fill="currentColor" strokeWidth={0} aria-hidden />
          </span>
        </span>
      )}
    </span>);

}