-- Public bucket for catalog and site images: products, categories, services, specialists, homepage content.
-- Each upload is stored as `<key>/original.<ext>` plus resized WebP copies `<key>/<width>.webp`
-- (see apps/web/lib/media). Anyone can read through the public URL; only the server (secret key) writes,
-- so no storage.objects policies are granted to anon or authenticated users.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  26214400, -- 25 MiB, room for full-size phone photos
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
