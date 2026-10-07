import React from 'react';
import { cn } from '@/lib/utils/cn';

interface FieldShellProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FieldShell({ id, label, error, hint, optional, children, className }: FieldShellProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-xs font-semibold text-charcoal">
        {label}
        {optional && <span className="font-normal text-subtle">Optional</span>}
      </label>
      {children}
      {error ?
      <p id={`${id}-error`} className="mt-1.5 text-xs text-red-700" role="alert">
          {error}
        </p> :
      hint ?
      <p id={`${id}-hint`} className="mt-1.5 text-xs text-subtle">
          {hint}
        </p> :
      null}
    </div>);

}

export const inputClass =
'h-12 w-full rounded-xl border bg-white px-4 text-sm text-ink placeholder:text-muted transition-[border-color,box-shadow] duration-150 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 disabled:bg-ivory disabled:text-subtle';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  wrapperClassName?: string;
}

export function TextField({ id, label, error, hint, optional, wrapperClassName, className, ...rest }: InputProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional} className={wrapperClassName}>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(inputClass, error ? 'border-red-400' : 'border-line', className)}
        {...rest} />
      
    </FieldShell>);

}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  wrapperClassName?: string;
}

export function TextAreaField({ id, label, error, hint, optional, wrapperClassName, className, ...rest }: TextAreaProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional} className={wrapperClassName}>
      <textarea
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(inputClass, 'h-auto min-h-[110px] py-3', error ? 'border-red-400' : 'border-line', className)}
        {...rest} />
      
    </FieldShell>);

}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  error?: string;
  options: {value: string;label: string;}[];
  placeholder?: string;
  wrapperClassName?: string;
}

export function SelectField({ id, label, error, options, placeholder, wrapperClassName, className, ...rest }: SelectProps) {
  return (
    <FieldShell id={id} label={label} error={error} className={wrapperClassName}>
      <select
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(inputClass, error ? 'border-red-400' : 'border-line', className)}
        {...rest}>
        
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) =>
        <option key={o.value} value={o.value}>
            {o.label}
          </option>
        )}
      </select>
    </FieldShell>);

}