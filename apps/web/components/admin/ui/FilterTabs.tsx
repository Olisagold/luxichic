'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

interface FilterTabsProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
}

export function FilterTabs<T extends string>({ value, onChange, options, label }: FilterTabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className="no-scrollbar -mx-1 flex gap-1 relative overflow-x-auto px-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[13px] font-semibold transition-colors duration-150',
              active ? 'bg-ink text-white' : 'text-charcoal hover:bg-ink/5',
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span
                className={cn(
                  'rounded-md px-1.5 text-[11px] tabular-nums',
                  active ? 'bg-white/15' : 'bg-canvas text-subtle',
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
