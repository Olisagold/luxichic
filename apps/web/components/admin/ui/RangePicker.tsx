'use client';

import React from 'react';
import type { RangeKey } from '@/lib/utils/adminAnalytics';
import { rangeOptions } from '@/lib/utils/adminAnalytics';
import { adminInputClass } from '@/components/admin/ui/AdminField';
import { cn } from '@/lib/utils/cn';

interface RangePickerProps {
  value: RangeKey;
  onChange: (v: RangeKey) => void;
  custom: { from: string; to: string };
  onCustom: (v: { from: string; to: string }) => void;
}

export function RangePicker({ value, onChange, custom, onCustom }: RangePickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="no-scrollbar flex overflow-x-auto rounded-lg border border-line bg-white p-0.5"
        role="group"
        aria-label="Date range"
      >
        {rangeOptions.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={cn(
              'h-7 shrink-0 whitespace-nowrap rounded-md px-2.5 text-xs font-semibold transition-colors duration-150',
              value === o.value ? 'bg-ink text-white' : 'text-charcoal hover:bg-canvas',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      {value === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label="From"
            value={custom.from}
            onChange={(e) => onCustom({ ...custom, from: e.target.value })}
            className={cn(adminInputClass, 'h-8 w-36')}
          />
          <span className="text-xs text-subtle">to</span>
          <input
            type="date"
            aria-label="To"
            value={custom.to}
            onChange={(e) => onCustom({ ...custom, to: e.target.value })}
            className={cn(adminInputClass, 'h-8 w-36')}
          />
        </div>
      )}
    </div>
  );
}
