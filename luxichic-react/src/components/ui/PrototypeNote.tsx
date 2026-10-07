import React from 'react';
import { FlaskConicalIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

/** Clearly labels simulated backend behaviour so nothing reads as actually sent or paid. */
export function PrototypeNote({ title = 'Prototype preview', children, className }: {title?: string;children: React.ReactNode;className?: string;}) {
  return (
    <aside className={cn('rounded-2xl border border-dashed border-gold bg-champagne/30 p-5', className)} aria-label={title}>
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a5f33]">
        <FlaskConicalIcon className="h-4 w-4" aria-hidden /> {title}
      </p>
      <div className="mt-3 text-sm leading-relaxed text-charcoal">{children}</div>
    </aside>);

}