import { describe, expect, it } from 'vitest';
import { deliveryFeesFrom } from '@/lib/storefront/derive';

describe('delivery fees', () => {
  it('charges each state its fee, free states nothing, and leaves out states switched off', () => {
    expect(
      deliveryFeesFrom([
        { state: 'Lagos', fee: 3_500, free: false, enabled: true },
        { state: 'Ogun', fee: 5_000, free: true, enabled: true },
        { state: 'Kano', fee: 9_000, free: false, enabled: false },
      ]),
    ).toEqual({ Lagos: 3_500, Ogun: 0 });
  });
});
