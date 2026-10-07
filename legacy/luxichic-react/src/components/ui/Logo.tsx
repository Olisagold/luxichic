import React from 'react';
import { logos } from '../../data/images';
import { cn } from '../../utils/cn';

type LogoVariant = keyof typeof logos;

/**
 * The supplied logos are square artwork on black. Each is cropped to its artwork
 * (never stretched or recoloured) so it sits cleanly on black surfaces.
 * Values are fractions of the source image: left, right, top, bottom.
 */
const crops: Record<LogoVariant, [number, number, number, number]> = {
  main: [0.05, 0.86, 0.24, 0.66],
  hairs: [0.05, 0.89, 0.24, 0.69],
  salon: [0.095, 0.935, 0.255, 0.645],
  tools: [0.05, 0.866, 0.253, 0.65]
};

const names: Record<LogoVariant, string> = {
  main: 'LUXICHIC',
  hairs: 'LUXICHIC Hairs',
  salon: 'LUXICHIC Beauty Salon & Spa',
  tools: 'LUXICHIC Wig Tools'
};

export function Logo({ variant = 'main', className }: {variant?: LogoVariant;className?: string;}) {
  const [l, r, t, b] = crops[variant];
  const w = r - l;
  const h = b - t;
  return (
    <span className={cn('relative block h-10 shrink-0 overflow-hidden', className)} style={{ aspectRatio: `${w / h}` }}>
      <img
        src={logos[variant]}
        alt={names[variant]}
        className="absolute mix-blend-lighten"
        style={{ width: `${100 / w}%`, maxWidth: 'none', left: `${-l / w * 100}%`, top: `${-t / h * 100}%` }} />
      
    </span>);

}