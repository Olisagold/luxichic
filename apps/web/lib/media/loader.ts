/**
 * next/image loader (see next.config.ts). Picks the stored width that fits, so images are never resized on
 * request by Vercel or Supabase.
 *
 * - Uploaded images (`…/media/<key>/<width>.webp`): the stored width that fits.
 * - The prototype's `/images/...` files that code still refers to (data/images.ts): their uploaded copy, once
 *   `pnpm db:media` has put them in this project's bucket (keys in prototype-media.json).
 * - Anything else (a fresh clone without Supabase, blob: previews): the URL unchanged.
 */
import prototypeMedia from './prototype-media.json';
import { mediaUrl, pickWidth, resizedUrl } from './urls';

const uploaded = prototypeMedia as Record<string, string>;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export default function mediaLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  const resized = resizedUrl(src, width);
  if (resized) return resized;
  const key = uploaded[src];
  if (key && supabaseUrl) return mediaUrl(supabaseUrl, key, pickWidth(width));
  return src;
}
