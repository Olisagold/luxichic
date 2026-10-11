/**
 * Moves the prototype's images (apps/web/public/images) into a project's `media` storage bucket and points the
 * database at them:
 *
 *   1. Resizes each file (lib/media/variants.ts) and uploads the original plus its WebP sizes. Files already in
 *      the bucket are skipped, so it is safe to run again.
 *   2. Replaces every `/images/<file>` URL stored in the database (catalog, content, settings, orders…) with
 *      the uploaded 1200px URL, and fills in the media library's size details.
 *   3. Writes apps/web/lib/media/prototype-media.json, which lets code that still names `/images/...` files
 *      (data/images.ts) load the uploaded copies. Keys come from file contents, so they match in every project.
 *
 *   corepack pnpm db:media                                          → local Supabase
 *   corepack pnpm db:media -- --env-file apps/web/.env.prod.local   → that hosted project
 *
 * Needs the `media` bucket (migration 20261011150000_media_storage.sql).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { processImage } from '../../apps/web/lib/media/variants';
import { MEDIA_BUCKET, mediaUrl } from '../../apps/web/lib/media/urls';
import { resolveTarget } from './connect';

// Run from the repo root (the package.json script does).
const IMAGES_DIR = resolve('apps/web/public/images');
const MANIFEST = resolve('apps/web/lib/media/prototype-media.json');
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const YEAR = String(60 * 60 * 24 * 365);

const target = resolveTarget();
const supabase = createClient(target.supabaseUrl, target.secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const client = postgres(target.databaseUrl, { prepare: false, max: 1 });

async function retry<T>(what: string, fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt === 4) throw new Error(`${what}: ${e instanceof Error ? e.message : e}`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

async function existingKeys(): Promise<Set<string>> {
  const keys = new Set<string>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(MEDIA_BUCKET).list('', { limit: 1000, offset });
    if (error)
      throw new Error(`Can't read the "${MEDIA_BUCKET}" bucket (${error.message}). Push the migrations first.`);
    data.forEach((f) => keys.add(f.name));
    if (data.length < 1000) return keys;
  }
}

interface Uploaded {
  path: string;
  url: string;
  original: string;
  width: number;
  height: number;
  sizeKb: number;
}

async function upload(): Promise<Uploaded[]> {
  const already = await existingKeys();
  const files = readdirSync(IMAGES_DIR)
    .filter((f) => IMAGE_EXT.has(extname(f).toLowerCase()))
    .sort();
  const out: Uploaded[] = [];
  let uploadedCount = 0;
  for (const name of files) {
    const body = readFileSync(join(IMAGES_DIR, name));
    const image = await processImage(body);
    // The 1920 file is uploaded last, so its presence means the whole set is there.
    if (!already.has(image.key) || !(await hasFile(image.key, '1920.webp'))) {
      for (const f of image.files) {
        await retry(`Uploading ${f.path}`, async () => {
          const { error } = await supabase.storage
            .from(MEDIA_BUCKET)
            .upload(f.path, f.body, { contentType: f.contentType, cacheControl: YEAR, upsert: true });
          if (error) throw error;
        });
      }
      uploadedCount++;
      console.log(`  uploaded ${name}`);
    }
    out.push({
      path: `/images/${name}`,
      url: mediaUrl(target.supabaseUrl, image.key),
      original: image.files[0].path,
      width: image.width,
      height: image.height,
      sizeKb: Math.round(body.length / 1024),
    });
  }
  console.log(`${uploadedCount} uploaded, ${files.length - uploadedCount} already in the bucket.`);
  return out;
}

async function hasFile(key: string, file: string): Promise<boolean> {
  const { data } = await supabase.storage.from(MEDIA_BUCKET).list(key, { search: file });
  return !!data?.some((f) => f.name === file);
}

/** Every text, text[] and jsonb column in the public schema. */
async function urlColumns() {
  return client<{ table_name: string; column_name: string; type: string }[]>`
    select c.table_name, c.column_name,
           case when c.data_type = 'ARRAY' then 'text[]' else c.data_type end as type
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
      and (c.data_type in ('text', 'jsonb') or (c.data_type = 'ARRAY' and c.udt_name = '_text'))`;
}

async function rewrite(images: Uploaded[]) {
  const columns = await urlColumns();
  let changed = 0;
  await client.begin(async (tx) => {
    for (const { table_name, column_name, type } of columns) {
      const t = `"${table_name.replace(/"/g, '""')}"`;
      const c = `"${column_name.replace(/"/g, '""')}"`;
      const query = `update ${t} set ${c} = replace(${c}::text, $1, $2)::${type} where strpos(${c}::text, $1) > 0`;
      for (const img of images) {
        const res = await tx.unsafe(query, [img.path, img.url]);
        if (res.count) {
          changed += res.count;
          console.log(`  ${table_name}.${column_name}: ${res.count} × ${img.path}`);
        }
      }
    }
    for (const img of images) {
      await tx`
        update media set storage_path = ${img.original}, width = ${img.width}, height = ${img.height},
                         size_kb = ${img.sizeKb}
        where url = ${img.url} and storage_path is null`;
    }
  });
  console.log(
    changed ? `${changed} database values now point at the bucket.` : 'No /images URLs left in the database.',
  );
}

async function main() {
  console.log(`Target: ${target.supabaseUrl}`);
  const images = await upload();
  await rewrite(images);

  const manifest = Object.fromEntries(images.map((i) => [i.path, i.original.split('/')[0]]));
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
