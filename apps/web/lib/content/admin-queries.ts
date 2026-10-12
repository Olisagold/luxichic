import 'server-only';
import { desc } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { getAdmin, hasPermission } from '@/lib/auth/session';
import { loadAdminCatalog, loadContent, loadSalon } from '@/lib/storefront/source';
import type { AdminContent } from '@/components/admin/AdminContentProvider';
import type { MediaItem, Permission } from '@/types/admin';

const FOLDER: Record<(typeof s.mediaFolder.enumValues)[number], MediaItem['folder']> = {
  homepage: 'Homepage',
  hairs: 'Hairs',
  hair_tools: 'Hair Tools',
  salon: 'Salon',
  products: 'Products',
  services: 'Services',
};

export async function listMedia(): Promise<MediaItem[]> {
  const rows = await db.select().from(s.media).orderBy(desc(s.media.createdAt));
  return rows.map((m) => ({
    id: m.id,
    url: m.url,
    name: m.name,
    folder: FOLDER[m.folder],
    width: m.width ?? 0,
    height: m.height ?? 0,
    sizeKb: m.sizeKb ?? 0,
    uploadedAt: m.createdAt.toISOString(),
  }));
}

/** Data for an admin content page, or nothing when the admin lacks `permission` (the page explains). */
export async function contentFor(permission: Permission): Promise<AdminContent | null> {
  const admin = await getAdmin();
  if (!admin || !hasPermission(admin, permission)) return null;
  const content = await loadContent();
  const { products } = await loadAdminCatalog();
  const { services } = await loadSalon();
  return {
    content,
    products: products.map((p) => ({ id: p.id, name: p.name, images: p.images, status: p.status })),
    services: services.map((x) => ({ slug: x.slug, name: x.name, status: x.status })),
    media: await listMedia(),
  };
}
