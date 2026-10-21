import { createClient } from '@/lib/supabase/client';
import { MEDIA_BUCKET } from '@/lib/media/urls';
import { finishImageUpload, startImageUpload } from '@/lib/media/admin-upload';

type Purpose = Parameters<typeof startImageUpload>[0];
type Folder = Parameters<typeof finishImageUpload>[2]['folder'];

/** Longest side kept. The site shows at most 1920px, so this leaves room for zoom and future screens. */
const MAX_SIDE = 2560;
/** Smaller files at or under MAX_SIDE go up as they are. */
const SMALL_ENOUGH = 1.5 * 1024 * 1024;

/**
 * Shrinks a large photo in the browser before upload (decided with the CEO, 2026-10-21): a 12 MB phone photo
 * becomes about 1 MB, so the upload takes seconds instead of a minute on mobile data. The stored "original" is
 * this copy. Photos turn into JPEG; PNG and WebP into WebP, keeping transparency. GIFs (maybe animated) and
 * anything the browser can't read (HEIC outside Safari) go up untouched, as does a copy that isn't smaller.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (file.type === 'image/gif' || typeof createImageBitmap !== 'function') return file;
  let bitmap: ImageBitmap;
  try {
    // Applies the photo's EXIF rotation; the canvas copy then carries no EXIF, so it isn't rotated twice.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SMALL_ENOUGH) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const keepAlpha = file.type === 'image/png' || file.type === 'image/webp';
    const type = keepAlpha ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
    // Browsers without WebP export hand back PNG; keep the original then.
    if (!blob || blob.type !== type || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + (keepAlpha ? '.webp' : '.jpg');
    return new File([blob], name, { type, lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}

/** Uploads an image from the admin (see lib/media/admin-upload.ts) and returns its URL. Throws with a message. */
export async function uploadAdminImage(picked: File, purpose: Purpose, folder: Folder): Promise<string> {
  const file = await shrinkImage(picked);
  const start = await startImageUpload(purpose, file.type, file.size);
  if (!start.ok || !start.path || !start.token) throw new Error(start.error ?? 'Could not start the upload.');
  const { error } = await createClient()
    .storage.from(MEDIA_BUCKET)
    .uploadToSignedUrl(start.path, start.token, file, { contentType: file.type });
  if (error) throw new Error('The upload failed. Please check your connection and try again.');
  const done = await finishImageUpload(purpose, start.path, { name: picked.name, folder });
  if (!done.ok || !done.url) throw new Error(done.error ?? 'Could not process the image.');
  return done.url;
}

/**
 * Uploads several images, three at a time, calling `onEach` in the order they were picked as each is ready (so
 * the first picked stays first). A failure goes to `onError` and doesn't stop the rest.
 */
export async function uploadAdminImages(
  files: File[],
  purpose: Purpose,
  folder: Folder,
  onEach: (url: string, file: File) => void,
  onError: (message: string, file: File) => void,
): Promise<void> {
  let running = 0;
  const waiting: (() => void)[] = [];
  const jobs = files.map(async (file) => {
    while (running >= 3) await new Promise<void>((resolve) => waiting.push(resolve));
    running += 1;
    try {
      return { url: await uploadAdminImage(file, purpose, folder) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Could not read that image.' };
    } finally {
      running -= 1;
      waiting.shift()?.();
    }
  });
  for (const [i, job] of jobs.entries()) {
    const r = await job;
    if (r.url) onEach(r.url, files[i]);
    else onError(r.error ?? 'Could not read that image.', files[i]);
  }
}
