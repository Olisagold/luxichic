'use client';

import React, { useRef } from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import type { Product } from '@/types/product';
import { ProductCard } from '@/components/product/ProductCard';
import { cn } from '@/lib/utils/cn';

interface ProductCarouselProps {
  products: Product[];
  label: string;
  perView?: 3 | 4;
  dark?: boolean;
}

export function ProductCarousel({ products, label, perView = 4, dark }: ProductCarouselProps) {
  const ref = useRef<HTMLUListElement>(null);

  const scroll = (dir: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  const arrow = cn(
    'flex h-11 w-11 items-center justify-center rounded-full border transition-colors duration-150',
    dark ? 'border-white/25 text-white hover:bg-white hover:text-ink' : 'border-line bg-white text-ink hover:border-ink'
  );

  return (
    <div className="relative" role="region" aria-roledescription="carousel" aria-label={label}>
      <div className="absolute -top-[4.5rem] right-0 hidden gap-2 md:flex">
        <button onClick={() => scroll(-1)} className={arrow} aria-label="Previous products">
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
        <button onClick={() => scroll(1)} className={arrow} aria-label="Next products">
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
      <ul ref={ref} className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-5 pb-2 lg:mx-0 lg:px-0">
        {products.map((p) =>
        <li
          key={p.id}
          className={cn('w-[70%] shrink-0 snap-start sm:w-[44%]', perView === 4 ? 'lg:w-[calc(25%-15px)]' : 'lg:w-[calc(33.333%-14px)]')}>
          
            <ProductCard product={p} dark={dark} />
          </li>
        )}
      </ul>
    </div>);

}