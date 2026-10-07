'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import { testimonials } from '@/data/content';
import { Stars } from '@/components/ui/Stars';
import { cn } from '@/lib/utils/cn';

export function TestimonialCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const t = testimonials[index];

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % testimonials.length), 6500);
    return () => clearInterval(id);
  }, [paused]);

  const go = (d: number) => setIndex((i) => (i + d + testimonials.length) % testimonials.length);
  const arrow =
    'flex h-12 w-12 items-center justify-center rounded-full border border-white/25 transition-colors duration-150 hover:bg-white hover:text-ink';

  return (
    <section
      className="bg-[#1d1719] py-20 text-white md:py-28"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Customer testimonials"
    >
      <div className="mx-auto grid grid-cols-1 max-w-site gap-12 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <h2 className="font-display text-4xl leading-[1.05] md:text-6xl">What our clients say</h2>
          <p className="mt-4 inline-flex rounded-full border border-gold/60 px-3 py-1 text-[11px] font-semibold text-gold">
            Placeholder testimonials · to be replaced with genuine reviews
          </p>
          <div className="mt-10 flex gap-3">
            <button onClick={() => go(-1)} className={arrow} aria-label="Previous testimonial">
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
            <button onClick={() => go(1)} className={arrow} aria-label="Next testimonial">
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="relative min-h-[320px] border-l border-white/15 pl-8 md:pl-12" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.figure
              key={index}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            >
              <Stars rating={t.rating} size="md" />
              <blockquote className="mt-6 font-display text-3xl leading-snug md:text-[2.6rem]">“{t.text}”</blockquote>
              <figcaption className="mt-8 flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pink text-sm font-bold text-ink">
                  {t.initials}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{t.name}</span>
                  <span className="block text-xs text-white/60">Reviewed: {t.item}</span>
                </span>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
          <div className="mt-10 flex gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Show testimonial ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  'h-1 rounded-full transition-[width,background-color] duration-300',
                  i === index ? 'w-10 bg-pink' : 'w-5 bg-white/25',
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
