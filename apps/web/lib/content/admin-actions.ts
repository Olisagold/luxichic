'use server';

import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import * as s from '@/db/schema';
import { ActionError, adminAction, audit } from '@/lib/auth/admin-action';
import { getAdmin, hasPermission } from '@/lib/auth/session';
import { MEDIA_BUCKET } from '@/lib/media/urls';
import { STOREFRONT_TAG } from '@/lib/storefront/data';
import { createAdminClient } from '@/lib/supabase/admin';
import { isUuid } from '@/lib/utils/validation';
import { revalidateTag } from 'next/cache';
import type { Permission, SiteContent } from '@/types/admin';
import type { Result } from '@/types/user';

/**
 * Website content (homepage, About, contact, FAQs, policies). Each part of `SiteContent` is stored in one place:
 * a JSON block in `site_content`, or its own table for announcements, testimonials, FAQs and policies
 * (lib/storefront/source.ts reads them back). Saving refreshes the storefront at once.
 */

type Key = keyof SiteContent;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Which permission edits each part. */
const PERMISSION: Record<Key, Permission> = {
  announcements: 'content.homepage',
  sections: 'content.homepage',
  hero: 'content.homepage',
  intro: 'content.homepage',
  divisions: 'content.homepage',
  featuredCollectionSlugs: 'content.homepage',
  featuredProductIds: 'content.homepage',
  featuredServiceSlugs: 'content.homepage',
  salonSection: 'content.homepage',
  why: 'content.homepage',
  testimonials: 'content.homepage',
  about: 'content.pages',
  contact: 'content.pages',
  faqs: 'content.pages',
  policies: 'content.pages',
};

/** Parts kept as one JSON block each in `site_content`. */
const BLOCK: Partial<Record<Key, string>> = {
  sections: 'sections',
  hero: 'hero',
  intro: 'intro',
  divisions: 'divisions',
  salonSection: 'salon_section',
  why: 'why',
  about: 'about',
  contact: 'contact',
};

const LABEL: Record<Key, string> = {
  announcements: 'announcement bar',
  sections: 'homepage sections',
  hero: 'homepage hero',
  intro: 'homepage introduction',
  divisions: 'homepage divisions',
  featuredCollectionSlugs: 'featured collections',
  featuredProductIds: 'featured products',
  featuredServiceSlugs: 'featured services',
  salonSection: 'homepage salon section',
  why: '“Why LUXICHIC”',
  testimonials: 'testimonials',
  about: 'About page',
  contact: 'contact page',
  faqs: 'FAQs',
  policies: 'policies',
};

const text = z.string().max(20000);
const announcementsSchema = z.array(z.object({ text: text.min(1), enabled: z.boolean() })).max(20);
const testimonialsSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(80),
      initials: z.string().trim().max(4),
      rating: z.number().int().min(1).max(5),
      item: z.string().trim().max(120),
      text: z.string().trim().min(1).max(2000),
      status: z.enum(['active', 'archived']),
    }),
  )
  .max(50);
const faqsSchema = z
  .array(
    z.object({
      category: z.string().trim().min(1).max(80),
      items: z
        .array(z.object({ q: z.string().trim().min(1).max(500), a: z.string().trim().min(1).max(5000) }))
        .max(100),
    }),
  )
  .max(30);
const policiesSchema = z.record(
  z.string().regex(/^[a-z0-9-]{1,60}$/),
  z.object({
    title: z.string().trim().min(1).max(120),
    sections: z.array(z.object({ heading: z.string().max(200), body: text })).max(50),
  }),
);
const slugList = z.array(z.string().max(120)).max(50);

async function saveBlock(tx: Tx, key: string, value: unknown, adminId: string) {
  await tx
    .insert(s.siteContent)
    .values({ key, value, updatedByAdminId: adminId })
    .onConflictDoUpdate({
      target: s.siteContent.key,
      set: { value, updatedByAdminId: adminId, updatedAt: new Date() },
    });
}

/** Writes one part of the content to where it lives. */
async function savePart(tx: Tx, key: Key, value: unknown, adminId: string) {
  const blockKey = BLOCK[key];
  if (blockKey) {
    if (value === null || typeof value !== 'object') throw new ActionError(`The ${LABEL[key]} couldn’t be saved.`);
    return saveBlock(tx, blockKey, value, adminId);
  }
  switch (key) {
    case 'featuredCollectionSlugs':
    case 'featuredProductIds':
    case 'featuredServiceSlugs': {
      const list = slugList.parse(value);
      const field = {
        featuredCollectionSlugs: 'collectionSlugs',
        featuredProductIds: 'productIds',
        featuredServiceSlugs: 'serviceSlugs',
      }[key];
      const [row] = await tx.select().from(s.siteContent).where(eq(s.siteContent.key, 'featured'));
      const current = (row?.value ?? { collectionSlugs: [], productIds: [], serviceSlugs: [] }) as Record<
        string,
        string[]
      >;
      return saveBlock(tx, 'featured', { ...current, [field]: list }, adminId);
    }
    case 'announcements': {
      const list = announcementsSchema.parse(value);
      await tx.delete(s.announcements);
      if (list.length) await tx.insert(s.announcements).values(list.map((a, i) => ({ ...a, sortOrder: i })));
      return;
    }
    case 'testimonials': {
      const list = testimonialsSchema.parse(value);
      await tx.delete(s.testimonials);
      if (list.length) await tx.insert(s.testimonials).values(list.map((t, i) => ({ ...t, sortOrder: i })));
      return;
    }
    case 'faqs': {
      const groups = faqsSchema.parse(value);
      const rows = groups.flatMap((g) => g.items.map((it) => ({ category: g.category, question: it.q, answer: it.a })));
      await tx.delete(s.faqs);
      if (rows.length) await tx.insert(s.faqs).values(rows.map((r, i) => ({ ...r, sortOrder: i })));
      return;
    }
    case 'policies': {
      const map = policiesSchema.parse(value);
      await tx.delete(s.policies);
      const rows = Object.entries(map).map(([slug, p]) => ({ slug, title: p.title, sections: p.sections }));
      if (rows.length) await tx.insert(s.policies).values(rows);
      return;
    }
  }
}

/**
 * Saves the given parts of the website content in one go. The admin needs the permission for every part
 * (homepage parts: `content.homepage`; About, contact, FAQs, policies: `content.pages`).
 */
export async function saveContent(patch: Partial<SiteContent>): Promise<Result> {
  const keys = Object.keys(patch ?? {}).filter((k): k is Key => k in PERMISSION);
  if (!keys.length) return { ok: true };
  const admin = await getAdmin();
  const missing = keys.find((k) => !admin || !hasPermission(admin, PERMISSION[k]));
  if (missing) return { ok: false, error: `You do not have permission to edit the ${LABEL[missing]}.` };
  return adminAction(
    PERMISSION[keys[0]],
    async (me) => {
      try {
        await db.transaction(async (tx) => {
          for (const k of keys) await savePart(tx, k, patch[k], me.id);
          await audit(tx, me, { section: 'Content', action: `Updated ${keys.map((k) => LABEL[k]).join(', ')}` });
        });
      } catch (e) {
        if (e instanceof z.ZodError)
          throw new ActionError('Some fields are empty or too long. Please check and try again.');
        throw e;
      }
      return { ok: true };
    },
    { revalidate: [STOREFRONT_TAG] },
  );
}

/* ------------------------------------------------------------------ */
/* Media library                                                       */
/* ------------------------------------------------------------------ */

/** Places that still show an image (it can't be deleted while used). */
async function usesOf(url: string): Promise<string[]> {
  const [row] = await db.execute<{ where: string | null }>(sql`
    select concat_ws(', ',
      case when exists (select 1 from product_images where url = ${url}) then 'products' end,
      case when exists (select 1 from categories where image_url = ${url}) then 'categories' end,
      case when exists (select 1 from services where image_url = ${url}) then 'services' end,
      case when exists (select 1 from specialists where image_url = ${url}) then 'specialists' end,
      case when exists (select 1 from site_content where value::text like ${`%${url}%`}) then 'website content' end
    ) as where`);
  return row?.where ? row.where.split(', ').filter(Boolean) : [];
}

/** Deletes an image from the library and storage, unless something on the site still shows it. */
export async function deleteMedia(id: string): Promise<Result> {
  return adminAction(
    'content.media',
    async (admin) => {
      if (!isUuid(id)) throw new ActionError('Image not found.');
      const [m] = await db.select().from(s.media).where(eq(s.media.id, id));
      if (!m) throw new ActionError('Image not found.');
      const used = await usesOf(m.url);
      if (used.length) throw new ActionError(`This image is still used in ${used.join(', ')}. Replace it there first.`);
      await db.delete(s.media).where(eq(s.media.id, id));
      // Our uploads live in one folder per image: the original plus each size.
      const folder = m.storagePath?.split('/')[0];
      if (folder && /^[0-9a-f]{16,}$/.test(folder)) {
        const storage = createAdminClient().storage.from(MEDIA_BUCKET);
        const { data } = await storage.list(folder);
        if (data?.length) await storage.remove(data.map((f) => `${folder}/${f.name}`));
      }
      await audit(db, admin, { section: 'Content', action: 'Deleted media', target: m.name });
      return { ok: true };
    },
    { revalidate: [STOREFRONT_TAG] },
  );
}

/** Refreshes the storefront after uploads (the upload itself is in lib/media/admin-upload.ts). */
export async function mediaUploaded(count: number): Promise<Result> {
  return adminAction('content.media', async (admin) => {
    await audit(db, admin, { section: 'Content', action: `Uploaded ${count} image${count === 1 ? '' : 's'}` });
    revalidateTag(STOREFRONT_TAG);
    return { ok: true };
  });
}
