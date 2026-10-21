'use server';

import { randomUUID } from 'node:crypto';
import { db } from '@/db';
import { media, mediaFolder } from '@/db/schema';
import { AuthorizationError, getAdmin, hasPermission } from '@/lib/auth/session';
import { requireEnv } from '@/lib/env';
import { MEDIA_BUCKET, mediaUrl } from '@/lib/media/urls';
import { processImage } from '@/lib/media/variants';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Permission } from '@/types/admin';
import type { Result } from '@/types/user';

/**
 * Admin image uploads, in two steps so large photos never pass through a Vercel function (it rejects requests
 * over 4.5 MB): the browser shrinks the photo and uploads it straight to Storage with a signed URL
 * (lib/media/upload-client.ts), then the server makes the WebP sizes (lib/media/variants.ts), moves the upload
 * into place as the original, records it in the media library and returns the 1200px URL.
 */

type Folder = (typeof mediaFolder.enumValues)[number];

/** Who may upload for what. */
const PURPOSE: Record<'product' | 'category' | 'salon' | 'content', Permission[]> = {
  product: ['products.create', 'products.edit'],
  category: ['categories.manage'],
  salon: ['salon.services', 'salon.specialists'],
  content: ['content.homepage', 'content.pages', 'content.media'],
};
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif', 'image/gif'];
const MAX_BYTES = 25 * 1024 * 1024;
const INCOMING = /^incoming\/[0-9a-f-]{36}$/;

async function uploader(purpose: keyof typeof PURPOSE) {
  const admin = await getAdmin();
  if (!admin || !PURPOSE[purpose]?.some((p) => hasPermission(admin, p))) {
    throw new AuthorizationError('You do not have permission to upload images.');
  }
  return admin;
}

/** A one-time URL the browser uploads the original image to. */
export async function startImageUpload(
  purpose: keyof typeof PURPOSE,
  contentType: string,
  size: number,
): Promise<Result & { path?: string; token?: string }> {
  try {
    await uploader(purpose);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (!TYPES.includes(contentType)) return { ok: false, error: 'Use a JPEG, PNG, WebP, AVIF, HEIC or GIF image.' };
  if (!(size > 0) || size > MAX_BYTES) return { ok: false, error: 'Images can be up to 25 MB.' };
  const path = `incoming/${randomUUID()}`;
  const { data, error } = await createAdminClient().storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: 'Could not start the upload. Please try again.' };
  return { ok: true, path: data.path, token: data.token };
}

/** Resizes an uploaded original, adds it to the media library and returns its URL. */
export async function finishImageUpload(
  purpose: keyof typeof PURPOSE,
  path: string,
  info: { name: string; folder: Folder },
): Promise<Result & { url?: string }> {
  let admin;
  try {
    admin = await uploader(purpose);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (typeof path !== 'string' || !INCOMING.test(path)) return { ok: false, error: 'Upload not found.' };
  const folder: Folder = mediaFolder.enumValues.includes(info?.folder) ? info.folder : 'products';
  const storage = createAdminClient().storage.from(MEDIA_BUCKET);
  try {
    const { data: blob, error } = await storage.download(path);
    if (error || !blob) return { ok: false, error: 'Upload not found. Please try again.' };
    const original = Buffer.from(await blob.arrayBuffer());
    const image = await processImage(original);
    const [originalFile, ...sizes] = image.files;
    const put = async (f: (typeof image.files)[number]) => {
      const { error: upErr } = await storage.upload(f.path, f.body, {
        contentType: f.contentType,
        cacheControl: '31536000',
        upsert: true,
      });
      if (upErr) throw upErr;
    };
    await Promise.all([
      ...sizes.map(put),
      // The uploaded file becomes the original where it is, instead of being sent again. A move fails when the
      // same image was uploaded before (same key), so then it's written over as before.
      storage.move(path, originalFile.path).then(({ error: moveErr }) => (moveErr ? put(originalFile) : undefined)),
    ]);
    const url = mediaUrl(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), image.key);
    await db.insert(media).values({
      url,
      storagePath: image.files[0].path,
      name: String(info?.name ?? 'Image').slice(0, 200),
      folder,
      width: image.width,
      height: image.height,
      sizeKb: Math.round(original.length / 1024),
      uploadedByAdminId: admin.id,
    });
    return { ok: true, url };
  } catch {
    return { ok: false, error: 'Could not use that image. Please try a JPEG or PNG.' };
  } finally {
    await storage.remove([path]);
  }
}
