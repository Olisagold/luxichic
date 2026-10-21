import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { db, signInAsOwner } from './helpers';

test('an admin uploads a large phone photo: it is shrunk in the browser, sized, and added to the library', async ({
  page,
}) => {
  // A 4000×3000 photo of random noise: several MB, and new on every run (so its storage key is new).
  const photo = await sharp({
    create: {
      width: 4000,
      height: 3000,
      channels: 3,
      background: '#808080',
      noise: { type: 'gaussian', mean: 128, sigma: 40 },
    },
  })
    .jpeg({ quality: 95 })
    .toBuffer();
  expect(photo.length).toBeGreaterThan(3 * 1024 * 1024);
  const since = new Date();

  await signInAsOwner(page);
  await page.goto('/admin/website/media');
  // The same photo twice in one pick: both upload at once, and the second finds its files already in place.
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Upload' }).click();
  await (
    await chooser
  ).setFiles([
    { name: 'phone-photo.jpg', mimeType: 'image/jpeg', buffer: photo },
    { name: 'phone-photo-again.jpg', mimeType: 'image/jpeg', buffer: photo },
  ]);
  await expect(page.getByText('Uploaded 2 images')).toBeVisible({ timeout: 60_000 });

  const rows = await db`
    select url, width, height, size_kb from media where created_at >= ${since} order by created_at`;
  expect(rows).toHaveLength(2);
  expect(rows[0].url).toBe(rows[1].url);
  // Shrunk to 2560px on the long side, keeping the shape, and much smaller than the camera file.
  expect([rows[0].width, rows[0].height]).toEqual([2560, 1920]);
  expect(rows[0].size_kb * 1024).toBeLessThan(photo.length);

  const key = String(rows[0].url).match(/\/([0-9a-f]{20})\/1200\.webp$/)?.[1];
  expect(key).toBeTruthy();
  const files = await db`
    select name from storage.objects where bucket_id = 'media' and name like ${`${key}/%`} order by name`;
  expect(files.map((f) => f.name)).toEqual(
    ['1200.webp', '1920.webp', '300.webp', '600.webp', 'original.jpg'].map((f) => `${key}/${f}`),
  );
  const [left] = await db`
    select count(*)::int as n from storage.objects
    where bucket_id = 'media' and name like 'incoming/%' and created_at >= ${since}`;
  expect(left.n).toBe(0);
});
