import { describe, expect, it, vi } from 'vitest';
import type { AdminUser, Permission } from '@/types/admin';

vi.mock('@/db', () => ({ db: {} }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
const { canSee } = await import('@/lib/notifications/for-admin');
const { bookingScope } = await import('@/lib/auth/session');

const admin = (role: AdminUser['role'], permissions: Permission[], over: Partial<AdminUser> = {}) =>
  ({
    id: 'a',
    fullName: 'X',
    email: 'x@x',
    role,
    isOwner: false,
    status: 'active',
    permissions,
    createdAt: '',
    ...over,
  }) as AdminUser;
const ceo = admin('Super Admin', [], { isOwner: true });
const orderManager = admin('Order Manager', [
  'dashboard.view',
  'orders.view',
  'orders.confirmPayment',
  'orders.edit',
  'customers.view',
  'customers.edit',
]);
const support = admin('Customer Support', ['customers.view', 'reviews.view', 'appointments.view']);
const braider = admin('Specialist', ['appointments.view', 'appointments.confirm', 'appointments.reschedule'], {
  specialistId: 'braider',
});
const n = (kind: Parameters<typeof canSee>[1]['kind'], specialistId: string | null = null) => ({ kind, specialistId });

describe('whose bell (and phone) gets what', () => {
  it('the CEO gets everything', () => {
    for (const kind of ['order', 'payment', 'stock', 'appointment', 'review', 'customer', 'integration'] as const) {
      expect(canSee(ceo, n(kind))).toBe(true);
    }
  });

  it('the Order Manager gets orders, payments and stock, nothing from the salon, no contact messages', () => {
    expect([n('order'), n('payment'), n('stock')].every((x) => canSee(orderManager, x))).toBe(true);
    expect([n('appointment', 'braider'), n('review'), n('customer')].some((x) => canSee(orderManager, x))).toBe(false);
  });

  it('contact messages go to the CEO and Customer Support', () => {
    expect(canSee(support, n('customer'))).toBe(true);
  });

  it('a specialist gets only their own bookings', () => {
    expect(canSee(braider, n('appointment', 'braider'))).toBe(true);
    expect(canSee(braider, n('appointment', 'nails'))).toBe(false);
    expect(canSee(braider, n('appointment', null))).toBe(false);
    expect(canSee(braider, n('order'))).toBe(false);
  });
});

describe('own-bookings-only', () => {
  it('applies to a login linked to a specialist, not the owner or a Super Admin', () => {
    expect(bookingScope(braider)).toBe('braider');
    expect(bookingScope(admin('Salon Manager', ['appointments.view']))).toBeNull();
    expect(bookingScope({ ...ceo, specialistId: 'braider' })).toBeNull();
    expect(bookingScope(admin('Super Admin', [], { specialistId: 'braider' }))).toBeNull();
  });
});
