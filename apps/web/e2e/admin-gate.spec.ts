import { expect, test } from '@playwright/test';
import { db, SEED_PASSWORD, signInAsOwner } from './helpers';
import { ADMIN_PATH } from './local-supabase';

test.describe('secret admin address', () => {
  test('signed out, /admin looks like any missing page; staff sign in at the secret address', async ({
    page,
    request,
  }) => {
    for (const path of ['/admin', '/admin/login', '/admin/dashboard', '/admin.webmanifest']) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(404);
    }
    // The marker the server sets on secret-address requests can't be sent from outside.
    const spoofed = await request.get('/admin/login', { headers: { 'x-luxichic-admin-gate': '1' }, maxRedirects: 0 });
    expect(spoofed.status()).toBe(404);
    // Nothing public names it.
    expect(await (await request.get('/robots.txt')).text()).not.toMatch(/admin|staff-gate/);

    const manifest = await (await request.get(`/${ADMIN_PATH}/app.webmanifest`)).json();
    expect(manifest).toMatchObject({ name: 'LUXICHIC Admin', start_url: `/${ADMIN_PATH}` });

    await page.goto(`/${ADMIN_PATH}`);
    await expect(page.locator('#admin-email')).toBeVisible();
  });

  test('staff work as usual after signing in, and signing out returns to the secret address', async ({ page }) => {
    await signInAsOwner(page);
    await page.goto('/admin/orders');
    await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('button', { name: 'Log out' }).click();
    await page.waitForURL((u) => u.pathname === `/${ADMIN_PATH}`);
    await expect(page.locator('#admin-email')).toBeVisible();
  });

  test('a signed-in customer finds nothing at /admin', async ({ page }) => {
    const [customer] =
      await db`select email from profiles where email like '%@example.com' order by created_at limit 1`;
    await page.goto('/login');
    await page.fill('#login-email', customer.email);
    await page.fill('#login-password', SEED_PASSWORD);
    await page.getByRole('button', { name: /^Sign in$/i }).click();
    await page.waitForURL((u) => u.pathname === '/account');
    const res = await page.goto('/admin/dashboard');
    expect(res?.status()).toBe(404);
  });
});
