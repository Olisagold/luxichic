'use client';

import React, { useState } from 'react';
import { StoreHero } from '@/components/store/StoreHero';
import { CategoryTiles } from '@/components/store/CategoryTiles';
import { ProductRail } from '@/components/store/ProductRail';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ProductCarousel } from '@/components/product/ProductCarousel';
import { ProductGrid } from '@/components/product/ProductGrid';
import { toolCategories } from '@/data/categories';
import { toolProducts } from '@/data/toolProducts';
import { images } from '@/data/images';
import { isDiscounted, sortProducts } from '@/lib/utils/products';
import { cn } from '@/lib/utils/cn';

const departments = [
{ slug: 'styling-tools', label: 'Hair Styling Tools' },
{ slug: 'wig-making', label: 'Wig-Making Essentials' },
{ slug: 'salon-equipment', label: 'Salon Equipment' },
{ slug: 'haircare', label: 'Haircare Products' },
{ slug: 'braiding', label: 'Braiding Extensions' }];


export function ToolsHome() {
  const [dept, setDept] = useState(departments[0].slug);
  const deptCats = toolCategories.filter((c) => c.group === 'Departments');
  const featured = sortProducts(toolProducts, 'featured').slice(0, 8);
  const newArrivals = sortProducts(toolProducts.filter((p) => p.isNew), 'newest');
  const bestsellers = sortProducts(toolProducts.filter((p) => p.isBestseller), 'bestselling');
  const offers = sortProducts(toolProducts.filter(isDiscounted), 'featured');
  const deptProducts = sortProducts(toolProducts.filter((p) => p.categories.includes(dept)), 'featured');
  const activeDept = departments.find((d) => d.slug === dept)!;

  return (
    <>
      <StoreHero
        division="tools"
        title={<>Hair tools, salon essentials <span className="italic text-pink-deep">&amp; braiding extensions</span></>}
        text="Professional tools for stylists, wig makers and salon owners — and everyday essentials for anyone who loves their hair."
        image={images.hoodDryer}
        imageAlt="Black wall-mounted salon hood dryer in a luxury salon"
        promo={{ label: 'Special offers', text: 'Savings on dryers, hot combs and lace glue', cta: 'View Offers', to: '/tools/shop/discounted' }}
        primary={{ label: 'Shop All Products', to: '/tools/shop/all' }}
        searchPlaceholder="Try “hot comb” or “canvas head”" />
      

      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading title="Shop by category" action={{ label: 'All products', to: '/tools/shop/all' }} />
          <CategoryTiles division="tools" categories={deptCats} columns={5} />
        </div>
      </section>

      <ProductRail title="Featured products" products={featured} action={{ label: 'Shop all', to: '/tools/shop/all' }} tone="ivory" />
      <ProductRail title="New Arrivals" products={newArrivals} action={{ label: 'All new arrivals', to: '/tools/shop/new-arrivals' }} />
      <ProductRail title={<>Best<span className="italic text-pink-deep">sellers</span></>} products={bestsellers} action={{ label: 'All bestsellers', to: '/tools/shop/bestsellers' }} tone="ivory" />

      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading title="Shop by department" action={{ label: `All ${activeDept.label}`, to: `/tools/shop/${dept}` }} reserveArrows />
          <div role="tablist" aria-label="Departments" className="no-scrollbar -mx-5 mb-10 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:px-0">
            {departments.map((d) =>
            <button
              key={d.slug}
              role="tab"
              aria-selected={dept === d.slug}
              onClick={() => setDept(d.slug)}
              className={cn(
                'h-10 whitespace-nowrap rounded-full border px-5 text-xs font-semibold transition-colors duration-150',
                dept === d.slug ? 'border-ink bg-ink text-white' : 'border-line bg-white text-charcoal hover:border-ink'
              )}>
              
                {d.label}
              </button>
            )}
          </div>
          <div role="tabpanel" aria-label={activeDept.label}>
            <ProductCarousel key={dept} products={deptProducts} label={activeDept.label} />
          </div>
        </div>
      </section>

      <section className="bg-ink py-16 text-white md:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading light title={<>Special <span className="italic text-pink">offers</span></>} action={{ label: 'All offers', to: '/tools/shop/discounted' }} reserveArrows />
          <ProductCarousel products={offers} label="Special offers" dark />
        </div>
      </section>

      <section className="bg-ivory py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeading title="All products" action={{ label: `View all ${toolProducts.length}`, to: '/tools/shop/all' }} />
          <ProductGrid products={sortProducts(toolProducts, 'newest').slice(0, 8)} columns={4} />
        </div>
      </section>
    </>);

}