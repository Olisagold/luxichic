'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Division } from '@/types/product';
import { Button } from '@/components/ui/Button';
import { StoreSearch } from '@/components/store/StoreSearch';
import { SiteImage } from '@/components/ui/SiteImage';

interface StoreHeroProps {
  division: Division;
  title: React.ReactNode;
  text: string;
  image: string;
  imageAlt: string;
  promo: { label: string; text: string; cta: string; to: string };
  primary: { label: string; to: string };
  searchPlaceholder: string;
}

export function StoreHero({
  division,
  title,
  text,
  image,
  imageAlt,
  promo,
  primary,
  searchPlaceholder,
}: StoreHeroProps) {
  const reduce = useReducedMotion();
  return (
    <section className="bg-ivory">
      <div className="mx-auto grid grid-cols-1 max-w-site gap-10 px-5 pb-16 pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:pb-20 lg:pt-14">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        >
          <h1 className="font-display text-5xl leading-[0.98] text-ink md:text-7xl">{title}</h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-charcoal md:text-base">{text}</p>
          <div className="mt-8">
            <StoreSearch division={division} placeholder={searchPlaceholder} />
          </div>
          <div className="mt-6">
            <Button to={primary.to} size="lg">
              {primary.label}
            </Button>
          </div>
        </motion.div>
        <div className="relative">
          <SiteImage
            sizes="(min-width: 1024px) 45vw, 100vw"
            priority
            src={image}
            alt={imageAlt}
            className="aspect-[4/3.6] w-full rounded-[32px] object-cover lg:aspect-[4/4.4]"
          />
          <div className="absolute inset-x-4 bottom-4 flex flex-col gap-3 rounded-[22px] bg-ink p-5 text-white sm:inset-x-auto sm:left-4 sm:max-w-xs">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-pink">{promo.label}</p>
            <p className="font-display text-2xl leading-tight">{promo.text}</p>
            <Button to={promo.to} variant="pink" size="sm" className="self-start">
              {promo.cta}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
