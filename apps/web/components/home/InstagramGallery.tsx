import React from 'react';
import { InstagramIcon } from 'lucide-react';
import { instagramGalleries } from '@/data/content';
import { businessConfig } from '@/data/config';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/ui/Reveal';

export function InstagramGallery() {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeading title="Follow the glow" text="Three accounts, three worlds of inspiration. Follow the LUXICHIC division you love." />
        <div className="grid gap-12 md:grid-cols-3 md:gap-6">
          {instagramGalleries.map((g, gi) => {
            const ig = businessConfig.instagram[g.id];
            return (
              <Reveal key={g.id} delay={gi * 0.06}>
                <div className="grid grid-cols-2 gap-2">
                  {g.images.map((src, i) =>
                  <a key={i} href={ig.url} target="_blank" rel="noopener noreferrer" className="group relative block overflow-hidden rounded-2xl" aria-label={`${g.title} post ${i + 1} on Instagram`}>
                      <img src={src} alt="" loading="lazy" className="aspect-square w-full object-cover transition-transform duration-300 ease-lux group-hover:scale-105" />
                      <span className="absolute inset-0 flex items-center justify-center bg-ink/35 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <InstagramIcon className="h-6 w-6" aria-hidden />
                      </span>
                    </a>
                  )}
                </div>
                <div className="mt-5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-display text-2xl text-ink">{g.title}</p>
                    <p className="text-xs text-subtle">{ig.handle}</p>
                  </div>
                  <a
                    href={ig.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-ink px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-ink transition-colors duration-150 hover:bg-ink hover:text-white">
                    
                    <InstagramIcon className="h-4 w-4" aria-hidden /> Follow
                  </a>
                </div>
              </Reveal>);

          })}
        </div>
      </div>
    </section>);

}