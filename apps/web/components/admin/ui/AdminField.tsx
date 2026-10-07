import React from 'react';
import { cn } from '@/lib/utils/cn';

export const adminInputClass =
'h-9 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-ink placeholder:text-muted transition-[border-color,box-shadow] duration-150 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 disabled:bg-canvas disabled:text-subtle';

interface ShellProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
  optional?: boolean;
}

export function AdminFieldShell({ id, label, hint, error, className, children, optional }: ShellProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 flex items-baseline justify-between gap-2 text-xs font-semibold text-charcoal">
        {label}
        {optional && <span className="font-normal text-muted">Optional</span>}
      </label>
      {children}
      {error ?
      <p id={`${id}-err`} className="mt-1 text-xs text-red-700" role="alert">{error}</p> :
      hint ?
      <p className="mt-1 text-xs text-subtle">{hint}</p> :
      null}
    </div>);

}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {id: string;label: string;hint?: string;error?: string;wrapperClassName?: string;optional?: boolean;prefix?: string;};

export function AdminInput({ id, label, hint, error, wrapperClassName, optional, prefix, className, ...rest }: InputProps) {
  return (
    <AdminFieldShell id={id} label={label} hint={hint} error={error} className={wrapperClassName} optional={optional}>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-subtle">{prefix}</span>}
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className={cn(adminInputClass, prefix && 'pl-7', error && 'border-red-400', className)}
          {...rest} />
        
      </div>
    </AdminFieldShell>);

}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {id: string;label: string;options: {value: string;label: string;}[];hint?: string;error?: string;wrapperClassName?: string;};

export function AdminSelect({ id, label, options, hint, error, wrapperClassName, className, ...rest }: SelectProps) {
  return (
    <AdminFieldShell id={id} label={label} hint={hint} error={error} className={wrapperClassName}>
      <select id={id} className={cn(adminInputClass, 'pr-8', error && 'border-red-400', className)} {...rest}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </AdminFieldShell>);

}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {id: string;label: string;hint?: string;error?: string;wrapperClassName?: string;optional?: boolean;};

export function AdminTextarea({ id, label, hint, error, wrapperClassName, optional, className, ...rest }: TextareaProps) {
  return (
    <AdminFieldShell id={id} label={label} hint={hint} error={error} className={wrapperClassName} optional={optional}>
      <textarea id={id} className={cn(adminInputClass, 'h-auto min-h-[88px] py-2 leading-relaxed', error && 'border-red-400', className)} {...rest} />
    </AdminFieldShell>);

}