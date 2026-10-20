import { describe, expect, it } from 'vitest';
import { adminGate, adminLoginPath } from '@/lib/auth/admin-gate';

const SECRET = 'staff-k7x2m9';

describe('secret admin address', () => {
  it('does nothing when no secret is set (local development, tests)', () => {
    expect(adminGate('/admin/login', null, false)).toEqual({ kind: 'pass' });
    expect(adminLoginPath(undefined)).toBe('/admin/login');
  });

  it('serves the sign-in page and the admin app file at the secret address', () => {
    expect(adminGate('/staff-k7x2m9', SECRET, false)).toEqual({ kind: 'rewrite', to: '/admin/login' });
    expect(adminGate('/staff-k7x2m9/', SECRET, false)).toEqual({ kind: 'rewrite', to: '/admin/login' });
    expect(adminGate('/staff-k7x2m9/app.webmanifest', SECRET, false)).toEqual({
      kind: 'rewrite',
      to: '/admin.webmanifest',
    });
    expect(adminLoginPath(SECRET)).toBe('/staff-k7x2m9');
  });

  it('hides /admin from anyone not signed in, and the sign-in page from everyone', () => {
    for (const p of ['/admin', '/admin/', '/admin/dashboard', '/admin/orders/LXC-123456']) {
      expect(adminGate(p, SECRET, false)).toEqual({ kind: 'hide' });
    }
    expect(adminGate('/admin/login', SECRET, true)).toEqual({ kind: 'hide' });
    expect(adminGate('/admin.webmanifest', SECRET, true)).toEqual({ kind: 'hide' });
  });

  it('lets signed-in visitors through to /admin (the layout still checks they are staff)', () => {
    expect(adminGate('/admin/dashboard', SECRET, true)).toEqual({ kind: 'pass' });
  });

  it('leaves the shop alone, including look-alike paths', () => {
    for (const p of ['/', '/hairs', '/administrator', '/admin-tips', '/staff-k7x2m9x']) {
      expect(adminGate(p, SECRET, false)).toEqual({ kind: 'pass' });
    }
  });
});
