'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Product } from '@/types/product';
import { ProductCard } from '@/components/product/ProductCard';
import { cn } from '@/lib/utils/cn';

export function ProductGrid({ products, columns = 3 }: { products: Product[]; columns?: 3 | 4 }) {
  const reduce = useReducedMotion();
  return (
    <ul
      className={cn(
        'grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6',
        columns === 4 ? 'md:grid-cols-3 lg:grid-cols-4' : 'md:grid-cols-3',
      )}
    >
      {products.map((p, i) => (
        <motion.li
          key={p.id}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.03, ease: [0.23, 1, 0.32, 1] }}
        >
          <ProductCard product={p} />
        </motion.li>
      ))}
    </ul>
  );
}
