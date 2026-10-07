'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowUpRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { images } from '@/data/images';
import { siteContent } from '@/data/content';

const rotating = [
{ image: images.nails, label: 'Nail Services', division: 'Beauty Salon & Spa', to: '/salon/services/nail-services' },
{ image: images.bodyWaveWig, label: 'Body Wave Wigs', division: 'LUXICHIC Hairs', to: '/hairs/shop/body-wave' },
{ image: images.hotComb, label: 'Professional Hot Combs', division: 'Hair Tools & Essentials', to: '/tools/shop/hot-combs' },
{ image: images.braids, label: 'Boho Braids', division: 'Beauty Salon & Spa', to: '/salon/services/braiding' }];


const marqueeWords = ['Premium Human Hair', 'Luxury Wigs', 'Nails & Lashes', 'Facials & Spa', 'Knotless Braids', 'Pro Hair Tools', 'Wig Installs', 'Haircare Essentials'];

/** Sparkle positions around the portrait (percent of the portrait box). */
const sparkles = [
{ top: '6%', left: '-6%', size: 22, delay: 0 },
{ top: '18%', left: '96%', size: 16, delay: 0.8 },
{ top: '52%', left: '102%', size: 26, delay: 1.6 },
{ top: '78%', left: '-10%', size: 14, delay: 2.2 },
{ top: '-4%', left: '62%', size: 12, delay: 1.1 },
{ top: '92%', left: '88%', size: 18, delay: 0.4 }];


const ease = [0.23, 1, 0.32, 1] as const;

function Sparkle({ size, className, style }: {size: number;className?: string;style?: React.CSSProperties;}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} aria-hidden>
      <path d="M12 0c.6 5.6 2.4 8.4 12 12-9.6 3.6-11.4 6.4-12 12-.6-5.6-2.4-8.4-12-12C9.6 8.4 11.4 5.6 12 0Z" fill="currentColor" />
    </svg>);

}

export function HeroSection() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const portraitY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 80]);
  const cardY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40]);
  const [slide, setSlide] = useState(0);

  // Cursor-follow spotlight glow (desktop pointer only).
  const mx = useMotionValue(70);
  const my = useMotionValue(40);
  const sx = useSpring(mx, { stiffness: 80, damping: 20 });
  const sy = useSpring(my, { stiffness: 80, damping: 20 });
  const glowLeft = useTransform(sx, (v) => `${v}%`);
  const glowTop = useTransform(sy, (v) => `${v}%`);

  // Gentle 3D tilt on the portrait.
  const rx = useSpring(0, { stiffness: 120, damping: 18 });
  const ry = useSpring(0, { stiffness: 120, damping: 18 });

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % rotating.length), 3800);
    return () => clearInterval(id);
  }, []);

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width * 100);
    my.set((e.clientY - r.top) / r.height * 100);
  };

  const onPortraitMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 10);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 10);
  };

  const current = rotating[slide];
  const hero = siteContent.hero;
  const lines = [hero.line1, hero.line2].filter(Boolean);

  const lineMotion = (i: number) =>
  reduce ? {} : { initial: { y: '105%' }, animate: { y: 0 }, transition: { duration: 0.3, delay: 0.1 + i * 0.08, ease } };

  return (
    <section ref={ref} onPointerMove={onMove} className="relative overflow-hidden bg-ivory">
      {/* Cursor-following ambient glow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ left: glowLeft, top: glowTop, background: 'radial-gradient(circle, rgba(240,40,140,0.16) 0%, rgba(240,40,140,0) 65%)' }} />
      

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8 lg:px-8 lg:pb-24 lg:pt-16">
        <div className="relative z-10">
          <motion.p
            className="inline-flex items-center gap-2 text-xs font-semibold text-pink-deep"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}>
            
            <Sparkle size={12} className="lx-twinkle text-pink" />
            {hero.eyebrow}
          </motion.p>
          <h1 className="mt-6 font-display text-[3.2rem] uppercase leading-[0.92] text-ink sm:text-7xl xl:text-[6.4rem]">
            {lines.map((l, i) =>
            <span key={l} className="block overflow-hidden pb-1">
                <motion.span className="block" {...lineMotion(i)}>{l}</motion.span>
              </span>
            )}
            <span className="block overflow-hidden pb-2">
              <motion.span className="lx-shimmer-text block italic normal-case" {...lineMotion(2)}>
                {hero.accent}
              </motion.span>
            </span>
          </h1>
          <motion.p
            className="mt-8 max-w-lg text-base leading-relaxed text-charcoal md:text-lg"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4, ease }}>
            
            {hero.text}
          </motion.p>
          <motion.div
            className="mt-10 flex flex-col gap-3 sm:flex-row"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5, ease }}>
            
            <Button to="/hairs" size="lg" variant="pink" className="lx-glow-pulse group">
              {hero.primaryCta}
              <ArrowUpRightIcon className="h-4 w-4 transition-transform duration-200 ease-lux group-hover:rotate-45" aria-hidden />
            </Button>
            <Button to="/salon/book" size="lg" variant="outline">
              {hero.secondaryCta}
            </Button>
          </motion.div>
        </div>

        <div className="relative mx-auto w-full max-w-[460px] lg:ml-auto lg:mr-0" style={{ perspective: 1000 }}>
          {/* Breathing glow behind the portrait */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-10 rounded-full"
            style={{ background: 'radial-gradient(closest-side, rgba(240,40,140,0.38), rgba(240,40,140,0) 75%)' }}
            animate={reduce ? undefined : { scale: [0.94, 1.04, 0.94], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
          
          {/* Slowly rotating dashed halo */}
          <div aria-hidden className="lx-spin-slow pointer-events-none absolute -inset-4 rounded-t-[999px] rounded-b-[40px] border border-dashed border-pink/40" />

          {sparkles.map((s, i) =>
          <Sparkle
            key={i}
            size={s.size}
            className="lx-twinkle pointer-events-none absolute z-20 text-pink drop-shadow-[0_0_8px_rgba(240,40,140,0.8)]"
            style={{ top: s.top, left: s.left, animationDelay: `${s.delay}s` }} />

          )}

          <motion.div
            style={{ y: portraitY, rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
            onPointerMove={onPortraitMove}
            onPointerLeave={() => {rx.set(0);ry.set(0);}}
            className="relative overflow-hidden rounded-t-[999px] rounded-b-[32px] bg-champagne shadow-[0_30px_80px_-20px_rgba(240,40,140,0.45)] ring-1 ring-pink/30"
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.15, ease }}>
            
            <img src={hero.image} alt="LUXICHIC client holding pink LUXICHIC Hairs gift bags" className="aspect-[3/4.2] w-full object-cover object-[50%_30%]" />
            {/* Light sweep across the portrait */}
            {!reduce &&
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-white/25 blur-md"
              initial={{ left: '-40%' }}
              animate={{ left: '140%' }}
              transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 4.5, ease: 'easeInOut' }} />

            }
          </motion.div>

          <motion.div style={{ y: cardY }} className="absolute -bottom-6 -left-4 z-30 w-44 sm:-left-16 sm:w-52">
            <motion.div
              animate={reduce ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
              
              <Link
                href={current.to}
                className="group block rounded-[22px] bg-white p-2 shadow-[0_24px_60px_-20px_rgba(10,10,10,0.35),0_0_0_1px_rgba(240,40,140,0.15),0_0_40px_-10px_rgba(240,40,140,0.5)]"
                aria-label={`${current.label} — ${current.division}`}>
                
                <div className="relative aspect-[4/5] overflow-hidden rounded-[16px] bg-champagne">
                  <AnimatePresence initial={false}>
                    <motion.img
                      key={current.image}
                      src={current.image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }} />
                    
                  </AnimatePresence>
                </div>
                <div className="px-2 pb-1.5 pt-3">
                  <p className="text-[10px] font-semibold text-subtle">{current.division}</p>
                  <p className="mt-0.5 flex items-center justify-between gap-2 text-sm font-semibold text-ink">
                    <span className="truncate">{current.label}</span>
                    <ArrowUpRightIcon className="h-4 w-4 shrink-0 transition-transform duration-200 ease-lux group-hover:rotate-45" aria-hidden />
                  </p>
                </div>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Glowing marquee band */}
      <div className="relative overflow-hidden border-y border-pink/20 bg-ink py-4" aria-hidden>
        <div className="lx-marquee flex w-max items-center">
          {[0, 1].map((dup) =>
          <div key={dup} className="flex items-center">
              {marqueeWords.map((w) =>
            <span key={`${dup}-${w}`} className="flex items-center">
                  <span className="whitespace-nowrap px-6 font-display text-2xl italic text-white [text-shadow:0_0_18px_rgba(240,40,140,0.55)] md:text-3xl">{w}</span>
                  <Sparkle size={14} className="text-pink drop-shadow-[0_0_6px_rgba(240,40,140,0.9)]" />
                </span>
            )}
            </div>
          )}
        </div>
      </div>
    </section>);

}