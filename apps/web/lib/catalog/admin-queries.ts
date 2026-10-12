import 'server-only';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import * as s from '@/db/schema';
import { getAdmin, hasPermission } from '@/lib/auth/session';
import { loadAdminCatalog } from '@/lib/storefront/source';
import type { AdminCatalog } from '@/components/admin/AdminCatalogProvider';
import type { Permission, StockMove } from '@/types/admin';

const EMPTY: AdminCatalog = { products: [], categories: { hairs: [], tools: [] } };

/** The admin catalog for a page, or an empty one when the admin lacks `permission` (the page explains). */
export async function catalogFor(
  permission: Permission,
  extra: { stockMoves?: boolean; media?: boolean } = {},
): Promise<AdminCatalog> {
  const admin = await getAdmin();
  if (!admin || !hasPermission(admin, permission)) return EMPTY;
  const catalog: AdminCatalog = await loadAdminCatalog();
  if (extra.stockMoves) catalog.stockMoves = await recentStockMoves();
  if (extra.media) {
    catalog.media = await db
      .select({ id: s.media.id, url: s.media.url, name: s.media.name })
      .from(s.media)
      .orderBy(desc(s.media.createdAt));
  }
  return catalog;
}

/** The latest stock changes, newest first. */
async function recentStockMoves(limit = 300): Promise<StockMove[]> {
  const rows = await db
    .select({ m: s.stockMovements, productName: s.products.name, by: s.admins.fullName })
    .from(s.stockMovements)
    .innerJoin(s.products, eq(s.products.id, s.stockMovements.productId))
    .leftJoin(s.admins, eq(s.admins.id, s.stockMovements.adminId))
    .orderBy(desc(s.stockMovements.createdAt))
    .limit(limit);
  return rows.map(({ m, productName, by }) => ({
    id: m.id,
    productId: m.productId,
    productName,
    variant: m.variant ?? undefined,
    change: m.change,
    resultingStock: m.resultingStock,
    reason: m.reason,
    by: by ?? 'Checkout',
    at: m.createdAt.toISOString(),
  }));
}
