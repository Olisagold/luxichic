/**
 * Turns one uploaded image into the files stored in the `media` bucket: the untouched original plus a WebP per
 * width in MEDIA_WIDTHS. Node only (sharp); used by `pnpm db:media` now and by the admin's uploads in Phase 8.
 */
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { MEDIA_WIDTHS } from './urls';

export interface MediaFile {
  path: string;
  body: Buffer;
  contentType: string;
}

export interface ProcessedImage {
  /** Folder name in the bucket, from the original's contents: the same file always gets the same key. */
  key: string;
  /** Size of the original after applying its EXIF rotation. */
  width: number;
  height: number;
  files: MediaFile[];
}

const ORIGINAL_TYPES: Record<string, { ext: string; contentType: string }> = {
  jpeg: { ext: 'jpg', contentType: 'image/jpeg' },
  png: { ext: 'png', contentType: 'image/png' },
  webp: { ext: 'webp', contentType: 'image/webp' },
  avif: { ext: 'avif', contentType: 'image/avif' },
  gif: { ext: 'gif', contentType: 'image/gif' },
  heif: { ext: 'heic', contentType: 'image/heic' },
};

export async function processImage(original: Buffer): Promise<ProcessedImage> {
  const meta = await sharp(original).metadata();
  const type = meta.format && ORIGINAL_TYPES[meta.format];
  if (!type || !meta.width || !meta.height) throw new Error('Not a supported image (use JPEG, PNG, WebP or AVIF).');

  const key = createHash('sha256').update(original).digest('hex').slice(0, 20);
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;

  const files: MediaFile[] = [{ path: `${key}/original.${type.ext}`, body: original, contentType: type.contentType }];
  for (const w of MEDIA_WIDTHS) {
    const body = await sharp(original)
      .rotate() // apply the EXIF orientation, then drop the metadata
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 80, alphaQuality: 90, effort: 5 })
      .toBuffer();
    files.push({ path: `${key}/${w}.webp`, body, contentType: 'image/webp' });
  }
  return { key, width, height, files };
}
