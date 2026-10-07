'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CrownIcon, GemIcon, HeartHandshakeIcon, ShoppingBagIcon, SparklesIcon } from 'lucide-react';
import { whyChoose } from '@/data/content';
import { Reveal } from '@/components/ui/Reveal';

const icons = [GemIcon, SparklesIcon, ShoppingBagIcon, HeartHandshakeIcon, CrownIcon];

export function WhyChoose() {
  const reduce = useReducedMotion();
  return (
    <section className="bg-ivory py-20 md:py-28">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <Reveal>
          <h2 className="font-display text-4xl leading-[1.05] text-ink md:text-6xl">
            Why women choose <span className="italic text-pink-deep">LUXICHIC</span>
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-subtle">
            Quality you can feel, service you can count on, and the convenience of finding every beauty essential in one place.
          </p>
        </Reveal>
        <ul className="divide-y divide-line border-y border-line">
          {whyChoose.map((w, i) => {
            const Icon = icons[i];
            return (
              <motion.li
                key={w.title}
                className="flex items-start gap-6 py-6"
                initial={reduce ? false : { opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05, ease: [0.23, 1, 0.32, 1] }}>
                
                <Icon className="mt-1 h-6 w-6 shrink-0 text-gold" strokeWidth={1.4} aria-hidden />
                <div className="grid flex-1 gap-1 sm:grid-cols-[240px_1fr] sm:gap-6">
                  <h3 className="font-display text-2xl text-ink">{w.title}</h3>
                  <p className="text-sm leading-relaxed text-subtle sm:pt-1.5">{w.text}</p>
                </div>
              </motion.li>);

          })}
        </ul>
      </div>
    </section>);

}