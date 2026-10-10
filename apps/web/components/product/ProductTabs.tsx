'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Product } from '@/types/product';
import { ReviewsSection } from '@/components/product/ReviewsSection';
import { useStorefront } from '@/components/storefront/StorefrontProvider';
import { cn } from '@/lib/utils/cn';

export function ProductTabs({ product }: { product: Product }) {
  const tabs = [
    { id: 'description', label: 'Description' },
    { id: 'specs', label: 'Specifications' },
    ...(product.usage ? [{ id: 'usage', label: 'How to Use' }] : []),
    { id: 'shipping', label: 'Shipping & Delivery' },
    { id: 'returns', label: 'Returns & Refunds' },
    { id: 'reviews', label: `Reviews (${product.reviewCount})` },
  ];

  const [active, setActive] = useState('description');
  const { deliveryEstimate } = useStorefront().business;

  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    setActive(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  return (
    <div id="product-tabs" className="scroll-mt-32">
      <div
        role="tablist"
        aria-label="Product information"
        className="no-scrollbar flex gap-8 relative overflow-x-auto border-b border-line"
      >
        {tabs.map((t, i) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => setActive(t.id)}
            className={cn(
              'relative whitespace-nowrap pb-4 text-sm font-semibold transition-colors duration-150',
              active === t.id ? 'text-ink' : 'text-subtle hover:text-ink',
            )}
          >
            {t.label}
            {active === t.id && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-ink"
                transition={{ duration: 0.2 }}
              />
            )}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`} className="pt-10">
        {active === 'description' && (
          <p className="max-w-3xl text-[15px] leading-relaxed text-charcoal">{product.description}</p>
        )}
        {active === 'specs' && (
          <dl className="max-w-2xl divide-y divide-line border-y border-line">
            {product.specs.map((s) => (
              <div key={s.label} className="grid grid-cols-[140px_1fr] gap-4 py-3.5 text-sm sm:grid-cols-[200px_1fr]">
                <dt className="text-subtle">{s.label}</dt>
                <dd className="text-ink">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {active === 'usage' && <p className="max-w-3xl text-[15px] leading-relaxed text-charcoal">{product.usage}</p>}
        {active === 'shipping' && (
          <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-charcoal">
            <p>We deliver across Nigeria. Your delivery fee is calculated at checkout based on your state.</p>
            <p className="text-subtle">{deliveryEstimate}</p>
            <Link
              href="/policies/shipping"
              className="inline-block text-sm font-semibold text-pink-deep underline-offset-4 hover:underline"
            >
              Read the shipping policy
            </Link>
          </div>
        )}
        {active === 'returns' && (
          <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-charcoal">
            <p>[Placeholder] Returns and refunds terms will be published here once finalised by LUXICHIC.</p>
            <Link
              href="/policies/returns"
              className="inline-block text-sm font-semibold text-pink-deep underline-offset-4 hover:underline"
            >
              Read the returns policy
            </Link>
          </div>
        )}
        {active === 'reviews' && <ReviewsSection product={product} />}
      </div>
    </div>
  );
}
