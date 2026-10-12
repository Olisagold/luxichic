'use client';

import React, { createContext, useContext } from 'react';
import type { AdminProduct, StockMove } from '@/types/admin';
import type { Category } from '@/types/product';

export interface AdminCatalog {
  /** Every product in any status. */
  products: AdminProduct[];
  categories: { hairs: Category[]; tools: Category[] };
  /** Latest stock changes (inventory page only). */
  stockMoves?: StockMove[];
  /** The media library, to pick product images from (editor only). */
  media?: { id: string; url: string; name: string }[];
}

const AdminCatalogContext = createContext<AdminCatalog | null>(null);

/** The catalog for the admin product screens, read on the server by their pages (uncached). */
export function AdminCatalogProvider({ value, children }: { value: AdminCatalog; children: React.ReactNode }) {
  return <AdminCatalogContext.Provider value={value}>{children}</AdminCatalogContext.Provider>;
}

export function useAdminCatalog(): AdminCatalog {
  const ctx = useContext(AdminCatalogContext);
  if (!ctx) throw new Error('useAdminCatalog must be used inside an admin product page');
  return ctx;
}
