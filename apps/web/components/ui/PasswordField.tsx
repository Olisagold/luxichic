'use client';

import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { FieldShell, inputClass } from '@/components/ui/FormField';
import { passwordStrength } from '@/lib/utils/validation';
import { cn } from '@/lib/utils/cn';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  showStrength?: boolean;
  autoComplete?: string;
  hint?: string;
}

const barColors = ['bg-line', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-600'];

export function PasswordField({ id, label, value, onChange, error, showStrength, autoComplete = 'current-password', hint }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const strength = passwordStrength(value);

  return (
    <FieldShell id={id} label={label} error={error} hint={!showStrength ? hint : undefined}>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : showStrength ? `${id}-strength` : undefined}
          className={cn(inputClass, 'pr-12', error ? 'border-red-400' : 'border-line')} />
        
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-subtle transition-colors duration-150 hover:text-ink"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}>
          
          {visible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        </button>
      </div>
      {showStrength && value &&
      <div id={`${id}-strength`} className="mt-2" aria-live="polite">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) =>
          <span
            key={i}
            className={cn('h-1 flex-1 rounded-full transition-colors duration-200', i <= strength.score ? barColors[strength.score] : 'bg-line')} />

          )}
          </div>
          <p className="mt-1 text-xs text-subtle">
            Password strength: <span className="font-semibold text-charcoal">{strength.label}</span>
          </p>
        </div>
      }
    </FieldShell>);

}