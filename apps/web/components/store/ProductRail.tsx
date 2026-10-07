import React from 'react';
import type { Product } from '@/types/product';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ProductCarousel } from '@/components/product/ProductCarousel';
import { cn } from '@/lib/utils/cn';

interface ProductRailProps {
  title: React.ReactNode;
  text?: string;
  products: Product[];
  action?: {label: string;to: string;};
  tone?: 'white' | 'ivory' | 'blush';
}

const tones = { white: 'bg-white', ivory: 'bg-ivory', blush: 'bg-blush/60' };

export function ProductRail({ title, text, products, action, tone = 'white' }: ProductRailProps) {
  if (!products.length) return null;
  return (
    <section className={cn('py-16 md:py-24', tones[tone])}>
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHeading title={title} text={text} action={action} reserveArrows />
        <ProductCarousel products={products} label={typeof title === 'string' ? title : 'Products'} />
      </div>
    </section>);

}