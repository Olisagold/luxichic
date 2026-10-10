import React from 'react';
import { Reveal } from '@/components/ui/Reveal';
import { images } from '@/data/images';
import { useStorefront } from '@/components/storefront/StorefrontProvider';

export function IntroSection() {
  const { intro } = useStorefront().content;
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto grid grid-cols-1 max-w-site items-center gap-14 px-5 lg:grid-cols-2 lg:px-8">
        <Reveal>
          <h2 className="font-display text-5xl uppercase leading-[0.95] text-ink md:text-7xl">
            {intro.heading}
            <span className="mx-3 inline-block h-[0.75em] w-[1.6em] overflow-hidden rounded-full align-middle">
              <img src={images.nails} alt="" className="h-full w-full object-cover" />
            </span>
            <br />
            <span className="italic normal-case text-pink-deep">{intro.accent}</span>
          </h2>
          <p className="mt-8 max-w-lg text-[17px] leading-relaxed text-charcoal">{intro.text}</p>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
            {[
              ['Hair', 'Wigs, bundles & frontals'],
              ['Salon', 'Nails, lashes, skin & braids'],
              ['Tools', 'Pro tools & haircare'],
            ].map(([t, d]) => (
              <div key={t}>
                <dt className="font-display text-2xl text-ink">{t}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-subtle">{d}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
        <div className="relative grid grid-cols-2 gap-5">
          <Reveal className="pt-16">
            <img
              src={images.braids}
              alt="Long boho braids styled at LUXICHIC"
              className="aspect-[3/4] w-full rounded-[28px] object-cover"
            />
          </Reveal>
          <Reveal delay={0.08}>
            <img
              src={images.bodyWaveWig}
              alt="Body wave wig from LUXICHIC Hairs"
              className="aspect-[3/4] w-full rounded-t-[999px] rounded-b-[28px] object-cover"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
