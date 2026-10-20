import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/device-records', () => ({ deviceRecordIds: vi.fn(), rememberDeviceRecord: vi.fn() }));
const { isTransactionReference, newOrderNumber, newTransactionReference } = await import('@/lib/orders/references');

describe('order numbers and transfer references', () => {
  it('makes order numbers like LXC-123456', () => {
    for (let i = 0; i < 200; i++) expect(newOrderNumber()).toMatch(/^LXC-[1-9]\d{5}$/);
  });

  it('makes 8-digit transfer references (the narration customers type)', () => {
    for (let i = 0; i < 200; i++) expect(isTransactionReference(newTransactionReference())).toBe(true);
  });

  it('accepts only 8 digits not starting with 0', () => {
    expect(['12345678', '98765432'].every(isTransactionReference)).toBe(true);
    expect(['01234567', '1234567', '123456789', '1234567a', 12345678, null].some(isTransactionReference)).toBe(false);
  });
});
