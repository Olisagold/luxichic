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

/**
 * Runs inside the database as one statement (one round trip, all or nothing): for every text, text[] and jsonb
 * column, swaps each `/images/<file>` for its uploaded URL in the rows that mention `/images/`. Thousands of
 * small queries from here would hold a transaction open for minutes, which Supabase's pooler cuts off.
 */
const REWRITE = (urls: Record<string, string>) => `
do $rewrite$
declare
  urls jsonb := '${JSON.stringify(urls).replace(/'/g, "''")}'::jsonb;
  col record;
  path text;
  expr text;
  n bigint;
  total bigint := 0;
begin
  for col in
    select c.table_name, c.column_name,
           case when c.data_type = 'ARRAY' then 'text[]' else c.data_type end as type
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
      and (c.data_type in ('text', 'jsonb') or (c.data_type = 'ARRAY' and c.udt_name = '_text'))
  loop
    expr := format('%I::text', col.column_name);
    for path in select jsonb_object_keys(urls) loop
      expr := format('replace(%s, %L, %L)', expr, path, urls ->> path);
    end loop;
    execute format(
      'update public.%I set %I = (%s)::%s where %I::text like %L and (%s) <> %I::text',
      col.table_name, col.column_name, expr, col.type, col.column_name, '%/images/%', expr, col.column_name);
    get diagnostics n = row_count;
    if n > 0 then
      raise notice '%.%: % rows', col.table_name, col.column_name, n;
      total := total + n;
    end if;
  end loop;
  raise notice 'total %', total;
end
$rewrite$`;

async function rewrite(images: Uploaded[]) {
  let total = 0;
  const rewriteClient = postgres(target.databaseUrl, {
    prepare: false,
    max: 1,
    onnotice: (n) => {
      const m = n.message.match(/^total (\d+)$/);
      if (m) total = Number(m[1]);
      else console.log(`  ${n.message}`);
    },
  });
  try {
    await rewriteClient.unsafe(REWRITE(Object.fromEntries(images.map((i) => [i.path, i.url]))));
    await rewriteClient`
      update media m
      set storage_path = i.original, width = i.width, height = i.height, size_kb = i."sizeKb"
      from jsonb_to_recordset(${rewriteClient.json(images as never)})
        as i(url text, original text, width int, height int, "sizeKb" int)
      where m.url = i.url and m.storage_path is null`;
  } finally {
    await rewriteClient.end();
  }
  console.log(total ? `${total} database rows now point at the bucket.` : 'No /images URLs left in the database.');
}

async function main() {
  console.log(`Target: ${target.supabaseUrl}`);
  const images = await upload();
  await rewrite(images);

  const manifest = Object.fromEntries(images.map((i) => [i.path, i.original.split('/')[0]]));
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
