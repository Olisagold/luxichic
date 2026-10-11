/**
 * Where uploaded images live and which sizes exist. Safe for client and server code.
 *
 * Every image in the `media` bucket is stored once per width in MEDIA_WIDTHS, as `<key>/<width>.webp`, next to
 * the untouched `<key>/original.<ext>`. Smaller originals are never enlarged, so a "1920" file can be narrower.
 * The database keeps the 1200px URL: a sensible size for anything that shows the URL as is (share previews,
 * emails, admin thumbnails); `<Image>` swaps in the right width through lib/media/loader.ts.
 */
export const MEDIA_BUCKET = 'media';
export const MEDIA_WIDTHS = [300, 600, 1200, 1920] as const;
export const DEFAULT_MEDIA_WIDTH = 1200;

const MEDIA_PATH = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
const VARIANT = /^(.+\/storage\/v1\/object\/public\/media\/[0-9a-f]{16,})\/\d+\.webp$/;

/** The public URL of one size of an uploaded image. */
export function mediaUrl(supabaseUrl: string, key: string, width: number = DEFAULT_MEDIA_WIDTH): string {
  return `${supabaseUrl.replace(/\/$/, '')}${MEDIA_PATH}${key}/${width}.webp`;
}

/** The smallest stored width at least as wide as `width` (or the largest there is). */
export function pickWidth(width: number): number {
  return MEDIA_WIDTHS.find((w) => w >= width) ?? MEDIA_WIDTHS[MEDIA_WIDTHS.length - 1];
}

/** The same image at another width, or null when `src` isn't one of our resized uploads. */
export function resizedUrl(src: string, width: number): string | null {
  const m = src.match(VARIANT);
  return m ? `${m[1]}/${pickWidth(width)}.webp` : null;
}
