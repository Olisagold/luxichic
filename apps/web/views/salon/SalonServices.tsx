'use client';

import React, { useState } from 'react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ServiceCard } from '@/components/salon/ServiceCard';
import { salonServices } from '@/data/services';
import { cn } from '@/lib/utils/cn';

export function SalonServices() {
  const categories = ['All', ...Array.from(new Set(salonServices.map((s) => s.category)))];
  const [cat, setCat] = useState('All');
  const list = cat === 'All' ? salonServices : salonServices.filter((s) => s.category === cat);

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-10 lg:px-8">
      <Breadcrumbs
        items={[{ label: 'Home', to: '/' }, { label: 'Beauty Salon & Spa', to: '/salon' }, { label: 'All Services' }]}
      />
      <h1 className="mt-6 font-display text-5xl text-ink md:text-6xl">Salon &amp; Spa Services</h1>
      <p className="mt-3 max-w-2xl text-[15px] text-subtle">
        Book online in a minute. No payment is taken when you book — you pay after your service.
      </p>
      <div
        role="tablist"
        aria-label="Service categories"
        className="no-scrollbar -mx-5 mt-8 flex gap-2 overflow-x-auto px-5"
      >
        {categories.map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={cat === c}
            onClick={() => setCat(c)}
            className={cn(
              'h-10 whitespace-nowrap rounded-full border px-5 text-xs font-semibold transition-colors duration-150',
              cat === c ? 'border-ink bg-ink text-white' : 'border-line bg-white text-charcoal hover:border-ink',
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="mt-12 grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((s) => (
          <ServiceCard key={s.slug} service={s} />
        ))}
      </div>
    </div>
  );
}
