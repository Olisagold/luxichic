'use server';

import { and, eq, max } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import * as s from '@/db/schema';
import { ActionError, adminAction, audit } from '@/lib/auth/admin-action';
import { STOREFRONT_TAG } from '@/lib/storefront/data';
import { slugify } from '@/lib/utils/text';
import type { Category, Division } from '@/types/product';
import type { Result } from '@/types/user';

/**
 * Store categories (`categories.manage`). The shop's menus, filters and category pages follow at once. These
 * four are computed by the shop (they list products by flag, not by link), so they can't be renamed or deleted.
 */
const BUILT_IN = ['all', 'new-arrivals', 'bestsellers', 'discounted'];

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Enter a category name.').max(80),
  slug: z.string().trim().max(80),
  group: z.string().trim().min(1, 'Choose or type a group.').max(60),
  description: z.string().trim().max(500),
  image: z.string().max(1000),
});

const label = (division: Division, name: string) => `${name} (${division === 'hairs' ? 'Hairs' : 'Tools'})`;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The homepage's featured collections refer to category slugs: follow a rename, or drop a deleted one. */
async function renameFeatured(tx: Tx, from: string, to: string | null) {
  const [row] = await tx.select().from(s.siteContent).where(eq(s.siteContent.key, 'featured'));
  const value = row?.value as { collectionSlugs?: string[] } | undefined;
  if (!value?.collectionSlugs?.includes(from)) return;
  const collectionSlugs = to
    ? value.collectionSlugs.map((x) => (x === from ? to : x))
    : value.collectionSlugs.filter((x) => x !== from);
  await tx
    .update(s.siteContent)
    .set({ value: { ...value, collectionSlugs }, updatedAt: new Date() })
    .where(eq(s.siteContent.key, 'featured'));
}

/** Creates a category, or saves one (found by `originalSlug`). Its URL slug must be unique in its store. */
export async function saveCategory(division: Division, input: Category, originalSlug?: string): Promise<Result> {
  return adminAction(
    'categories.manage',
    async (admin) => {
      if (division !== 'hairs' && division !== 'tools') throw new ActionError('Unknown store.');
      const parsed = categorySchema.safeParse(input);
      if (!parsed.success) throw new ActionError(parsed.error.issues[0]?.message ?? 'Please check the fields.');
      const c = parsed.data;
      const slug = slugify(c.slug || c.name);
      if (!slug) throw new ActionError('Enter a URL slug.');
      if (c.image && !/^(https:\/\/|\/)/.test(c.image)) throw new ActionError('Upload the image again.');

      await db.transaction(async (tx) => {
        const [existing] = originalSlug
          ? await tx
              .select()
              .from(s.categories)
              .where(and(eq(s.categories.division, division), eq(s.categories.slug, String(originalSlug))))
          : [];
        if (originalSlug && !existing) throw new ActionError('Category not found.');
        if (existing && BUILT_IN.includes(existing.slug) && slug !== existing.slug) {
          throw new ActionError('This built-in category’s URL can’t change.');
        }
        const [clash] = await tx
          .select({ id: s.categories.id })
          .from(s.categories)
          .where(and(eq(s.categories.division, division), eq(s.categories.slug, slug)));
        if (clash && clash.id !== existing?.id) throw new ActionError('Another category already uses this URL.');

        const values = {
          slug,
          name: c.name,
          groupName: c.group,
          description: c.description,
          imageUrl: c.image || null,
        };
        if (existing) {
          await tx
            .update(s.categories)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(s.categories.id, existing.id));
          if (slug !== existing.slug && division === 'hairs') await renameFeatured(tx, existing.slug, slug);
        } else {
          const [{ last }] = await tx
            .select({ last: max(s.categories.sortOrder) })
            .from(s.categories)
            .where(eq(s.categories.division, division));
          await tx.insert(s.categories).values({ ...values, division, sortOrder: (last ?? -1) + 1 });
        }
        await audit(tx, admin, {
          section: 'Categories',
          action: existing ? 'Edited category' : 'Created category',
          target: label(division, c.name),
        });
      });
      return { ok: true };
    },
    { revalidate: [STOREFRONT_TAG] },
  );
}

/** Deletes a category. Products stay; they just leave the category. */
export async function deleteCategory(division: Division, slug: string): Promise<Result> {
  return adminAction(
    'categories.manage',
    async (admin) => {
      if (BUILT_IN.includes(slug)) throw new ActionError('Built-in categories can’t be deleted.');
      await db.transaction(async (tx) => {
        const [removed] = await tx
          .delete(s.categories)
          .where(and(eq(s.categories.division, division), eq(s.categories.slug, String(slug))))
          .returning({ name: s.categories.name });
        if (!removed) throw new ActionError('Category not found.');
        if (division === 'hairs') await renameFeatured(tx, slug, null);
        await audit(tx, admin, {
          section: 'Categories',
          action: 'Deleted category',
          target: label(division, removed.name),
        });
      });
      return { ok: true };
    },
    { revalidate: [STOREFRONT_TAG] },
  );
}
