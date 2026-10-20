import { expect, type Page } from '@playwright/test';
import postgres from 'postgres';
import { localSupabase } from './local-supabase';

/** The local test database, for setting up and checking results. */
export const db = postgres(localSupabase().dbUrl, { prepare: false, max: 2 });

/** A fresh customer email for each run, so tests don't depend on each other. */
export const uniqueEmail = (label: string) => `e2e+${label}-${Date.now()}@example.com`;

/** The password `pnpm db:seed` gives the seeded logins in the e2e setup (SEED_PASSWORD). */
export const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'E2e-Test-pw1';

export const TOOL = 'ceramic-flat-iron-straightener';

/** Adds the product to the cart and goes through checkout as a guest (customer, delivery, review) to payment. */
export async function checkoutToPayment(page: Page, email: string) {
  await page.goto(`/tools/product/${TOOL}`);
  await page
    .getByRole('button', { name: /^Add to Cart$/ })
    .first()
    .click();
  await page.goto('/checkout');
  await expect(page.getByLabel('Order summary')).toContainText('Ceramic Flat Iron Straightener');
  await page.fill('#co-name', 'Ada Tester');
  await page.fill('#co-email', email);
  await page.fill('#co-phone', '08012345678');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.selectOption('#co-state', 'Lagos');
  await page.fill('#co-city', 'Ikeja');
  await page.fill('#co-street', '1 Allen Avenue');
  await page.getByRole('button', { name: 'Continue' }).click();
  // Review, then payment.
  await expect(page.getByRole('heading', { name: 'Review your order' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('radiogroup', { name: 'Payment method' })).toBeVisible();
}

/** Signs in as the seeded owner (demoadmin@luxichic.com). */
export async function signInAsOwner(page: Page) {
  await page.goto('/admin/login');
  await page.fill('#admin-email', 'demoadmin@luxichic.com');
  await page.fill('#admin-password', SEED_PASSWORD);
  await page.getByRole('button', { name: /^Sign in$/ }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/admin/login'));
}

/** Switches Pay on Delivery on or off in Admin → Payments (which refreshes the shop at once). */
export async function setPayOnDelivery(page: Page, on: boolean) {
  await page.goto('/admin/payments');
  const toggle = page.getByRole('switch', { name: 'Offer Pay on Delivery at checkout' });
  if ((await toggle.getAttribute('aria-checked')) !== String(on)) {
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', String(on));
  }
}
