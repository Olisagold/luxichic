'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRightIcon } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { images } from '@/data/images';
import { cn } from '@/lib/utils/cn';
import { SiteImage } from '@/components/ui/SiteImage';

const divisions = [
  {
    logo: 'hairs' as const,
    title: 'LUXICHIC Hairs',
    text: 'Discover beautiful wigs, premium human hair, elegant frontals, closures and everything you need to achieve your desired look.',
    cta: 'Explore LUXICHIC Hairs',
    to: '/hairs',
    image: images.curlyWig,
    offset: '',
  },
  {
    logo: 'salon' as const,
    title: 'LUXICHIC Beauty Salon & Spa',
    text: 'Experience professional beauty treatments, personalised care and luxurious salon services designed to help you look and feel your best.',
    cta: 'Explore Our Services',
    to: '/salon',
    image: images.nails,
    offset: 'lg:mt-20',
  },
  {
    logo: 'tools' as const,
    title: 'LUXICHIC Hair Tools & Essentials',
    text: 'Shop quality haircare products, professional salon equipment, wig-making tools and affordable braiding extensions.',
    cta: 'Shop Hair Essentials',
    to: '/tools',
    image: images.hoodDryer,
    offset: 'lg:mt-40',
  },
];

export function DivisionCards() {
  const reduce = useReducedMotion();
  return (
    <section className="bg-ink py-20 text-white md:py-28">
      <div className="mx-auto max-w-site px-5 lg:px-8">
        <SectionHeading
          light
          title={
            <>
              Three houses. <span className="italic text-pink">One LUXICHIC.</span>
            </>
          }
          text="Each division has its own boutique, its own specialists and its own Instagram — all sharing one cart, one account and one standard of care."
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-6">
          {divisions.map((d, i) => (
            <motion.article
              key={d.title}
              className={cn('group', d.offset)}
              initial={reduce ? false : { opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.3, delay: i * 0.06, ease: [0.23, 1, 0.32, 1] }}
            >
              <Link
                href={d.to}
                className="block overflow-hidden rounded-[28px] bg-black ring-1 ring-white/10 transition-[box-shadow] duration-200 hover:ring-pink/60"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <SiteImage
                    sizes="(min-width: 768px) 33vw, 100vw"
                    src={d.image}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 ease-lux group-hover:scale-[1.05]"
                  />
                  <span className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink transition-transform duration-200 ease-lux group-hover:rotate-45">
                    <ArrowUpRightIcon className="h-5 w-5" aria-hidden />
                  </span>
                </div>
                <div className="p-6">
                  <Logo variant={d.logo} className="-ml-1 h-14" />
                  <h3 className="mt-4 font-display text-3xl leading-tight">{d.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">{d.text}</p>
                  <span className="mt-6 inline-flex items-center gap-2 border-b border-pink pb-1 text-xs font-bold uppercase tracking-[0.16em] text-pink">
                    {d.cta}
                  </span>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
