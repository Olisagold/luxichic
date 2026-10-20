import { describe, expect, it, vi } from 'vitest';
import { fillTemplate, fillTemplateLines } from '@/lib/utils/text';

vi.mock('@/db', () => ({ db: {} }));
vi.mock('@/lib/push/send', () => ({ pushToAdmins: vi.fn() }));
vi.mock('@/lib/telegram/client', () => ({ sendTelegramMessage: vi.fn() }));
const { orderValues } = await import('@/lib/notify/team');
const { DEFAULT_TELEGRAM, withTelegramDefaults } = await import('@/lib/settings/store');

const order = {
  orderNumber: 'LXC-345120',
  customerName: 'Ada Obi',
  customerPhone: '09098763547',
  subtotal: 279_000,
  deliveryFee: 7_500,
  discountAmount: 27_900,
  discountCode: 'LUXE10',
  total: 258_600,
  shipHouseNumber: 'Flat 3',
  shipStreet: '12 Zik Avenue',
  shipCity: 'Awka',
  shipState: 'Anambra',
  shipCountry: 'Nigeria',
  shipLandmark: 'the old market',
  shipInstructions: 'Call before delivery',
  transactionReference: '26323471',
} as Parameters<typeof orderValues>[0];
const items = [
  { quantity: 1, productName: '360 Lace Deep Wave Wig', variants: { Length: '22"' }, unitPrice: 275_000 },
  { quantity: 2, productName: 'Edge Control', variants: {}, unitPrice: 2_000 },
] as Parameters<typeof orderValues>[1];

describe('message templates', () => {
  it('fills {{variables}} and leaves unknown ones visible', () => {
    expect(fillTemplate('Hi {{ name }}, {{x}}', { name: 'Ada' })).toBe('Hi Ada, {{x}}');
  });

  it('drops lines whose variables are all empty, keeping blank lines on purpose', () => {
    expect(fillTemplateLines('A {{a}}\n{{b}}\n\nEnd', { a: '1', b: '' })).toBe('A 1\n\nEnd');
  });
});

describe('Telegram new-order message', () => {
  const text = fillTemplateLines(DEFAULT_TELEGRAM.orderTemplate, orderValues(order, items, 'Bank transfer'));

  it('lists each item with its options and price, and the unit price for several', () => {
    expect(text).toContain('1 × 360 Lace Deep Wave Wig (Length: 22") — ₦275,000');
    expect(text).toContain('2 × Edge Control — ₦4,000 (₦2,000 each)');
  });

  it('shows the subtotal, delivery fee and discount before the total', () => {
    const lines = text.split('\n');
    const at = (s: string) => lines.findIndex((l) => l.startsWith(s));
    expect(lines[at('Subtotal')]).toBe('Subtotal: ₦279,000');
    expect(lines[at('Delivery:')]).toBe('Delivery: ₦7,500');
    expect(lines[at('Discount')]).toBe('Discount (LUXE10): −₦27,900');
    expect(at('Subtotal') < at('Delivery:') && at('Delivery:') < at('Discount') && at('Discount') < at('Total')).toBe(
      true,
    );
  });

  it('gives the full address with landmark and note', () => {
    expect(text).toContain('Deliver to: Flat 3, 12 Zik Avenue, Awka, Anambra (near the old market)');
    expect(text).toContain('Note: Call before delivery');
  });

  it('leaves out lines with nothing to show, and says when delivery is free', () => {
    const plain = fillTemplateLines(
      DEFAULT_TELEGRAM.orderTemplate,
      orderValues(
        { ...order, discountAmount: 0, shipLandmark: null, shipInstructions: null, deliveryFee: 0 },
        items,
        'Bank transfer',
      ),
    );
    expect(plain).not.toMatch(/Discount|Note:|near/);
    expect(plain).toContain('Delivery: Free');
  });

  it('moves a template still saved as the original to the new one, but keeps an edited one', () => {
    const original =
      '🛍 New order {{order_number}}\n{{customer_name}} · {{customer_phone}}\n{{products}}\nTotal: {{total_amount}} ({{payment_method}})\nDeliver to: {{delivery_state}}\nRef: {{transaction_reference}}';
    expect(withTelegramDefaults({ orderTemplate: original }).orderTemplate).toBe(DEFAULT_TELEGRAM.orderTemplate);
    expect(withTelegramDefaults({ orderTemplate: 'Order {{order_number}}' }).orderTemplate).toBe(
      'Order {{order_number}}',
    );
  });
});
