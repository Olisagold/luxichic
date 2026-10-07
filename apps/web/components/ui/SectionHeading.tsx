import React from 'react';
import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import { cn } from '@/lib/utils/cn';

interface SectionHeadingProps {
  title: React.ReactNode;
  text?: string;
  action?: { label: string; to: string };
  light?: boolean;
  className?: string;
  /** Leaves room on desktop for carousel arrows positioned at the top-right. */
  reserveArrows?: boolean;
}

export function SectionHeading({ title, text, action, light, className, reserveArrows }: SectionHeadingProps) {
  return (
    <Reveal className={cn('mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-end md:justify-between', className)}>
      <div className="max-w-2xl">
        <h2 className={cn('font-display text-4xl leading-[1.05] md:text-6xl', light ? 'text-white' : 'text-ink')}>
          {title}
        </h2>
        {text && (
          <p className={cn('mt-4 text-[15px] leading-relaxed', light ? 'text-white/70' : 'text-subtle')}>{text}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.to}
          className={cn(
            'group inline-flex shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.16em]',
            light ? 'text-pink' : 'text-ink hover:text-pink-deep',
            reserveArrows && 'md:mr-28',
          )}
        >
          {action.label}
          <ArrowRightIcon
            className="h-4 w-4 transition-transform duration-200 ease-lux group-hover:translate-x-1"
            aria-hidden
          />
        </Link>
      )}
    </Reveal>
  );
}
