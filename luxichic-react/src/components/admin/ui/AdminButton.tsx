import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2Icon } from 'lucide-react';
import { cn } from '../../../utils/cn';

type Variant = 'primary' | 'pink' | 'outline' | 'ghost' | 'danger' | 'dangerGhost';
type Size = 'xs' | 'sm' | 'md';

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  to?: string;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-charcoal',
  pink: 'bg-pink text-ink hover:bg-pink-hover',
  outline: 'border border-line bg-white text-ink hover:border-ink/40 hover:bg-canvas',
  ghost: 'text-charcoal hover:bg-ink/5',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  dangerGhost: 'text-red-700 hover:bg-red-50'
};

const sizes: Record<Size, string> = {
  xs: 'h-7 gap-1.5 px-2.5 text-xs',
  sm: 'h-8 gap-1.5 px-3 text-[13px]',
  md: 'h-9 gap-2 px-4 text-[13px]'
};

/** Compact, sentence-case button for the admin. */
export function AdminButton({ variant = 'outline', size = 'md', to, loading, icon, className, children, disabled, type = 'button', ...rest }: AdminButtonProps) {
  const classes = cn(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-lg font-semibold',
    'transition-[background-color,color,border-color,transform] duration-150 ease-lux active:scale-[0.98]',
    'disabled:pointer-events-none disabled:opacity-40',
    variants[variant],
    sizes[size],
    className
  );
  const content =
  <>
      {loading ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" aria-hidden /> : icon}
      {children}
    </>;

  if (to && !disabled) return <Link to={to} className={classes}>{content}</Link>;
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>);

}