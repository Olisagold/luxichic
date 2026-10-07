import React from 'react';
import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';
import { StoreHero } from '@/components/store/StoreHero';
import { CategoryTiles } from '@/components/store/CategoryTiles';
import { ProductRail } from '@/components/store/ProductRail';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Button } from '@/components/ui/Button';
import { hairCategories } from '@/data/categories';
import { hairProducts } from '@/data/hairProducts';
import { salonServices } from '@/data/services';
import { images } from '@/data/images';
import { sortProducts } from '@/lib/utils/products';

const constructionSlugs = ['frontal-wigs', 'closure-wigs', '360-lace-wigs', 'full-lace-wigs', 'full-cap-wigs', 'half-cap-wigs'];
const textureSlugs = ['bone-straight', 'silky-straight', 'kinky-straight', 'yaki-straight', 'deep-wave', 'body-wave', 'water-wave', 'curly', 'natural'];
const serviceSlugs = ['wig-installation', 'wig-revamping', 'wig-maintenance'];

export function HairsHome() {
  const pick = (slugs: string[]) => slugs.map((s) => hairCategories.find((c) => c.slug === s)).filter((c): c is NonNullable<typeof c> => !!c);
  const newArrivals = sortProducts(hairProducts.filter((p) => p.isNew), 'newest');
  const bestsellers = sortProducts(hairProducts.filter((p) => p.isBestseller), 'featured');
  const services = serviceSlugs.map((s) => salonServices.find((x) => x.slug === s)).filter((s): s is NonNullable<typeof s> => !!s);

  return (
    <>
      <StoreHero
        division="hairs"
        title={<>The LUXICHIC <span className="italic text-pink-deep">Hairs</span> boutique</>}
        text="Premium wigs, bundles, frontals and closures — in the textures, lengths and lace you love. Shop as a guest or with your account."
        image={images.curlyWig}
        imageAlt="Honey brown curly wig on display at LUXICHIC Hairs"
        promo={{ label: 'Limited offer', text: 'Selected wigs now up to 15% off', cta: 'Shop the Sale', to: '/hairs/shop/discounted' }}
        primary={{ label: 'Shop All Hair', to: '/hairs/shop/all' }}
        searchPlaceholder="Try “22 inches body wave”" />
      

      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading title="Shop by construction" text="From beginner-friendly closures to ponytail-ready 360 lace." action={{ label: 'All wigs', to: '/hairs/shop/wigs' }} />
          <CategoryTiles division="hairs" categories={pick(constructionSlugs)} columns={6} />
        </div>
      </section>

      <ProductRail title="New Arrivals" text="Just landed at the boutique." products={newArrivals} action={{ label: 'All new arrivals', to: '/hairs/shop/new-arrivals' }} tone="ivory" />
      <ProductRail title={<>Best<span className="italic text-pink-deep">sellers</span></>} products={bestsellers} action={{ label: 'All bestsellers', to: '/hairs/shop/bestsellers' }} />

      <section className="bg-ink py-16 text-white md:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading light title="Popular textures" text="Every texture, every mood." />
          <ul className="flex flex-wrap gap-3">
            {pick(textureSlugs).map((c) =>
            <li key={c.slug}>
                <Link
                href={`/hairs/shop/${c.slug}`}
                className="group flex items-center gap-3 rounded-full border border-white/15 py-1.5 pl-1.5 pr-5 transition-colors duration-150 hover:border-pink">
                
                  <img src={c.image} alt="" className="h-11 w-11 rounded-full object-cover" />
                  <span className="whitespace-nowrap font-display text-xl">{c.name}</span>
                </Link>
              </li>
            )}
          </ul>
        </div>
      </section>

      <section className="bg-ivory py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading title="All products" action={{ label: `View all ${hairProducts.length}`, to: '/hairs/shop/all' }} />
          <ProductGrid products={sortProducts(hairProducts, 'featured').slice(0, 8)} columns={4} />
        </div>
      </section>

      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <h2 className="font-display text-4xl leading-[1.05] text-ink md:text-6xl">Hair services</h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-subtle">
              Let our wig specialists install, revamp and maintain your unit at the LUXICHIC Beauty Salon &amp; Spa. Book online — pay only after your service.
            </p>
            <Button to="/salon/book" variant="pink" className="mt-8">Book a Hair Service</Button>
          </div>
          <ul className="divide-y divide-line border-y border-line">
            {services.map((s) =>
            <li key={s.slug}>
                <Link href={`/salon/services/${s.slug}`} className="group flex items-center gap-5 py-5">
                  <img src={s.image} alt="" className="h-20 w-16 rounded-xl object-cover" />
                  <span className="flex-1">
                    <span className="block font-display text-2xl text-ink">{s.name}</span>
                    <span className="block text-sm text-subtle">{s.shortDescription}</span>
                  </span>
                  <ArrowRightIcon className="h-5 w-5 text-ink transition-transform duration-200 ease-lux group-hover:translate-x-1" aria-hidden />
                </Link>
              </li>
            )}
          </ul>
        </div>
      </section>
    </>);

}