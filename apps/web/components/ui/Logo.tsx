import React from 'react';
import { cn } from '@/lib/utils/cn';

type LogoVariant = 'main' | 'hairs' | 'salon' | 'tools';

/**
 * The supplied logos are square artwork on black, cropped to the artwork and saved as small WebP files in
 * public/images/logos (192px tall: sharp at the largest size shown, about 10 KB each instead of the ~500 KB
 * originals). Width / height of each crop, so the box keeps its shape before the image loads.
 */
const ratios: Record<LogoVariant, number> = { main: 370 / 192, hairs: 358 / 192, salon: 400 / 192, tools: 394 / 192 };

const names: Record<LogoVariant, string> = {
  main: 'LUXICHIC',
  hairs: 'LUXICHIC Hairs',
  salon: 'LUXICHIC Beauty Salon & Spa',
  tools: 'LUXICHIC Wig Tools',
};

export function Logo({ variant = 'main', className }: { variant?: LogoVariant; className?: string }) {
  return (
    <span className={cn('relative block h-10 shrink-0', className)} style={{ aspectRatio: `${ratios[variant]}` }}>
      <img
        src={`/images/logos/${variant}.webp`}
        alt={names[variant]}
        width={Math.round(192 * ratios[variant])}
        height={192}
        className="h-full w-full object-contain object-left mix-blend-lighten"
      />
    </span>
  );
}
