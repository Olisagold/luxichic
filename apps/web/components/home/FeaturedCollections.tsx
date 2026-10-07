'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRightIcon } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { hairCategories } from '@/data/categories';
import { productInCategory, productsFor } from '@/lib/utils/products';
import { cn } from '@/lib/utils/cn';

const featuredSlugs = [
  'bone-straight',
  'silky-straight',
  'kinky-straight',
  'yaki-straight',
  'deep-wave',
  'body-wave',
  'brazilian',
  'virgin',
];

export function FeaturedCollections() {
  const collections = featuredSlugs
    .map((s) => hairCategories.find((c) => c.slug === s))
    .filter((c): c is NonNullable<typeof c> => !!c);
  const [active, setActive] = useState(0);
  const hair = productsFor('hairs');
  const current = collections[active];

  return (
    <section className="bg-ivory py-20 md:py-28">
      <div className="mx-auto max-w-site px-5 lg:px-8">
        <SectionHeading
          title="Featured Hair Collections"
          text="Find your texture. Every collection comes in a range of lengths, densities and lace types."
          action={{ label: 'All hair products', to: '/hairs/shop/all' }}
        />

        <div className="hidden gap-12 lg:grid lg:grid-cols-[1fr_420px]">
          <ul className="border-t border-line">
            {collections.map((c, i) => {
              const count = hair.filter((p) => productInCategory(p, c)).length;
              const on = active === i;
              return (
                <li key={c.slug} className="border-b border-line">
                  <Link
                    href={`/hairs/shop/${c.slug}`}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    className="group flex items-center gap-6 py-5"
                  >
                    <span
                      className={cn(
                        'w-[300px] shrink-0 font-display text-4xl transition-colors duration-200 xl:text-5xl',
                        on ? 'text-ink' : 'text-muted',
                      )}
                    >
                      {c.name}
                    </span>
                    <span
                      className={cn(
                        'flex-1 text-sm text-subtle transition-opacity duration-200',
                        on ? 'opacity-100' : 'opacity-0',
                      )}
                    >
                      {c.description}
                    </span>
                    <span className="whitespace-nowrap text-xs tabular-nums text-subtle">{count} styles</span>
                    <ArrowRightIcon
                      className={cn(
                        'h-5 w-5 transition-[transform,color] duration-200 ease-lux',
                        on ? 'translate-x-0 text-pink-deep' : '-translate-x-2 text-line',
                      )}
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="sticky top-28 h-[560px] overflow-hidden rounded-t-[999px] rounded-b-[28px] bg-champagne">
            <AnimatePresence initial={false}>
              <motion.img
                key={current.slug}
                src={current.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              />
            </AnimatePresence>
            <div className="absolute inset-x-0 bottom-0 bg-ink/50 p-6 text-white">
              <p className="font-display text-3xl">{current.name}</p>
              <Link
                href={`/hairs/shop/${current.slug}`}
                className="mt-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em]"
              >
                Explore <ArrowRightIcon className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>

        <div className="no-scrollbar -mx-5 flex snap-x gap-4 relative overflow-x-auto px-5 lg:hidden">
          {collections.map((c) => (
            <Link
              key={c.slug}
              href={`/hairs/shop/${c.slug}`}
              className="relative w-[68%] shrink-0 snap-start overflow-hidden rounded-[24px] sm:w-[40%]"
            >
              <img src={c.image} alt="" className="aspect-[3/4] w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-ink/55 p-4 text-white">
                <p className="font-display text-2xl">{c.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-white/85">{c.description}</p>
                <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em]">
                  Explore <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
