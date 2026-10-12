'use client';

import React, { createContext, useContext } from 'react';
import type { MediaItem, SiteContent } from '@/types/admin';

export interface AdminContent {
  content: SiteContent;
  /** Products and services that can be featured on the homepage (and where media is used). */
  products: { id: string; name: string; images: string[]; status: string }[];
  services: { slug: string; name: string; status: string }[];
  media: MediaItem[];
}

const AdminContentContext = createContext<AdminContent | null>(null);

/** Website content for the admin content pages, read on the server by each page (uncached). */
export function AdminContentProvider({ value, children }: { value: AdminContent; children: React.ReactNode }) {
  return <AdminContentContext.Provider value={value}>{children}</AdminContentContext.Provider>;
}

export function useAdminContent(): AdminContent {
  const ctx = useContext(AdminContentContext);
  if (!ctx) throw new Error('useAdminContent must be used inside an admin content page');
  return ctx;
}
