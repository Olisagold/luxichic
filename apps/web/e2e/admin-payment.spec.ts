import { expect, test } from '@playwright/test';
import { checkoutToPayment, db, signInAsOwner, uniqueEmail } from './helpers';

test('an admin verifies a bank transfer: the order becomes Confirmed and the payment is recorded', async ({
  browser,
}) => {
  // A customer places a bank-transfer order.
  const shop = await browser.newPage();
  const email = uniqueEmail('verify');
  await checkoutToPayment(shop, email);
  await shop.getByRole('radio', { name: /Bank Transfer/i }).click();
  await shop.getByRole('button', { name: /Place Order/ }).click();
  await shop.waitForURL(/\/order\/LXC-\d{6}$/);
  const orderNumber = shop.url().split('/').pop()!;

  // The owner signs in and confirms the payment.
  const admin = await browser.newPage();
  await signInAsOwner(admin);
  await admin.goto(`/admin/orders/${orderNumber}`);
  await admin.getByRole('button', { name: 'Confirm payment' }).first().click();
  await admin.getByRole('dialog').getByRole('checkbox').check();
  await admin.getByRole('dialog').getByRole('button', { name: 'Confirm payment' }).click();
  await expect(admin.getByText('Payment confirmed and order moved to Confirmed')).toBeVisible();

  const [row] = await db`
    select o.status, p.status as payment, p.confirmed_by_admin_id is not null as recorded
    from orders o join payments p on p.order_id = o.id where o.order_number = ${orderNumber}`;
  expect(row).toEqual({ status: 'confirmed', payment: 'payment_confirmed', recorded: true });
});
