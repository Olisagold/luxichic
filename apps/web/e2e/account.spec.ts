import { expect, test } from '@playwright/test';
import { db, uniqueEmail } from './helpers';

test('sign up, sign out and sign in again', async ({ page }) => {
  const email = uniqueEmail('signup');
  const password = 'E2e-Customer-pw1';

  await page.goto('/register');
  await page.fill('#reg-name', 'Chidi Customer');
  await page.fill('#reg-email', email);
  await page.fill('#reg-phone', '08012345678');
  await page.fill('#reg-password', password);
  await page.fill('#reg-confirm', password);
  await page.locator('input[type=checkbox]').first().check();
  await page.getByRole('button', { name: 'Create Account' }).click();
  await page.waitForURL(/\/account/);
  await expect(page.getByRole('heading', { name: /Hello, Chidi/ })).toBeVisible();
  const [profile] = await db`select full_name, phone from profiles where email = ${email}`;
  expect(profile).toMatchObject({ full_name: 'Chidi Customer', phone: '08012345678' });

  // Sign out (clear the session), then sign in with the same details.
  await page.context().clearCookies();
  await page.goto('/login');
  await page.fill('#login-email', email);
  await page.fill('#login-password', 'wrong-password-1');
  await page.getByRole('button', { name: /^Sign in$/i }).click();
  await expect(page.getByText(/incorrect/i)).toBeVisible();
  await page.fill('#login-password', password);
  await page.getByRole('button', { name: /^Sign in$/i }).click();
  await page.waitForURL((u) => u.pathname === '/account');
  await expect(page.getByRole('heading', { name: /Hello, Chidi/ })).toBeVisible();
});
