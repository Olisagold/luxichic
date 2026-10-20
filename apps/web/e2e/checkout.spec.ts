import { expect, test } from '@playwright/test';
import { checkoutToPayment, db, setPayOnDelivery, signInAsOwner, uniqueEmail } from './helpers';

test.describe('checkout', () => {
  test('bank transfer: order placed, reference and bank details shown, payment awaiting verification', async ({
    page,
  }) => {
    const email = uniqueEmail('bank');
    await checkoutToPayment(page, email);
    await page.getByRole('radio', { name: /Bank Transfer/i }).click();
    await page.getByRole('button', { name: /Place Order/ }).click();

    await page.waitForURL(/\/order\/LXC-\d{6}$/);
    await expect(page.getByText(/Thank you, Ada/)).toBeVisible();
    const reference = await page.locator('p.font-mono').first().innerText();
    expect(reference).toMatch(/^\d{8}$/);

    const [order] = await db`
      select o.status, o.total, o.delivery_fee, p.status as payment
      from orders o join payments p on p.order_id = o.id where o.customer_email = ${email}`;
    expect(order).toMatchObject({ status: 'pending', payment: 'pending_verification' });
    expect(order.delivery_fee).toBeGreaterThan(0);
  });

  test('pay on delivery: offered once the admin switches it on, order placed without a transfer', async ({
    page,
    browser,
  }) => {
    const admin = await browser.newPage();
    await signInAsOwner(admin);
    await setPayOnDelivery(admin, true);
    const email = uniqueEmail('pod');
    await checkoutToPayment(page, email);
    await page.getByRole('radio', { name: /Pay on Delivery/i }).click();
    await page.getByRole('button', { name: /Place Order/ }).click();

    await page.waitForURL(/\/order\/LXC-\d{6}$/);
    const [order] = await db`
      select o.status, o.payment_method, p.status as payment
      from orders o join payments p on p.order_id = o.id where o.customer_email = ${email}`;
    expect(order).toMatchObject({ status: 'pending', payment_method: 'pay_on_delivery', payment: 'pay_on_delivery' });
    await setPayOnDelivery(admin, false);
  });
});
