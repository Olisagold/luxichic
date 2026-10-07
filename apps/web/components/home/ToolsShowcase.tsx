import React from 'react';
import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { ProductCarousel } from '@/components/product/ProductCarousel';
import { toolProducts } from '@/data/toolProducts';
import { images } from '@/data/images';

const showcaseIds = ['t1', 't9', 't2', 't14', 't13', 't16', 't20', 't4'];

const quickCats = [
  { label: 'Styling Tools', to: '/tools/shop/styling-tools' },
  { label: 'Wig-Making', to: '/tools/shop/wig-making' },
  { label: 'Haircare', to: '/tools/shop/haircare' },
  { label: 'Braiding Hair', to: '/tools/shop/braiding' },
];

export function ToolsShowcase() {
  const products = showcaseIds
    .map((id) => toolProducts.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <section className="bg-blush/60 py-20 md:py-28">
      <div className="mx-auto grid grid-cols-1 max-w-site gap-10 px-5 lg:grid-cols-[360px_1fr] lg:px-8">
        <Reveal className="flex flex-col overflow-hidden rounded-[28px] bg-ink text-white">
          <img src={images.hotComb} alt="Sonar professional hot combs" className="h-64 w-full object-cover lg:h-72" />
          <div className="flex flex-1 flex-col p-7">
            <Logo variant="tools" className="-ml-1 h-12" />
            <h2 className="mt-4 font-display text-4xl leading-tight">Tools the professionals trust.</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Hair tools, salon essentials, haircare and affordable braiding extensions — for stylists, wig makers and
              you.
            </p>
            <ul className="mt-6 grid grid-cols-2 gap-2">
              {quickCats.map((c) => (
                <li key={c.to}>
                  <Link
                    href={c.to}
                    className="flex items-center justify-between gap-1 rounded-xl border border-white/15 px-3 py-2.5 text-xs font-medium text-white/85 transition-colors duration-150 hover:border-pink hover:text-white"
                  >
                    <span className="whitespace-nowrap">{c.label}</span>{' '}
                    <ArrowRightIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <Button to="/tools" variant="pink" className="mt-8" fullWidth>
              Shop Hair Tools
            </Button>
          </div>
        </Reveal>
        <div className="min-w-0 lg:pt-20">
          <ProductCarousel products={products} label="Hair tools and essentials" perView={3} />
        </div>
      </div>
    </section>
  );
}
