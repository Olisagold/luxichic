import { expect, test } from '@playwright/test';
import { db, uniqueEmail } from './helpers';

test('book an appointment: a free day and time, then the request is saved as pending', async ({ page }) => {
  const email = uniqueEmail('book');
  await page.goto('/salon/book');
  await page.selectOption('#bk-service', 'manicure');

  // The first day that can be booked (not closed, full or past), moving to next month if needed.
  const calendar = page.getByRole('group', { name: 'Choose a date' }).or(page.locator('[aria-label="Choose a date"]'));
  let day = calendar.locator('button:not([disabled])').filter({ hasNotText: /^$/ }).first();
  if (!(await day.count())) {
    await page.getByRole('button', { name: 'Next month' }).click();
    day = calendar.locator('button:not([disabled])').first();
  }
  await day.click();
  const time = page
    .getByRole('radiogroup', { name: 'Available times' })
    .locator('[role="radio"]:not([disabled])')
    .first();
  await time.click();
  const chosen = await time.innerText();

  await page.fill('#bk-name', 'Bola Booker');
  await page.fill('#bk-phone', '08012345678');
  await page.fill('#bk-email', email);
  await page.getByRole('button', { name: 'Request Appointment' }).click();

  await page.waitForURL(/\/salon\/appointment\/APT-\d+/);
  await expect(page.getByText(/APT-\d+/).first()).toBeVisible();
  const [appt] = await db`select status, service_name, specialist_id from appointments where customer_email = ${email}`;
  expect(appt).toMatchObject({ status: 'pending', service_name: 'Manicure' });
  expect(appt.specialist_id).toBeTruthy();
  expect(chosen).toMatch(/\d/);
});
