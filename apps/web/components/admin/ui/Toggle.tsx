'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  /** Visually hide the label (still announced). */
  srOnlyLabel?: boolean;
  className?: string;
}

export function Toggle({ checked, onChange, label, description, disabled, srOnlyLabel, className }: ToggleProps) {
  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={srOnlyLabel ? label : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 disabled:opacity-40',
        checked ? 'bg-ink' : 'bg-line',
      )}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 700, damping: 40 }}
        className={cn('absolute h-4 w-4 rounded-full bg-white shadow-sm', checked ? 'right-0.5' : 'left-0.5')}
      />
    </button>
  );

  if (srOnlyLabel) return <span className={className}>{control}</span>;

  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink">{label}</p>
        {description && <p className="mt-0.5 text-xs text-subtle">{description}</p>}
      </div>
      {control}
    </div>
  );
}
