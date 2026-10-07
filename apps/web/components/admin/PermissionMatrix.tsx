'use client';

import React from 'react';
import type { Permission } from '@/types/admin';
import { permissionGroups } from '@/data/adminSeed';
import { cn } from '@/lib/utils/cn';

/** Grouped checkboxes for choosing an admin's permissions. */
export function PermissionMatrix({
  value,
  onChange,
  disabled,
}: {
  value: Permission[];
  onChange?: (v: Permission[]) => void;
  disabled?: boolean;
}) {
  const toggle = (p: Permission) => onChange?.(value.includes(p) ? value.filter((x) => x !== p) : [...value, p]);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {permissionGroups.map((g) => {
        const keys = g.items.map((i) => i.key);
        const all = keys.every((k) => value.includes(k));
        return (
          <fieldset key={g.label} className="rounded-lg border border-line p-3" disabled={disabled}>
            <legend className="sr-only">{g.label}</legend>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink">{g.label}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() =>
                    onChange?.(all ? value.filter((v) => !keys.includes(v)) : Array.from(new Set([...value, ...keys])))
                  }
                  className="text-[11px] font-semibold text-subtle hover:text-ink"
                >
                  {all ? 'Clear' : 'All'}
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {g.items.map((i) => (
                <label
                  key={i.key}
                  className={cn(
                    'flex items-center gap-2 text-[13px]',
                    disabled ? 'text-subtle' : 'cursor-pointer text-charcoal',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={value.includes(i.key)}
                    onChange={() => toggle(i.key)}
                    className="h-3.5 w-3.5 accent-ink"
                  />
                  {i.label}
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
