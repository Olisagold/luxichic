import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2Icon } from 'lucide-react';
import { cn } from '../../utils/cn';

type Variant = 'primary' | 'pink' | 'outline' | 'ghost' | 'light' | 'outlineLight';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  to?: string;
  href?: string;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-charcoal',
  pink: 'bg-pink text-ink hover:bg-pink-hover',
  outline: 'border border-ink text-ink hover:bg-ink hover:text-white',
  ghost: 'text-ink hover:bg-ink/5',
  light: 'bg-white text-ink hover:bg-blush',
  outlineLight: 'border border-white/40 text-white hover:bg-white hover:text-ink'
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[11px]',
  md: 'h-12 px-6 text-xs',
  lg: 'h-14 px-8 text-xs'
};

export function Button({
  variant = 'primary', size = 'md', to, href, loading, fullWidth, className, children, disabled, onClick, type = 'button', ...rest
}: ButtonProps) {
  const classes = cn(
    'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold uppercase tracking-[0.14em]',
    'transition-[background-color,color,border-color,transform] duration-200 ease-lux active:scale-[0.98]',
    'disabled:pointer-events-none disabled:opacity-40',
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    className
  );

  const content =
  <>
      {loading && <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </>;


  if (to && !disabled) {
    return (
      <Link to={to} className={classes} onClick={onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>}>
        {content}
      </Link>);

  }
  if (href && !disabled) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {content}
      </a>);

  }
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} onClick={onClick} {...rest}>
      {content}
    </button>);

}