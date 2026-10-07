import React from 'react';
import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-react';
import type { Category, Division } from '@/types/product';
import { productInCategory, productsFor } from '@/lib/utils/products';
import { Reveal } from '@/components/ui/Reveal';
import { cn } from '@/lib/utils/cn';

interface CategoryTilesProps {
  division: Division;
  categories: Category[];
  columns?: 3 | 5 | 6;
}

export function CategoryTiles({ division, categories, columns = 3 }: CategoryTilesProps) {
  const all = productsFor(division);
  return (
    <ul
      className={cn(
        'grid grid-cols-2 gap-4 md:gap-5',
        columns === 3 && 'md:grid-cols-3',
        columns === 5 && 'md:grid-cols-3 lg:grid-cols-5',
        columns === 6 && 'md:grid-cols-3 lg:grid-cols-6',
      )}
    >
      {categories.map((c, i) => (
        <li key={c.slug}>
          <Reveal delay={Math.min(i, 5) * 0.04}>
            <Link href={`/${division}/shop/${c.slug}`} className="group block">
              <div className="relative overflow-hidden rounded-[22px] bg-champagne">
                <img
                  src={c.image}
                  alt=""
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover transition-transform duration-300 ease-lux group-hover:scale-[1.04]"
                />
                <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink transition-transform duration-200 ease-lux group-hover:rotate-45">
                  <ArrowUpRightIcon className="h-4 w-4" aria-hidden />
                </span>
              </div>
              <p className="mt-3 font-display text-2xl leading-tight text-ink">{c.name}</p>
              <p className="text-xs text-subtle">{all.filter((p) => productInCategory(p, c)).length} products</p>
            </Link>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
