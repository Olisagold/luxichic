'use client';

import React, { createContext, useContext, useMemo } from 'react';
import type { StorefrontData } from '@/lib/storefront/derive';
import {
  categoriesFor,
  findCategory,
  findProduct,
  findProductById,
  findService,
  productsFor,
  relatedProducts,
} from '@/lib/storefront/catalog';
import { searchProducts } from '@/lib/utils/products';
import type { Division, Product } from '@/types/product';

const StorefrontContext = createContext<StorefrontData | null>(null);

/** Supplies the catalog, content and public settings, read on the server by the storefront layout. */
export function StorefrontProvider({ data, children }: { data: StorefrontData; children: React.ReactNode }) {
  return <StorefrontContext.Provider value={data}>{children}</StorefrontContext.Provider>;
}

export function useStorefront(): StorefrontData {
  const ctx = useContext(StorefrontContext);
  if (!ctx) throw new Error('useStorefront must be used inside the storefront layout');
  return ctx;
}

/** Catalog lookups bound to the current storefront data. */
export function useCatalog() {
  const data = useStorefront();
  return useMemo(
    () => ({
      data,
      products: data.products,
      services: data.services,
      productsFor: (d: Division) => productsFor(data, d),
      categoriesFor: (d: Division) => categoriesFor(data, d),
      findCategory: (d: Division, slug?: string) => findCategory(data, d, slug),
      findProduct: (slug: string) => findProduct(data, slug),
      findProductById: (id: string) => findProductById(data, id),
      relatedProducts: (p: Product, limit?: number) => relatedProducts(data, p, limit),
      findService: (slug?: string | null) => findService(data, slug),
      searchProducts: (list: Product[], query: string) => searchProducts(list, query, data.categories),
    }),
    [data],
  );
}
