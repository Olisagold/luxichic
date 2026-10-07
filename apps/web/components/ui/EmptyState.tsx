import React from 'react';
import { cn } from '@/lib/utils/cn';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  text?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, text, actions, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center rounded-[28px] bg-white px-6 py-16 text-center', className)}>
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blush text-pink-deep">{icon}</span>
      <p className="mt-5 font-display text-3xl text-ink">{title}</p>
      {text && <p className="mt-2 max-w-md text-sm leading-relaxed text-subtle">{text}</p>}
      {actions && <div className="mt-7 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>);

}